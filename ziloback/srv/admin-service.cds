using { zilo } from '../db/schema';

// ── AdminService — /api/admin ─────────────────────────────────────────────────
// Restricted to admin role. Full CRUD for all configuration entities.
// @requires: 'ZiloAdmin' -- temporarily disabled; IAS↔XSUAA token exchange trust not yet configured
@requires: 'authenticated-user'
service AdminService @(path: '/api/admin') {

  entity ModelCatalog       as projection on zilo.ModelCatalog;
  entity OrchestrationConfig as projection on zilo.OrchestrationConfig;
  entity CostPolicy         as projection on zilo.CostPolicy;
  entity PolicyOrchestrations as projection on zilo.PolicyOrchestrations;
  entity JobRole            as projection on zilo.JobRole;
  entity UserProfile        as projection on zilo.UserProfile;
  entity UserPolicyOverride as projection on zilo.UserPolicyOverride;

  // Read-only ledger for audit/reporting
  @readonly
  entity TokenLedger        as projection on zilo.TokenLedger;

  @readonly
  entity MonthlyUsageSummary as projection on zilo.MonthlyUsageSummary;

  // Trigger manual refresh of model CU prices from AI Core /v2/lm/models
  action refreshModelPrices() returns String;

  // Recompute MonthlyUsageSummary for a given yearMonth (e.g. "2026-10")
  action recomputeSummary(yearMonth : String(7)) returns String;
}
