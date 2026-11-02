/**
 * Seed script — cria CostPolicies + PolicyOrchestrations no backend de produção.
 * Usage: node scripts/seed-policies.mjs
 * Requer: cf login + token válido (usa cf oauth-token)
 */

import { execSync } from 'child_process';

const BASE = 'https://org-build-build-ziloback-srv.cfapps.us10-001.hana.ondemand.com/api/admin';
const token = execSync('cf oauth-token').toString().trim().replace(/^[Bb]earer /, '');

const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(data)}`);
  return data;
}

// IDs das personas (cadastrados pelo seed-orchestrations.mjs)
const personas = await fetch(`${BASE}/OrchestrationConfig?$select=id,name&$orderby=sortOrder`, { headers })
  .then(r => r.json())
  .then(d => Object.fromEntries(d.value.map(o => [o.name, o.id])));

console.log('Personas encontradas:', Object.keys(personas).join(', '));

const policies = [
  {
    name: 'Básico',
    description: 'Acesso básico para colaboradores operacionais',
    monthlyBudgetCU: 50,
    validFrom: '2026-01-01',
    isActive: true,
    personas: ['Zilo Base', 'Zilo Base Docs'],
  },
  {
    name: 'Avançado',
    description: 'Acesso avançado para analistas e especialistas de negócio',
    monthlyBudgetCU: 200,
    validFrom: '2026-01-01',
    isActive: true,
    personas: ['Zilo Base', 'Zilo Base Docs', 'Zilo Advanced Docs GPT', 'Zilo Advanced Docs Gemini'],
  },
  {
    name: 'TI Analista',
    description: 'Acesso para analistas de TI com SAP Help e pesquisa web',
    monthlyBudgetCU: 200,
    validFrom: '2026-01-01',
    isActive: true,
    personas: ['Zilo Base', 'Zilo Base Docs', 'Zilo Advanced Docs GPT', 'Zilo SAP Help', 'Zilo Pesquisa Web'],
  },
  {
    name: 'TI Desenvolvedor',
    description: 'Acesso completo para desenvolvedores de TI, exceto personas executivas',
    monthlyBudgetCU: 500,
    validFrom: '2026-01-01',
    isActive: true,
    personas: ['Zilo Base', 'Zilo Base Docs', 'Zilo Advanced Docs GPT', 'Zilo Advanced Docs Gemini', 'Zilo SAP Help', 'Zilo Pesquisa Web'],
  },
  {
    name: 'Executivo',
    description: 'Acesso completo para gestores e diretores',
    monthlyBudgetCU: 500,
    validFrom: '2026-01-01',
    isActive: true,
    personas: [
      'Zilo Base', 'Zilo Base Docs',
      'Zilo Advanced Docs GPT', 'Zilo Advanced Docs Gemini',
      'Zilo Executive Docs Claude', 'Zilo Executive Docs Astra',
      'Zilo Pesquisa Web', 'Zilo SAP Help',
    ],
  },
];

for (const p of policies) {
  try {
    const policy = await post('/CostPolicy', {
      name: p.name,
      monthlyBudgetCU: p.monthlyBudgetCU,
      validFrom: p.validFrom,
      isActive: p.isActive,
    });
    console.log(`✅ Policy: ${p.name} → id: ${policy.id}`);

    for (const personaName of p.personas) {
      const orchId = personas[personaName];
      if (!orchId) { console.warn(`  ⚠️  Persona não encontrada: ${personaName}`); continue; }
      await post('/PolicyOrchestrations', { policy_id: policy.id, orchestration_id: orchId });
      console.log(`  ✅ Vinculou: ${personaName}`);
    }
  } catch (e) {
    console.error(`❌ ${p.name}: ${e.message}`);
  }
}
