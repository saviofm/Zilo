/**
 * Seed ModelCatalog from CSV.
 * Run as: cf run-task ziloback-srv "node seed-models.mjs" --name seed-models
 * Or locally: node scripts/seed-models.mjs
 */
import cds from '@sap/cds';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

async function parseCsv(filePath) {
  const rows = [];
  const rl = createInterface({ input: createReadStream(filePath) });
  let headers = null;
  for await (const line of rl) {
    const cols = line.split(',');
    if (!headers) { headers = cols; continue; }
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = cols[i]?.trim());
    rows.push(row);
  }
  return rows;
}

const db = await cds.connect.to('db');
const { ModelCatalog } = db.entities('zilo');

const csvPath = join(__dir, '../data/model-catalog-seed.csv');
const models = await parseCsv(csvPath);

let inserted = 0, updated = 0;
for (const m of models) {
  const existing = await SELECT.one(ModelCatalog).where({ id: m.id });
  const entry = {
    id:             m.id,
    displayName:    m.displayName,
    provider:       m.provider,
    inputCUPer1k:   parseFloat(m.inputCUPer1k),
    outputCUPer1k:  parseFloat(m.outputCUPer1k),
    contextWindow:  parseInt(m.contextWindow) || null,
    isActive:       m.isActive === 'true',
    updatedAt:      new Date().toISOString(),
  };
  if (existing) {
    await UPDATE(ModelCatalog, m.id).with(entry);
    updated++;
  } else {
    await INSERT.into(ModelCatalog).entries(entry);
    inserted++;
  }
  console.log(`${existing ? 'updated' : 'inserted'}: ${m.id}`);
}

console.log(`\nDone: ${inserted} inserted, ${updated} updated`);
process.exit(0);
