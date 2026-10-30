/**
 * Seed script — cria as 8 OrchestrationConfig no backend de produção via OData.
 * Usage: node scripts/seed-orchestrations.mjs
 * Requer: cf login + token válido (usa cf oauth-token)
 */

import { execSync } from 'child_process';

const BASE_URL = 'https://org-build-build-ziloback-srv.cfapps.us10-001.hana.ondemand.com/api/admin/OrchestrationConfig';

const token = execSync('cf oauth-token').toString().trim().replace('bearer ', '').replace('Bearer ', '');

const DEPLOYMENT_ID = 'd7a09bc4d6d523f7';

const personas = [
  {
    name: 'Zilo Base',
    description: 'Assistente corporativo geral para todos os colaboradores',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: 'bdaf7ee9-99e6-470e-9be4-c92389c3882a',
    model_id: 'gpt-6-luna',
    orchestrationCUPerCall: 0.0003,
    sortOrder: 10,
    isActive: true,
  },
  {
    name: 'Zilo Base Docs',
    description: 'Assistente com acesso à base de documentos corporativos da Zilor',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: 'f242a711-b8a8-40fd-815d-25585b7cdffe',
    model_id: 'gpt-6-luna',
    orchestrationCUPerCall: 0.0008,
    sortOrder: 20,
    isActive: true,
  },
  {
    name: 'Zilo Advanced Docs GPT',
    description: 'Análise avançada com GPT Sol, documentos e proteção de dados',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: 'afbed4d7-c0a3-4184-a060-6ffb78f0fb64',
    model_id: 'gpt-5.6-sol',
    orchestrationCUPerCall: 0.0013,
    sortOrder: 30,
    isActive: true,
  },
  {
    name: 'Zilo Advanced Docs Gemini',
    description: 'Análise avançada com Gemini Flash, documentos e proteção de dados',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: 'a4c6b07d-141d-49e9-8c24-52d411a184be',
    model_id: 'gemini-3.5-flash',
    orchestrationCUPerCall: 0.0013,
    sortOrder: 40,
    isActive: true,
  },
  {
    name: 'Zilo Executive Docs Claude',
    description: 'Assistente executivo com Claude Sonnet para gestores e diretores',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: '97bc4c98-5fdc-4bbf-bef1-f318adaadda0',
    model_id: 'anthropic--claude-4.6-sonnet',
    orchestrationCUPerCall: 0.0018,
    sortOrder: 50,
    isActive: true,
  },
  {
    name: 'Zilo Executive Docs Astra',
    description: 'Assistente executivo com GPT Astra para gestores e diretores',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: '8618310e-6d43-4493-95ff-434107d66367',
    model_id: 'gpt-6-astra',
    orchestrationCUPerCall: 0.0018,
    sortOrder: 60,
    isActive: true,
  },
  {
    name: 'Zilo Pesquisa Web',
    description: 'Pesquisa na internet com Perplexity Sonar Pro para informações de mercado',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: '509b4a06-0a65-44ec-b0b2-6aaecb552ffe',
    model_id: 'sonar-pro',
    orchestrationCUPerCall: 0.0018,
    sortOrder: 70,
    isActive: true,
  },
  {
    name: 'Zilo SAP Help',
    description: 'Assistente técnico SAP com acesso à documentação oficial SAP',
    deploymentId: DEPLOYMENT_ID,
    aicoreConfigId: '30576166-acfc-42e6-b23d-587163964e41',
    model_id: 'gpt-6-luna',
    orchestrationCUPerCall: 0.0008,
    sortOrder: 80,
    isActive: true,
  },
];

for (const p of personas) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(p),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✅ ${p.name} → id: ${data.id}`);
  } else {
    console.error(`❌ ${p.name} → ${res.status}: ${JSON.stringify(data)}`);
  }
}
