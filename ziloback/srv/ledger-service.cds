using { zilo } from '../db/schema';

// ── LedgerService — /api/ledger ───────────────────────────────────────────────
// Read-only surface for regular users to see their own consumption.
// userId enforced server-side — users only see their own rows.
service LedgerService @(path: '/api/ledger') {

  // Exposed so OData navigation from TokenLedger works within this service
  @readonly entity OrchestrationConfig as projection on zilo.OrchestrationConfig
    { id, name, description, model, isActive };

  @readonly entity ModelCatalog as projection on zilo.ModelCatalog
    { id, displayName, provider };

  @readonly
  entity TokenLedger as projection on zilo.TokenLedger
    excluding { userId, budgetCU, usedCUMonth };

  @readonly
  entity MonthlyUsageSummary as projection on zilo.MonthlyUsageSummary
    excluding { userId };

  // Aggregated consumption by orchestration for the current user
  function myUsageByOrchestration(yearMonth : String(7)) returns array of {
    orchestrationName : String;
    totalCU           : Decimal;
    totalCalls        : Integer;
    percentOfBudget   : Decimal;
  };
}
