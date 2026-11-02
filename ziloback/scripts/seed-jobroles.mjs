/**
 * Seed script — cria JobRoles no backend de produção via OData.
 * Usage: node scripts/seed-jobroles.mjs
 * Requer: cf login + token válido (usa cf oauth-token)
 */

import { execSync } from 'child_process';

const BASE = 'https://org-build-build-ziloback-srv.cfapps.us10-001.hana.ondemand.com/api/admin';
const token = execSync('cf oauth-token').toString().trim().replace(/^[Bb]earer /, '');
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// Busca policies pelo nome
const policies = await fetch(`${BASE}/CostPolicy?$select=id,name`, { headers })
  .then(r => r.json())
  .then(d => Object.fromEntries(d.value.map(p => [p.name, p.id])));

console.log('Políticas encontradas:', Object.keys(policies).join(', '));

const roles = [
  { name: 'Operador',        department: 'Operações',      directorate: 'Industrial',   policy: 'Básico' },
  { name: 'Analista',        department: 'Diversas',       directorate: 'Diversas',     policy: 'Avançado' },
  { name: 'Engenheiro',      department: 'Técnica',        directorate: 'Industrial',   policy: 'Avançado' },
  { name: 'Coordenador',     department: 'Diversas',       directorate: 'Diversas',     policy: 'Avançado' },
  { name: 'Analista TI',     department: 'TI',             directorate: 'Corporativo',  policy: 'TI Analista' },
  { name: 'Desenvolvedor TI',department: 'TI',             directorate: 'Corporativo',  policy: 'TI Desenvolvedor' },
  { name: 'Gerente',         department: 'Diversas',       directorate: 'Diversas',     policy: 'Avançado' },
  { name: 'Diretor',         department: 'Diretoria',      directorate: 'Diretoria',    policy: 'Executivo' },
];

for (const r of roles) {
  const policyId = policies[r.policy];
  if (!policyId) { console.warn(`⚠️  Política não encontrada: ${r.policy}`); continue; }

  const res = await fetch(`${BASE}/JobRole`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: r.name,
      department: r.department,
      directorate: r.directorate,
      policy_id: policyId,
      isActive: true,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✅ ${r.name} (${r.policy}) → id: ${data.id}`);
  } else {
    console.error(`❌ ${r.name}: ${res.status}: ${JSON.stringify(data)}`);
  }
}
