/**
 * Zilo — Express entry point.
 *
 * Mounts two custom Express routes on top of the CAP application:
 *
 *   POST /api/chat        — streaming chat via AI Core Orchestration
 *   GET  /health          — liveness probe
 *
 * Budget enforcement: before each LLM call, the remaining CU for the current
 * month is checked. If the user is over budget, the request is rejected (402).
 *
 * Token ledger: after each successful response (or at stream end), a
 * TokenLedger row is written with full usage breakdown and computed CU cost.
 */

import cds from '@sap/cds';
import express from 'express';
import { createOrchestrationClient } from './providers/aicore-orchestration.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('server');

cds.on('bootstrap', async (app) => {
  app.use(express.json({ limit: '4mb' }));

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Chat endpoint ───────────────────────────────────────────────────────────
  // Body: { conversationId, message, stream? }
  // Auth: XSUAA JWT via approuter — req.user is set by @sap/xssec middleware
  app.post('/api/chat', async (req, res) => {
    const db  = await cds.connect.to('db');
    const uid = req.user?.id ?? req.user?.attr?.userUuid;
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' });

    const { conversationId, message, stream = true } = req.body ?? {};
    if (!conversationId || !message?.trim()) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    const {
      Conversations, Messages, OrchestrationConfig, ModelCatalog,
      CostPolicy, PolicyOrchestrations, JobRole, UserProfile,
      UserPolicyOverride, TokenLedger,
    } = db.entities('zilo');

    try {
      // ── 1. Load conversation + verify ownership ─────────────────────────────
      const conv = await SELECT.one(Conversations)
        .where({ id: conversationId, userId: uid });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      // ── 2. Load orchestration config ─────────────────────────────────────────
      const orch = await SELECT.one(OrchestrationConfig)
        .where({ id: conv.orchestration_id, isActive: true });
      if (!orch) return res.status(400).json({ error: 'Orchestration config not found or inactive' });
      if (!orch.aicoreConfigId) return res.status(400).json({ error: 'Orchestration config missing aicoreConfigId' });

      const model = await SELECT.one(ModelCatalog).where({ id: orch.model_id });

      // ── 3. Budget enforcement ─────────────────────────────────────────────────
      const policy = await _resolvePolicy(db, uid);
      const budgetCU = Number(policy?.monthlyBudgetCU ?? 0);

      if (budgetCU > 0) {
        const usedCU = await _usedCUThisMonth(db, uid);
        if (usedCU >= budgetCU) {
          return res.status(402).json({
            error: 'Monthly AI budget exhausted',
            usedCU,
            budgetCU,
          });
        }
      }

      // ── 4. Load chat history ──────────────────────────────────────────────────
      const history = await SELECT.from(Messages)
        .where({ conversation_id: conversationId })
        .orderBy('seq asc');

      const messages = history.map(m => ({
        role:    m.role,
        content: _extractText(m.content),
      }));

      // ── 6. Create orchestration client ───────────────────────────────────────
      const client = await createOrchestrationClient(orch.deploymentId);

      // ── 7. Persist user message ───────────────────────────────────────────────
      const nextSeq = (history.at(-1)?.seq ?? 0) + 1;
      const userMsgId = cds.utils.uuid();
      await INSERT.into(Messages).entries({
        id:              userMsgId,
        conversation_id: conversationId,
        seq:             nextSeq,
        role:            'user',
        content:         JSON.stringify([{ type: 'text', text: message }]),
        createdAt:       new Date().toISOString(),
      });

      // ── 8. Call AI Core Orchestration ─────────────────────────────────────────
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15_000);

        let fullText = '';
        let usageData = null;

        try {
          const { data: streamData } = await client.complete({
            aicoreConfigId: orch.aicoreConfigId,
            messages,
            stream: true,
          });

          streamData.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const parsed = JSON.parse(raw);
                // Orchestration streaming: delta in final_result or direct choices
                const delta = parsed?.final_result?.choices?.[0]?.delta
                           ?? parsed?.choices?.[0]?.delta;
                if (delta?.content) {
                  fullText += delta.content;
                  res.write(`data: ${JSON.stringify({ type: 'delta', text: delta.content })}\n\n`);
                }
                // Usage arrives in final chunk
                const usage = parsed?.final_result?.usage ?? parsed?.usage;
                if (usage) usageData = usage;
              } catch { /* non-JSON SSE comment, skip */ }
            }
          });

          await new Promise((resolve, reject) => {
            streamData.on('end', resolve);
            streamData.on('error', reject);
          });

        } finally {
          clearInterval(heartbeat);
        }

        // ── 9. Persist assistant message + ledger entry ─────────────────────────
        const assistantMsgId = cds.utils.uuid();
        const ledgerId       = cds.utils.uuid();

        await INSERT.into(Messages).entries({
          id:              assistantMsgId,
          conversation_id: conversationId,
          seq:             nextSeq + 1,
          role:            'assistant',
          content:         JSON.stringify([{ type: 'text', text: fullText }]),
          createdAt:       new Date().toISOString(),
          ledgerEntry_id:  ledgerId,
        });

        const ledgerEntry = _buildLedgerEntry(ledgerId, uid, conversationId, assistantMsgId, orch, model, usageData, budgetCU);
        if (ledgerEntry) await INSERT.into(TokenLedger).entries(ledgerEntry);

        // Update conversation timestamp
        await UPDATE(Conversations, conversationId).with({ updatedAt: new Date().toISOString() });

        res.write(`data: ${JSON.stringify({ type: 'done', ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null })}\n\n`);
        res.end();

      } else {
        // ── Non-streaming path ──────────────────────────────────────────────────
        const { data } = await client.complete({
          aicoreConfigId: orch.aicoreConfigId,
          messages,
          stream: false,
        });

        const text    = data?.final_result?.choices?.[0]?.message?.content ?? '';
        const usageData = data?.final_result?.usage ?? null;

        const assistantMsgId = cds.utils.uuid();
        const ledgerId       = cds.utils.uuid();

        await INSERT.into(Messages).entries({
          id:              assistantMsgId,
          conversation_id: conversationId,
          seq:             nextSeq + 1,
          role:            'assistant',
          content:         JSON.stringify([{ type: 'text', text }]),
          createdAt:       new Date().toISOString(),
          ledgerEntry_id:  ledgerId,
        });

        const ledgerEntry = _buildLedgerEntry(ledgerId, uid, conversationId, assistantMsgId, orch, model, usageData, budgetCU);
        if (ledgerEntry) await INSERT.into(TokenLedger).entries(ledgerEntry);

        await UPDATE(Conversations, conversationId).with({ updatedAt: new Date().toISOString() });

        res.json({ text, ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null });
      }

    } catch (err) {
      log.error({ err: err.message, uid, conversationId }, 'chat error');
      const status = err.response?.status ?? 500;
      if (!res.headersSent) res.status(status).json({ error: err.message });
      else res.end();
    }
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _buildLedgerEntry(id, userId, convId, msgId, orch, model, usage, budgetCU) {
  if (!usage) return null;

  const inputTokens  = usage.prompt_tokens      ?? 0;
  const outputTokens = usage.completion_tokens  ?? 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;

  const inputRate  = Number(model?.inputCUPer1k  ?? 0);
  const outputRate = Number(model?.outputCUPer1k ?? 0);

  // Cached tokens are billed at ~10% of normal input rate (Anthropic prompt cache)
  const cachedRate  = inputRate * 0.1;
  const billableIn  = inputTokens - cachedTokens;

  const llmCU  = (billableIn / 1000 * inputRate) + (cachedTokens / 1000 * cachedRate) + (outputTokens / 1000 * outputRate);
  const orchCU = Number(orch.orchestrationCUPerCall ?? 0.0001);
  const totalCU = llmCU + orchCU;

  return {
    id,
    userId,
    conversation_id:  convId,
    message_id:       msgId,
    orchestration_id: orch.id,
    model_id:         orch.model_id,
    inputTokens,
    outputTokens,
    cachedTokens,
    llmCU,
    orchCU,
    totalCU,
    timestamp:        new Date().toISOString(),
    budgetCU,
    usedCUMonth:      0, // filled post-insert if needed for snapshot
  };
}

function _extractText(content) {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter(b => b.type === 'text').map(b => b.text).join('\n');
    }
    return String(parsed);
  } catch {
    return String(content);
  }
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
  const rows = await SELECT.from(TokenLedger)
    .columns('SUM(totalCU) as used')
    .where({ userId })
    .and(`timestamp LIKE '${yearMonth}%'`);
  return Number(rows[0]?.used ?? 0);
}
