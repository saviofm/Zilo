import cds from '@sap/cds';
import { createLogger } from './utils/logger.js';

const log = createLogger('ledger-service');

export default class LedgerService extends cds.ApplicationService {

  async init() {
    const db = await cds.connect.to('db');
    const { TokenLedger, MonthlyUsageSummary, OrchestrationConfig } = db.entities('zilo');

    const _uid = (req) => req.user?.id ?? req.user?.attr?.userUuid ?? 'anonymous';

    // ── TokenLedger: users only see their own rows ────────────────────────────

    this.before('READ', 'TokenLedger', async req => {
      const uid = _uid(req);
      req.query.where({ userId: uid });
    });

    this.before('READ', 'MonthlyUsageSummary', async req => {
      const uid = _uid(req);
      req.query.where({ userId: uid });
    });

    // ── Function: myUsageByOrchestration ─────────────────────────────────────

    this.on('myUsageByOrchestration', async req => {
      const uid       = _uid(req);
      const yearMonth = req.data.yearMonth || new Date().toISOString().slice(0, 7);

      const rows = await SELECT.from(TokenLedger)
        .columns('orchestration_id', 'SUM(totalCU) as totalCU', 'COUNT(*) as totalCalls')
        .where({ userId: uid })
        .and(`timestamp LIKE '${yearMonth}%'`)
        .groupBy('orchestration_id');

      if (!rows.length) return [];

      // Resolve monthly budget for percent calc
      const summaryRow = await SELECT.one(MonthlyUsageSummary)
        .where({ userId: uid, yearMonth });
      const budgetCU = Number(summaryRow?.budgetCU ?? 0);

      const orchIds = rows.map(r => r.orchestration_id);
      const orchs   = await SELECT.from(OrchestrationConfig)
        .columns('id', 'name')
        .where({ id: { in: orchIds } });
      const nameMap = Object.fromEntries(orchs.map(o => [o.id, o.name]));

      return rows.map(r => {
        const totalCU = Number(r.totalCU ?? 0);
        return {
          orchestrationName: nameMap[r.orchestration_id] ?? r.orchestration_id,
          totalCU,
          totalCalls:       Number(r.totalCalls ?? 0),
          percentOfBudget:  budgetCU > 0 ? Math.round((totalCU / budgetCU) * 10000) / 100 : 0,
        };
      });
    });

    await super.init();
  }
}
