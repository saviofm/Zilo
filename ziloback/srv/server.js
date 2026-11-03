/**
 * Zilo — Express entry point.
 *
 * POST /api/chat  — streaming chat via SAP AI Core Orchestration
 * GET  /health    — liveness probe
 *
 * orchestrationId is resolved per-message from the request body,
 * allowing the user to freely switch personas within a conversation.
 * If not provided, falls back to the conversation's stored orchestration_id.
 */

import cds from '@sap/cds';
import express from 'express';
import { createOrchestrationClient } from './providers/aicore-orchestration.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('server');

cds.on('bootstrap', (app) => {
  app.use(express.json({ limit: '4mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
});

cds.on('served', () => {
  function _uidFromJwt(req) {
    try {
      const auth = req.headers?.authorization ?? '';
      if (!auth.startsWith('Bearer ') && !auth.startsWith('bearer ')) return null;
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      return payload.user_name ?? payload.email ?? payload.sub ?? null;
    } catch { return null; }
  }

  // ── Chat endpoint ─────────────────────────────────────────────────────────────
  // Body: { conversationId, message, orchestrationId?, stream? }
  // orchestrationId: optional override — lets user switch persona per message.
  cds.app.post('/api/chat', express.json({ limit: '4mb' }), async (req, res) => {
    const db = await cds.connect.to('db');

    const uid = _uidFromJwt(req);
    log.info({ uid }, 'chat auth');
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' });

    const { conversationId, message, orchestrationId, stream = true } = req.body ?? {};
    if (!conversationId || !message?.trim()) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    const {
      Conversations, Messages, OrchestrationConfig, ModelCatalog,
      CostPolicy, UserProfile, JobRole, UserPolicyOverride, TokenLedger,
    } = db.entities('zilo');

    try {
      // ── 1. Load conversation ──────────────────────────────────────────────────
      const conv = await SELECT.one(Conversations).where({ id: conversationId, userId: uid });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      // ── 2. Resolve orchestration — request override > conversation default ────
      const orchId = orchestrationId ?? conv.orchestration_id;
      if (!orchId) return res.status(400).json({ error: 'No orchestration configured' });

      const orch = await SELECT.one(OrchestrationConfig).where({ id: orchId, isActive: true });
      if (!orch) return res.status(400).json({ error: 'Orchestration config not found or inactive' });

      // Update conversation's orchestration if user switched persona
      if (orchestrationId && orchestrationId !== conv.orchestration_id) {
        await UPDATE(Conversations, conversationId).with({ orchestration_id: orchestrationId });
      }

      const model = await SELECT.one(ModelCatalog).where({ id: orch.model_id });

      // ── 3. Budget enforcement ─────────────────────────────────────────────────
      const policy = await _resolvePolicy(db, uid);
      const budgetCU = Number(policy?.monthlyBudgetCU ?? 0);
      if (budgetCU > 0) {
        const usedCU = await _usedCUThisMonth(db, uid);
        if (usedCU >= budgetCU) {
          return res.status(402).json({ error: 'Monthly AI budget exhausted', usedCU, budgetCU });
        }
      }

      // ── 4. Load chat history ──────────────────────────────────────────────────
      const history = await SELECT.from(Messages).where({ conversation_id: conversationId }).orderBy('seq asc');
      // Include current user message at the end — it hasn't been persisted yet
      const messages = [
        ...history.map(m => ({ role: m.role, content: _extractText(m.content) })),
        { role: 'user', content: message },
      ];

      // ── 5. Create orchestration client ────────────────────────────────────────
      const client = await createOrchestrationClient(orch);

      // ── 6. Persist user message ───────────────────────────────────────────────
      const nextSeq = (history.at(-1)?.seq ?? 0) + 1;
      await INSERT.into(Messages).entries({
        id: cds.utils.uuid(), conversation_id: conversationId,
        seq: nextSeq, role: 'user',
        content: JSON.stringify([{ type: 'text', text: message }]),
        createdAt: new Date().toISOString(),
      });

      // ── 7. Call AI Core ───────────────────────────────────────────────────────
      // The provider may downgrade to non-streaming if the model doesn't support it.
      // We detect this by checking whether the result has { stream } or { data }.
      const result = await client.complete({ messages, stream });

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      let fullText = '', usageData = null;

      if (result.streamResp) {
        // Streaming path — result.streamResp is OrchestrationStreamResponse
        // result.streamResp.stream is the async iterable of OrchestrationStreamChunkResponse
        const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15_000);
        try {
          for await (const chunk of result.streamResp.stream) {
            const delta = chunk.getDeltaContent?.() ?? null;
            if (delta) {
              fullText += delta;
              res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
            }
          }
          usageData = result.streamResp.getUsage?.() ?? null;
        } finally {
          clearInterval(heartbeat);
        }
      } else {
        // Non-streaming path (including forced fallback)
        const resp = result.data;
        fullText = resp.getContent?.() ?? resp.choices?.[0]?.message?.content ?? '';
        usageData = resp.getUsage?.() ?? resp.usage ?? null;

        if (stream) {
          // Client expected SSE — send the full text as a single delta
          res.write(`data: ${JSON.stringify({ type: 'delta', text: fullText })}\n\n`);
        }
      }

      // ── 8. Persist + close ────────────────────────────────────────────────────
      const assistantMsgId = cds.utils.uuid();
      const ledgerId = cds.utils.uuid();
      await INSERT.into(Messages).entries({
        id: assistantMsgId, conversation_id: conversationId,
        seq: nextSeq + 1, role: 'assistant',
        content: JSON.stringify([{ type: 'text', text: fullText }]),
        createdAt: new Date().toISOString(), ledgerEntry_id: ledgerId,
      });
      const ledgerEntry = _buildLedgerEntry(ledgerId, uid, conversationId, assistantMsgId, orch, model, usageData, budgetCU);
      if (ledgerEntry) await INSERT.into(TokenLedger).entries(ledgerEntry);
      await UPDATE(Conversations, conversationId).with({ updatedAt: new Date().toISOString() });

      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'done', ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null })}\n\n`);
        res.end();
      } else {
        res.json({ text: fullText, ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null });
      }

    } catch (err) {
      log.error({ err: err.message, uid, conversationId }, 'chat error');
      const status = err.response?.status ?? err.cause?.response?.status ?? 500;
      if (!res.headersSent) res.status(status).json({ error: err.message });
      else res.end();
    }
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _buildLedgerEntry(id, userId, convId, msgId, orch, model, usage, budgetCU) {
  if (!usage) return null;
  const inputTokens  = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const inputRate    = Number(model?.inputCUPer1k  ?? 0);
  const outputRate   = Number(model?.outputCUPer1k ?? 0);
  const cachedRate   = inputRate * 0.1;
  const billableIn   = inputTokens - cachedTokens;
  const llmCU   = (billableIn / 1000 * inputRate) + (cachedTokens / 1000 * cachedRate) + (outputTokens / 1000 * outputRate);
  const orchCU  = Number(orch.orchestrationCUPerCall ?? 0.0001);
  return {
    id, userId, conversation_id: convId, message_id: msgId,
    orchestration_id: orch.id, model_id: orch.model_id,
    inputTokens, outputTokens, cachedTokens, llmCU, orchCU,
    totalCU: llmCU + orchCU,
    timestamp: new Date().toISOString(), budgetCU, usedCUMonth: 0,
  };
}

function _extractText(content) {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return String(parsed);
  } catch { return String(content); }
}

async function _resolvePolicy(db, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { UserProfile, JobRole, CostPolicy, UserPolicyOverride } = db.entities('zilo');
  const override = await SELECT.one(UserPolicyOverride)
    .where({ user_userId: userId, isActive: true })
    .and(`validFrom <= '${today}' AND (validTo IS NULL OR validTo >= '${today}')`);
  const policyId = override?.policy_id ?? await (async () => {
    const profile = await SELECT.one(UserProfile).columns('role_id').where({ userId });
    if (!profile?.role_id) return null;
    const role = await SELECT.one(JobRole).columns('policy_id').where({ id: profile.role_id });
    return role?.policy_id ?? null;
  })();
  return policyId ? SELECT.one(CostPolicy).where({ id: policyId }) : null;
}

async function _usedCUThisMonth(db, userId) {
  const { TokenLedger } = db.entities('zilo');
  const yearMonth = new Date().toISOString().slice(0, 7);
  const rows = await SELECT.from(TokenLedger).columns('SUM(totalCU) as used')
    .where({ userId }).and(`timestamp LIKE '${yearMonth}%'`);
  return Number(rows[0]?.used ?? 0);
}
