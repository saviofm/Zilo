/**
 * Fetches module config JSON from AI Launchpad for each persona
 * and patches OrchestrationConfig.moduleConfigJson in the CAP backend.
 *
 * Usage: node scripts/seed-module-configs.mjs
 * Requires: cf login
 */

import { execSync } from 'child_process';

const CF_TOKEN = execSync('cf oauth-token').toString().trim().replace(/^[Bb]earer /, '');
const CAP_BASE = 'https://org-build-build-ziloback-srv.cfapps.us10-001.hana.ondemand.com/api/admin';
const AI_BASE  = 'https://api.ai.prod.us-east-1.aws.ai-prod.cloud.sap';
const RG       = 'default';

const capHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_TOKEN}` };

// Fetch all OrchestrationConfigs from CAP
const configs = await fetch(`${CAP_BASE}/OrchestrationConfig?$select=id,name,aicoreConfigId`, { headers: capHeaders })
  .then(r => r.json()).then(d => d.value ?? []);

console.log(`Found ${configs.length} personas in CAP\n`);

for (const cfg of configs) {
  if (!cfg.aicoreConfigId) { console.warn(`⚠️  ${cfg.name}: no aicoreConfigId, skip`); continue; }

  // Fetch from AI Launchpad Prompt Registry
  const aiRes = await fetch(
    `${AI_BASE}/v2/registry/v2/orchestrationConfigs/${cfg.aicoreConfigId}`,
    { headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'AI-Resource-Group': RG } }
  );

  if (!aiRes.ok) {
    const txt = await aiRes.text();
    console.error(`❌ ${cfg.name}: AI Launchpad ${aiRes.status} — ${txt.slice(0, 120)}`);
    continue;
  }

  const aiData = await aiRes.json();
  // The spec.modules block is what we store as moduleConfigJson
  const modules = aiData.spec?.modules;
  if (!modules) { console.warn(`⚠️  ${cfg.name}: no spec.modules in response`); continue; }

  // PATCH the CAP entity
  const patchRes = await fetch(`${CAP_BASE}/OrchestrationConfig(${cfg.id})`, {
    method: 'PATCH',
    headers: capHeaders,
    body: JSON.stringify({ moduleConfigJson: JSON.stringify(modules) }),
  });

  if (patchRes.ok || patchRes.status === 204) {
    console.log(`✅ ${cfg.name}`);
  } else {
    const err = await patchRes.text();
    console.error(`❌ ${cfg.name}: PATCH ${patchRes.status} — ${err.slice(0, 120)}`);
  }
}
