/**
 * Refreshes ModelCatalog CU prices from AI Core /v2/lm/models.
 * Called by AdminService.refreshModelPrices() and weekly job.
 *
 * /v2/lm/models returns per-model metadata including capacity unit rates.
 * We upsert into ModelCatalog — existing rows keep their isActive flag.
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('model-prices');

export async function refreshModelPrices(db) {
  const { executeRequest, getAiCoreDestination } = await import('@sap-ai-sdk/core');
  const destination = await getAiCoreDestination();

  log.info('Fetching model list from AI Core /v2/lm/models');

  let models;
  try {
    const res = await executeRequest(
      { url: '/v2/lm/models', resourceGroup: process.env.AICORE_RESOURCE_GROUP || 'default' },
      null,
      { method: 'GET' },
      destination
    );
    models = res.data?.resources ?? res.data ?? [];
  } catch (err) {
    log.error({ err: err.message }, 'Failed to fetch models from AI Core');
    throw err;
  }

  const { ModelCatalog } = db.entities('zilo');
  let updated = 0;

  for (const m of models) {
    const id = m.model_name ?? m.name;
    if (!id) continue;

    await UPSERT.into(ModelCatalog).entries({
      id,
      displayName:   m.display_name ?? id,
      provider:      _inferProvider(id),
      // capacity_unit fields — present when SAP exposes them, fallback to 0
      inputCUPer1k:  m.input_capacity_unit  ?? m.capacity_unit_input  ?? 0,
      outputCUPer1k: m.output_capacity_unit ?? m.capacity_unit_output ?? 0,
      contextWindow: m.context_length ?? m.context_window ?? null,
      updatedAt:     new Date().toISOString(),
    });
    updated++;
  }

  log.info({ updated }, 'ModelCatalog refreshed');
  return `Refreshed ${updated} models.`;
}

function _inferProvider(modelId) {
  if (modelId.startsWith('claude'))  return 'anthropic';
  if (modelId.startsWith('gemini'))  return 'google';
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
  if (modelId.startsWith('mistral')) return 'mistral';
  if (modelId.startsWith('meta')   || modelId.startsWith('llama')) return 'meta';
  return 'other';
}
