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
import { createOrchestrationClient, TOOL_LABELS } from './providers/aicore-orchestration.js';
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

    const { conversationId, message, orchestrationId, attachments = [], stream = true } = req.body ?? {};
    if (!conversationId || (!message?.trim() && attachments.length === 0)) {
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

      // Build current user message content — plain text or multimodal array with attachments
      const currentContent = attachments.length > 0
        ? [
            { type: 'text', text: message || 'Analise os arquivos anexados.' },
            ...attachments.map(a => {
              if (a.type === 'image') {
                // image_url with base64 data URL
                return { type: 'image_url', image_url: { url: a.dataUrl, detail: 'auto' } };
              }
              // Text content from document (PDF, Word, Excel, etc.)
              return { type: 'text', text: `[Arquivo: ${a.name}]\n${a.text}` };
            }),
          ]
        : message;

      const messages = [
        ...history.map(m => ({ role: m.role, content: _extractText(m.content) })),
        { role: 'user', content: currentContent },
      ];

      // ── 5. Create orchestration client ────────────────────────────────────────
      const client = await createOrchestrationClient(orch);

      // ── 6. Persist user message ───────────────────────────────────────────────
      // Store attachments as text blocks so they appear in history for future messages.
      // Images are stored as a reference (not base64) to avoid bloating the DB.
      const nextSeq = (history.at(-1)?.seq ?? 0) + 1;
      const persistedContent = attachments.length > 0
        ? [
            { type: 'text', text: message || 'Analise os arquivos anexados.' },
            ...attachments.map(a => a.type === 'image'
              ? { type: 'text', text: `[Imagem anexada: ${a.name}]` }
              : { type: 'text', text: `[Arquivo: ${a.name}]\n${a.text}` }
            ),
          ]
        : [{ type: 'text', text: message }];

      await INSERT.into(Messages).entries({
        id: cds.utils.uuid(), conversation_id: conversationId,
        seq: nextSeq, role: 'user',
        content: JSON.stringify(persistedContent),
        createdAt: new Date().toISOString(),
      });

      // ── 7. Start SSE response ─────────────────────────────────────────────────
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      const heartbeat = stream ? setInterval(() => res.write(': keep-alive\n\n'), 15_000) : null;

      // ── 8. Tool-use loop (max 10 iterations) ─────────────────────────────────
      // Each iteration may return tool_calls — we process them, emit SSE blocks,
      // and call AI Core again with tool_results until stop or max iterations.
      // Usage is accumulated across all iterations (Ledger option C).
      const MAX_TOOL_ITERATIONS = 10;
      let fullText = '';
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCachedTokens = 0;
      const pendingBlocks = []; // blocks collected from tool_calls
      const conversationMessages = [...messages]; // grows with tool turns

      try {
        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const iterClient = await createOrchestrationClient(orch);
          const iterMessages = iteration === 0 ? messages : conversationMessages;
          const result = await iterClient.complete({ messages: iterMessages, stream: iteration === 0 ? stream : false });

          log.info({ iteration, hasStreamResp: !!result.streamResp, hasData: !!result.data }, 'tool loop iteration');

          let iterText = '';
          let iterToolCalls = null;

          if (result.streamResp) {
            // Streaming (first iteration only)
            for await (const chunk of result.streamResp.stream) {
              const delta = chunk.getDeltaContent?.() ?? null;
              if (delta) {
                iterText += delta;
                res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
              }
            }
            const usage = result.streamResp.getTokenUsage?.() ?? null;
            if (usage) {
              totalInputTokens  += usage.prompt_tokens ?? 0;
              totalOutputTokens += usage.completion_tokens ?? 0;
              totalCachedTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
            }
            iterToolCalls = result.streamResp.getToolCalls?.() ?? null;
          } else {
            const resp = result.data;
            iterText = resp.getContent?.() ?? '';
            const usage = resp.getTokenUsage?.() ?? resp.getUsage?.() ?? null;
            if (usage) {
              totalInputTokens  += usage.prompt_tokens ?? 0;
              totalOutputTokens += usage.completion_tokens ?? 0;
              totalCachedTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
            }
            iterToolCalls = resp.getToolCalls?.() ?? null;
            if (iterText && stream) {
              res.write(`data: ${JSON.stringify({ type: 'delta', text: iterText })}\n\n`);
            }
          }

          if (iterText) fullText += iterText;

          // No tool_calls → model is done
          if (!iterToolCalls?.length) break;

          // Process tool_calls — emit step + block, build tool_results for next turn
          const toolResults = [];
          for (const tc of iterToolCalls) {
            const name = tc.function?.name ?? '';
            let args = {};
            try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function.arguments ?? {}); } catch { /* ignore */ }

            // Emit processing step label
            const label = TOOL_LABELS[name]?.(args) ?? `Executando ${name}...`;
            if (stream) res.write(`data: ${JSON.stringify({ type: 'step', label })}\n\n`);

            // Emit block for render tools
            const blockKind = {
              render_chart:  'chart',
              render_table:  'table',
              render_kpi:    'kpi',
              calculator:    'calculator',
              generate_file: 'attachment',
              render_code:   'code',
            }[name];

            if (blockKind) {
              if (blockKind === 'attachment') {
                const evt = { type: 'attachment', format: args.format ?? 'csv', filename: `${args.filename ?? 'dados'}.${args.format ?? 'csv'}`, data: args.data ?? '' };
                if (stream) res.write(`data: ${JSON.stringify(evt)}\n\n`);
                pendingBlocks.push(evt);
              } else {
                const evt = { type: 'block', kind: blockKind, data: args };
                if (stream) res.write(`data: ${JSON.stringify(evt)}\n\n`);
                pendingBlocks.push(evt);
              }
            }

            toolResults.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ ok: true, rendered: !!blockKind }),
            });
          }

          // Add assistant message (with tool_calls) + tool results to history
          // so next iteration has full context
          conversationMessages.push({ role: 'assistant', content: iterText || null, tool_calls: iterToolCalls });
          conversationMessages.push(...toolResults);
        }

        // Emit any text-based blocks from final response
        if (fullText && stream) {
          // CSV/JSON code blocks
          const blockRe = /```(csv|json|xlsx|tsv)(:[^\n]*)?\n([\s\S]*?)```/gi;
          let m;
          while ((m = blockRe.exec(fullText)) !== null) {
            const format   = m[1].toLowerCase();
            const filename = m[2] ? m[2].slice(1).trim() : `dados.${format}`;
            const data     = m[3].trim();
            if (data) res.write(`data: ${JSON.stringify({ type: 'attachment', format, filename, data })}\n\n`);
          }
          // Markdown tables
          const tableRe = /(\|.+\|\n\|[-: |]+\|\n(?:\|.+\|\n?)+)/g;
          let tm; let tIdx = 0;
          while ((tm = tableRe.exec(fullText)) !== null) {
            const rows = tm[1].trim().split('\n')
              .filter(r => !r.match(/^\|[-: |]+\|$/))
              .map(r => r.split('|').slice(1,-1).map(c => c.trim()).join(','));
            if (rows.length > 1) {
              tIdx++;
              res.write(`data: ${JSON.stringify({ type: 'attachment', format: 'csv', filename: `tabela${tIdx > 1 ? '_'+tIdx : ''}.xlsx`, data: rows.join('\n') })}\n\n`);
            }
          }
        }

      } finally {
        if (heartbeat) clearInterval(heartbeat);
      }

      // ── 9. Persist + close ────────────────────────────────────────────────────
      const assistantMsgId = cds.utils.uuid();
      const ledgerId = cds.utils.uuid();
      await INSERT.into(Messages).entries({
        id: assistantMsgId, conversation_id: conversationId,
        seq: nextSeq + 1, role: 'assistant',
        content: JSON.stringify([{ type: 'text', text: fullText }]),
        createdAt: new Date().toISOString(), ledgerEntry_id: ledgerId,
      });

      // Ledger option C: one entry with accumulated tokens across all loop iterations
      const accumulatedUsage = totalInputTokens > 0
        ? { prompt_tokens: totalInputTokens, completion_tokens: totalOutputTokens, prompt_tokens_details: { cached_tokens: totalCachedTokens } }
        : null;
      const ledgerEntry = _buildLedgerEntry(ledgerId, uid, conversationId, assistantMsgId, orch, model, accumulatedUsage, budgetCU);
      if (ledgerEntry) await INSERT.into(TokenLedger).entries(ledgerEntry);
      await UPDATE(Conversations, conversationId).with({ updatedAt: new Date().toISOString() });

      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'done', ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null })}\n\n`);
        res.end();
      } else {
        res.json({ text: fullText, ledger: ledgerEntry ? { totalCU: ledgerEntry.totalCU } : null });
      }

      // Fire-and-forget: keep MonthlyUsageSummary fresh after each chat
      _recomputeSummaryAsync(db, uid).catch(() => {});

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

async function _recomputeSummaryAsync(db, userId) {
  const { TokenLedger, MonthlyUsageSummary, UserProfile, JobRole, CostPolicy } = db.entities('zilo');
  const yearMonth = new Date().toISOString().slice(0, 7);
  const rows = await SELECT.from(TokenLedger)
    .columns('SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
    .where({ userId })
    .and(`timestamp LIKE '${yearMonth}%'`);
  const totalCU = Number(rows[0]?.totalCU ?? 0);
  const totalCalls = Number(rows[0]?.totalCalls ?? 0);
  const policy = await _resolvePolicy(db, userId);
  const budgetCU = Number(policy?.monthlyBudgetCU ?? 0);
  const percentUsed = budgetCU > 0 ? Math.round((totalCU / budgetCU) * 10000) / 100 : 0;
  await UPSERT.into(MonthlyUsageSummary).entries({
    id: cds.utils.uuid(), userId, yearMonth,
    totalCU, totalCalls, budgetCU, percentUsed,
    computedAt: new Date().toISOString(),
  });
}

async function _usedCUThisMonth(db, userId) {
  const { TokenLedger } = db.entities('zilo');
  const yearMonth = new Date().toISOString().slice(0, 7);
  const rows = await SELECT.from(TokenLedger).columns('SUM(totalCU) as used')
    .where({ userId }).and(`timestamp LIKE '${yearMonth}%'`);
  return Number(rows[0]?.used ?? 0);
}
