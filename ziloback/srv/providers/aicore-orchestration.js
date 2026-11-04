/**
 * SAP AI Core — Orchestration Service client via @sap-ai-sdk/orchestration.
 *
 * Tool definitions are injected via config_ref overrideConfig so they work
 * with all personas regardless of what's stored in AI Launchpad.
 * Grounding personas skip tools (they use placeholder-based templates).
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('aicore-orchestration');

const DEPLOYMENT_ID = 'd7a09bc4d6d523f7';

// ── Tool definitions ─────────────────────────────────────────────────────────
// These are Zilo solution tools — not model-specific, no token cost.

export const ZILO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'render_chart',
      description: 'Renderize um gráfico inline quando dados numéricos precisam ser comparados, tendências analisadas ou distribuições apresentadas. Prefira SEMPRE este método a tabelas Markdown para dados quantitativos.',
      parameters: {
        type: 'object',
        required: ['type', 'title', 'categories', 'series'],
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['line', 'bar', 'stacked-bar', 'pie'] },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' } },
          series: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'values'],
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                values: { type: 'array', items: { type: 'number' } },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_table',
      description: 'Renderize uma tabela de comparação inline. Use para comparar entidades, produtos ou opções em múltiplos atributos. Prefira este método a tabelas Markdown.',
      parameters: {
        type: 'object',
        required: ['title', 'columns', 'rows'],
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
          highlight_column: { type: 'integer', description: 'Índice da coluna a destacar (0-based)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_kpi',
      description: 'Renderize um card de KPI/indicador. Use para destacar métricas importantes com valor, variação e tendência.',
      parameters: {
        type: 'object',
        required: ['label', 'value'],
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          delta: { type: 'string', description: 'Variação, ex: "+12%" ou "-3 dias"' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'] },
          icon: { type: 'string', description: 'Nome do ícone Lucide, ex: "TrendingUp", "Package"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Realize um cálculo matemático e mostre o resultado formatado. Use para cálculos explícitos pedidos pelo usuário.',
      parameters: {
        type: 'object',
        required: ['expression', 'result'],
        additionalProperties: false,
        properties: {
          expression: { type: 'string', description: 'A expressão matemática, ex: "2.160 + 1.800 + 1.600"' },
          result: { type: 'string', description: 'O resultado formatado, ex: "R$ 5.560,00"' },
          description: { type: 'string', description: 'Explicação do que foi calculado' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_file',
      description: 'Gere um arquivo para download (Excel, CSV ou JSON). Use quando o usuário pedir dados em formato de arquivo.',
      parameters: {
        type: 'object',
        required: ['format', 'filename', 'data'],
        additionalProperties: false,
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
          filename: { type: 'string', description: 'Nome do arquivo sem extensão' },
          data: { type: 'string', description: 'Conteúdo: CSV com cabeçalho, JSON array de objetos' },
          sheet_name: { type: 'string', description: 'Nome da aba para Excel' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_code',
      description: 'Exiba um bloco de código com syntax highlighting. Use para mostrar código, scripts, queries SQL, comandos de terminal ou configurações.',
      parameters: {
        type: 'object',
        required: ['language', 'code'],
        additionalProperties: false,
        properties: {
          language: { type: 'string', description: 'ex: python, javascript, sql, bash, json, yaml' },
          code: { type: 'string' },
          title: { type: 'string', description: 'Título opcional do bloco de código' },
        },
      },
    },
  },
];

// Label shown in ProcessingCard for each tool call
export const TOOL_LABELS = {
  render_chart:  ({ title }) => `Criando gráfico: ${title || 'dados'}...`,
  render_table:  ({ title }) => `Montando tabela: ${title || 'comparação'}...`,
  render_kpi:    ({ label }) => `Calculando indicador: ${label || 'KPI'}...`,
  calculator:    ({ expression }) => `Calculando: ${expression || ''}...`,
  generate_file: ({ filename, format }) => `Gerando arquivo: ${filename || 'dados'}.${format || 'xlsx'}...`,
  render_code:   ({ language }) => `Preparando código ${language || ''}...`,
};

export async function createOrchestrationClient(orch) {
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
  const { getAiCoreDestination } = await import('@sap-ai-sdk/core');

  const destination = await getAiCoreDestination();
  const deploymentConfig = { deploymentId: DEPLOYMENT_ID, resourceGroup: 'default' };

  // config_ref with tools injected via overrideConfig (non-grounding personas only)
  // Grounding personas use placeholder templates — tools not compatible
  const config = orch.aicoreConfigId
    ? {
        id: orch.aicoreConfigId,
        ...(!orch.groundingEnabled && {
          overrideConfig: {
            modules: {
              prompt_templating: {
                prompt: { tools: ZILO_TOOLS },
              },
            },
          },
        }),
      }
    : orch.moduleConfigJson;

  if (!config) throw new Error(`OrchestrationConfig ${orch.id} has neither aicoreConfigId nor moduleConfigJson`);

  const client = new OrchestrationClient(config, deploymentConfig, destination);

  return {
    async complete({ messages = [], stream = false }) {
      // grounding_input_variable_1: only the user's actual prompt — NOT file content.
      // File content goes in messagesHistory. Passing large file text here exceeds AI Core limits.
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const rawContent = lastUser?.content ?? '';
      const lastUserMsg = Array.isArray(rawContent)
        ? (rawContent.find(b => b.type === 'text')?.text ?? '')   // first text block = user prompt only
        : String(rawContent);

      // For grounding profiles: flatten any array content to plain string (AI Core grounding
      // rejects array content in messagesHistory), and strip tool_use/tool_result turns.
      const flattenContent = (c) => Array.isArray(c)
        ? c.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : c;

      const safeMessages = orch.groundingEnabled
        ? messages
            .filter(m => {
              const c = m.content
              if (Array.isArray(c)) return !c.some(b => b.type === 'tool_use' || b.type === 'tool_result')
              return m.role !== 'tool'
            })
            .map(m => ({ ...m, content: flattenContent(m.content) }))
        : messages;

      const request = {
        ...(safeMessages.length ? { messagesHistory: safeMessages } : {}),
        ...(orch.groundingEnabled && { placeholderValues: { grounding_input_variable_1: lastUserMsg } }),
      };


      const hasRef = typeof config === 'object' && !('modules' in config) && 'id' in config;
      log.debug({ deploymentId: DEPLOYMENT_ID, hasConfigRef: hasRef, stream }, 'orchestration request');

      const attemptComplete = async (c, useStream) => {
        if (useStream) {
          const streamResp = await c.stream(request);
          return { streamResp };
        }
        const resp = await c.chatCompletion(request);
        return { data: resp };
      };

      const isStreamErr = (err) => {
        const detail = JSON.stringify(err?.response?.data ?? err?.cause?.response?.data ?? '');
        return detail.includes('Streaming is not supported') || (err?.message ?? '').includes('Streaming');
      };

      const tryComplete = async (c, useStream) => {
        try {
          return await attemptComplete(c, useStream);
        } catch (err) {
          if (useStream && isStreamErr(err)) {
            log.info('model does not support streaming — retrying without');
            return await attemptComplete(c, false);
          }
          throw err;
        }
      };

      try {
        return await tryComplete(client, stream);
      } catch (err) {
        const body = err.response?.data ?? err.cause?.response?.data ?? null;
        log.error({ status: err.response?.status ?? 500, hasConfigRef: hasRef, body, err: err.message }, 'orchestration failed');

        if (hasRef && orch.moduleConfigJson) {
          log.info('config_ref failed — retrying with inline moduleConfigJson');
          try {
            const fallbackClient = new OrchestrationClient(orch.moduleConfigJson, deploymentConfig, destination);
            // Inline JSON config: AI Core messages_history requires string content, not arrays.
            // Flatten any array content before sending.
            const flatMessages = (request.messagesHistory ?? []).map(m => ({
              ...m,
              content: Array.isArray(m.content)
                ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
                : m.content,
            }));
            const flatRequest = { ...request, messagesHistory: flatMessages };
const fallbackAttempt = async (c, useStream) => {
              if (useStream) return { streamResp: await c.stream(flatRequest) };
              return { data: await c.chatCompletion(flatRequest) };
            };
            return await fallbackAttempt(fallbackClient, false);
          } catch (err2) {
            const body2 = err2.response?.data ?? err2.cause?.response?.data ?? null;
            log.error({ status: err2.response?.status ?? 500, body: body2, err: err2.message }, 'inline fallback also failed');
            throw err2;
          }
        }
        throw err;
      }
    },
  };
}
