import cds from '@sap/cds';
import { refreshModelPrices } from './providers/model-prices.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('admin-service');

export default class AdminService extends cds.ApplicationService {

  async init() {
    const db = await cds.connect.to('db');
    const { ModelCatalog, OrchestrationConfig, MonthlyUsageSummary, TokenLedger } = db.entities('zilo');

    // Timestamps on create/update for all managed entities
    for (const entity of ['ModelCatalog', 'OrchestrationConfig', 'CostPolicy', 'JobRole', 'UserProfile', 'UserPolicyOverride']) {
      this.before('CREATE', entity, req => { req.data.createdAt = req.data.updatedAt = new Date().toISOString(); });
      this.before('UPDATE', entity, req => { req.data.updatedAt = new Date().toISOString(); });
    }

    // ── Action: refreshModelPrices ────────────────────────────────────────────

    this.on('refreshModelPrices', async req => {
      try {
        return await refreshModelPrices(db);
      } catch (err) {
        log.error({ err: err.message }, 'refreshModelPrices failed');
        return req.error(500, `Failed to refresh: ${err.message}`);
      }
    });

    // ── Action: recomputeSummary ──────────────────────────────────────────────

    this.on('recomputeSummary', async req => {
      const { yearMonth } = req.data;
      if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
        return req.error(400, 'yearMonth must be in format YYYY-MM');
      }

      // Aggregate from TokenLedger
      const rows = await SELECT.from(TokenLedger)
        .columns('userId', 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .where(`timestamp LIKE '${yearMonth}%'`)
        .groupBy('userId');

      let upserted = 0;
      for (const row of rows) {
        // Resolve budget from user's current policy
        const budget = await _resolveUserBudget(db, row.userId);
        const totalCU = Number(row.totalCU ?? 0);

        await UPSERT.into(MonthlyUsageSummary).entries({
          id:           cds.utils.uuid(),
          userId:       row.userId,
          yearMonth,
          totalCU,
          totalCalls:   Number(row.totalCalls ?? 0),
          budgetCU:     budget,
          percentUsed:  budget > 0 ? Math.round((totalCU / budget) * 10000) / 100 : 0,
          computedAt:   new Date().toISOString(),
        });
        upserted++;
      }

      log.info({ yearMonth, upserted }, 'Monthly summary recomputed');
      return `Recomputed ${upserted} user summaries for ${yearMonth}.`;
    });

    await super.init();
  }
}

async function _resolveUserBudget(db, userId) {
  const { UserProfile, JobRole, CostPolicy, UserPolicyOverride } = db.entities('zilo');
  const today = new Date().toISOString().slice(0, 10);

  const override = await SELECT.one(UserPolicyOverride)
    .where({ user_userId: userId, isActive: true })
    .and(`validFrom <= '${today}' AND (validTo IS NULL OR validTo >= '${today}')`);

  const policyId = override?.policy_id ?? (await (async () => {
    const profile = await SELECT.one(UserProfile).columns('role_id').where({ userId });
    if (!profile?.role_id) return null;
    const role = await SELECT.one(JobRole).columns('policy_id').where({ id: profile.role_id });
    return role?.policy_id ?? null;
  })());

  if (!policyId) return 0;
  const policy = await SELECT.one(CostPolicy).columns('monthlyBudgetCU').where({ id: policyId });
  return Number(policy?.monthlyBudgetCU ?? 0);
}
