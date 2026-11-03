using { zilo } from '../db/schema';

// ── LedgerService — /api/ledger ───────────────────────────────────────────────
// Read-only surface for regular users to see their own consumption.
// userId kept in projection so HANA view includes it for WHERE filtering.
// The before-READ handler ensures each user only sees their own rows.
service LedgerService @(path: '/api/ledger') {

  @readonly entity OrchestrationConfig as projection on zilo.OrchestrationConfig
    { id, name, description, model, isActive };

  @readonly entity ModelCatalog as projection on zilo.ModelCatalog
    { id, displayName, provider };

  @readonly
  entity TokenLedger as projection on zilo.TokenLedger
    excluding { budgetCU, usedCUMonth };

  @readonly
  entity MonthlyUsageSummary as projection on zilo.MonthlyUsageSummary;

  function myUsageByOrchestration(yearMonth : String(7)) returns array of {
    orchestrationName : String;
    totalCU           : Decimal;
    totalCalls        : Integer;
    percentOfBudget   : Decimal;
  };
}
