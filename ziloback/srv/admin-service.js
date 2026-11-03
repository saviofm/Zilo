import cds from '@sap/cds';
import { refreshModelPrices } from './providers/model-prices.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('admin-service');

export default class AdminService extends cds.ApplicationService {

  async init() {
    const db = await cds.connect.to('db');
    const { ModelCatalog, OrchestrationConfig, MonthlyUsageSummary, TokenLedger,
            JobRole, UserProfile, CostPolicy } = db.entities('zilo');

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

    // ── FinOps: usageByMonth ──────────────────────────────────────────────────

    this.on('usageByMonth', async req => {
      const months = Math.min(Number(req.data.months ?? 12), 24);
      const rows = await SELECT.from(TokenLedger)
        .columns(`SUBSTRING(timestamp, 1, 7) as yearMonth`, 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .groupBy(`SUBSTRING(timestamp, 1, 7)`)
        .orderBy(`yearMonth desc`)
        .limit(months);
      return rows.map(r => ({
        yearMonth:  r.yearMonth,
        totalCU:    Number(r.totalCU ?? 0),
        totalCalls: Number(r.totalCalls ?? 0),
      })).reverse();
    });

    // ── FinOps: usageByModel ──────────────────────────────────────────────────

    this.on('usageByModel', async req => {
      const { yearMonth } = req.data;
      const whereClause = yearMonth ? `timestamp LIKE '${yearMonth}%'` : '1=1';
      const rows = await SELECT.from(TokenLedger)
        .columns('model_id', 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .where(whereClause)
        .groupBy('model_id');

      const totalCU = rows.reduce((s, r) => s + Number(r.totalCU ?? 0), 0);
      if (!rows.length) return [];

      const modelIds = rows.map(r => r.model_id).filter(Boolean);
      const models = modelIds.length
        ? await SELECT.from(ModelCatalog).columns('id', 'displayName', 'provider').where({ id: { in: modelIds } })
        : [];
      const modelMap = Object.fromEntries(models.map(m => [m.id, m]));

      return rows.map(r => {
        const cu = Number(r.totalCU ?? 0);
        const m  = modelMap[r.model_id] ?? {};
        return {
          modelId:    r.model_id ?? '—',
          modelName:  m.displayName ?? r.model_id ?? '—',
          provider:   m.provider ?? '—',
          totalCU:    cu,
          totalCalls: Number(r.totalCalls ?? 0),
          sharePct:   totalCU > 0 ? Math.round((cu / totalCU) * 10000) / 100 : 0,
        };
      }).sort((a, b) => b.totalCU - a.totalCU);
    });

    // ── FinOps: usageByJobRole ────────────────────────────────────────────────

    this.on('usageByJobRole', async req => {
      const { yearMonth } = req.data;
      const whereClause = yearMonth ? `timestamp LIKE '${yearMonth}%'` : '1=1';

      const rows = await SELECT.from(TokenLedger)
        .columns('userId', 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .where(whereClause)
        .groupBy('userId');

      if (!rows.length) return [];

      const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
      const profiles = await SELECT.from(UserProfile)
        .columns('userId', 'role_id')
        .where({ userId: { in: userIds } });
      const roleIds = [...new Set(profiles.map(p => p.role_id).filter(Boolean))];
      const roles   = roleIds.length
        ? await SELECT.from(JobRole).columns('id', 'name', 'department', 'directorate').where({ id: { in: roleIds } })
        : [];

      const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p.role_id]));
      const roleMap    = Object.fromEntries(roles.map(r => [r.id, r]));

      const byRole = {};
      for (const row of rows) {
        const roleId = profileMap[row.userId];
        if (!roleId) continue;
        if (!byRole[roleId]) {
          const role = roleMap[roleId] ?? {};
          byRole[roleId] = { jobRoleId: roleId, jobRoleName: role.name ?? '—', department: role.department ?? '—', directorate: role.directorate ?? '—', totalCU: 0, totalCalls: 0, userCount: 0 };
        }
        byRole[roleId].totalCU    += Number(row.totalCU ?? 0);
        byRole[roleId].totalCalls += Number(row.totalCalls ?? 0);
        byRole[roleId].userCount  += 1;
      }

      return Object.values(byRole).sort((a, b) => b.totalCU - a.totalCU);
    });

    // ── FinOps: usageByUser ───────────────────────────────────────────────────

    this.on('usageByUser', async req => {
      const { yearMonth } = req.data;
      const whereClause = yearMonth ? `timestamp LIKE '${yearMonth}%'` : '1=1';

      const rows = await SELECT.from(TokenLedger)
        .columns('userId', 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .where(whereClause)
        .groupBy('userId');

      if (!rows.length) return [];

      const userIds = rows.map(r => r.userId).filter(Boolean);
      const profiles = await SELECT.from(UserProfile)
        .columns('userId', 'displayName', 'email', 'role_id')
        .where({ userId: { in: userIds } });

      const roleIds = [...new Set(profiles.map(p => p.role_id).filter(Boolean))];
      const roles   = roleIds.length
        ? await SELECT.from(JobRole).columns('id', 'name', 'department', 'policy_id').where({ id: { in: roleIds } })
        : [];
      const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));

      const policyIds = [...new Set(roles.map(r => r.policy_id).filter(Boolean))];
      const policies  = policyIds.length
        ? await SELECT.from(CostPolicy).columns('id', 'monthlyBudgetCU').where({ id: { in: policyIds } })
        : [];
      const policyMap = Object.fromEntries(policies.map(p => [p.id, p]));

      const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

      return rows.map(row => {
        const profile  = profileMap[row.userId] ?? {};
        const role     = roleMap[profile.role_id] ?? {};
        const policy   = policyMap[role.policy_id] ?? {};
        const totalCU  = Number(row.totalCU ?? 0);
        const budgetCU = Number(policy.monthlyBudgetCU ?? 0);
        return {
          userId:      row.userId,
          displayName: profile.displayName ?? row.userId,
          email:       profile.email ?? '—',
          jobRoleName: role.name ?? '—',
          department:  role.department ?? '—',
          totalCU,
          totalCalls:  Number(row.totalCalls ?? 0),
          budgetCU,
          percentUsed: budgetCU > 0 ? Math.round((totalCU / budgetCU) * 10000) / 100 : 0,
        };
      }).sort((a, b) => b.totalCU - a.totalCU);
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
