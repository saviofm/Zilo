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

  // ── FinOps analytical functions ───────────────────────────────────────────

  // Monthly trend — all users combined (last N months or range)
  function usageByMonth(months : Integer) returns array of {
    yearMonth  : String;
    totalCU    : Decimal;
    totalCalls : Integer;
  };

  // Usage broken down by LLM model (for a given month, or all-time if null)
  function usageByModel(yearMonth : String(7)) returns array of {
    modelId    : String;
    modelName  : String;
    provider   : String;
    totalCU    : Decimal;
    totalCalls : Integer;
    sharePct   : Decimal;
  };

  // Usage broken down by JobRole / department / directorate
  function usageByJobRole(yearMonth : String(7)) returns array of {
    jobRoleId   : String;
    jobRoleName : String;
    department  : String;
    directorate : String;
    totalCU     : Decimal;
    totalCalls  : Integer;
    userCount   : Integer;
  };

  // Drill-down to individual users
  function usageByUser(yearMonth : String(7)) returns array of {
    userId      : String;
    displayName : String;
    email       : String;
    jobRoleName : String;
    department  : String;
    totalCU     : Decimal;
    totalCalls  : Integer;
    budgetCU    : Integer;
    percentUsed : Decimal;
  };
}
