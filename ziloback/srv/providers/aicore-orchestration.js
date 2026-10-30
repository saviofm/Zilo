/**
 * SAP AI Core — Orchestration Service client.
 *
 * Calls /v2/inference/deployments/{deploymentId}/completion.
 * Uses config_ref to reference an Orchestration Configuration by UUID — AI Core
 * resolves all modules (model, filters, grounding, masking) server-side.
 * No module JSON is stored or built in the CAP backend.
 *
 * Response: { request_id, final_result: { id, model, choices, usage } }
 * usage: { prompt_tokens, completion_tokens, total_tokens, prompt_tokens_details }
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('aicore-orchestration');

export async function createOrchestrationClient(deploymentId, resourceGroup = 'default') {
  if (!deploymentId) throw new Error('deploymentId is required for orchestration client');

  const { executeRequest, getAiCoreDestination } = await import('@sap-ai-sdk/core');
  const destination = await getAiCoreDestination();

  return {
    /**
     * Send a chat completion through the orchestration pipeline.
     *
     * @param {object} opts
     * @param {string} opts.aicoreConfigId   - Orchestration Config UUID from AI Launchpad
     * @param {object[]} opts.messages       - Chat history [{role, content}]
     * @param {object}  opts.inputParams     - Template placeholder values (e.g. { input })
     * @param {boolean} opts.stream          - Enable SSE streaming
     */
    async complete({ aicoreConfigId, messages = [], inputParams = {}, stream = false }) {
      if (!aicoreConfigId) throw new Error('aicoreConfigId is required');

      const payload = {
        config_ref: { id: aicoreConfigId },
        messages_history: messages,
        ...(Object.keys(inputParams).length ? { placeholder_values: inputParams } : {}),
      };

      const basePath = `/v2/inference/deployments/${deploymentId}`;
      const targetPath = stream
        ? `${basePath}/completion-with-response-stream`
        : `${basePath}/completion`;

      log.debug({ deploymentId, aicoreConfigId, stream }, 'orchestration request');

      try {
        const httpResponse = await executeRequest(
          { url: targetPath, resourceGroup },
          payload,
          { timeout: 0, ...(stream ? { responseType: 'stream' } : {}) },
          destination
        );
        return { status: 200, data: httpResponse.data };
      } catch (err) {
        const status = err.response?.status ?? err.cause?.response?.status ?? 500;
        const data   = err.response?.data   ?? err.cause?.response?.data   ?? { error: { message: err.message } };
        log.error({ status, deploymentId, aicoreConfigId, err: err.message }, 'orchestration request failed');
        const apiErr = new Error(err.message);
        apiErr.response = { status, data };
        throw apiErr;
      }
    },
  };
}
