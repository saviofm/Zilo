/**
 * SAP AI Core — Orchestration Service client via @sap-ai-sdk/orchestration.
 *
 * Uses OrchestrationClient which supports:
 *   - config_ref: { id }  → references a stored Orchestration Config by UUID (preferred)
 *   - JSON string         → inline module_configurations from moduleConfigJson (fallback)
 *
 * The OrchestrationClient uses the correct path:
 *   POST /inference/deployments/{id}/v2/completion
 * which differs from the raw /v2/inference/deployments/{id}/completion path
 * that the @sap-ai-sdk/core executeRequest used (causing 404s before).
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('aicore-orchestration');

const DEPLOYMENT_ID = 'd7a09bc4d6d523f7';

export async function createOrchestrationClient(orch) {
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
  const { getAiCoreDestination } = await import('@sap-ai-sdk/core');

  const destination = await getAiCoreDestination();
  const deploymentConfig = { deploymentId: DEPLOYMENT_ID, resourceGroup: 'default' };

  // Prefer config_ref, fall back to inline JSON
  const config = orch.aicoreConfigId
    ? { id: orch.aicoreConfigId }
    : orch.moduleConfigJson;

  if (!config) throw new Error(`OrchestrationConfig ${orch.id} has neither aicoreConfigId nor moduleConfigJson`);

  const client = new OrchestrationClient(config, deploymentConfig, destination);

  return {
    async complete({ messages = [], stream = false }) {
      const request = messages.length ? { messagesHistory: messages } : {};
      const hasRef = typeof config === 'object' && 'id' in config;
      log.debug({ deploymentId: DEPLOYMENT_ID, hasConfigRef: hasRef, stream }, 'orchestration request');

      const attemptComplete = async (c, useStream) => {
        if (useStream) {
          // client.stream() returns OrchestrationStreamResponse.
          // The iterable chunks are in .stream property.
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

      // Helper: try with given config, auto-downgrade to non-streaming on stream errors
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

        // config_ref failed — retry with inline moduleConfigJson
        if (hasRef && orch.moduleConfigJson) {
          log.info('config_ref failed — retrying with inline moduleConfigJson');
          try {
            const fallbackClient = new OrchestrationClient(orch.moduleConfigJson, deploymentConfig, destination);
            return await tryComplete(fallbackClient, stream);
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
