namespace zilo;

// ── Model Catalog ─────────────────────────────────────────────────────────────
// Populated once from /v2/lm/models + Discovery Center, refreshed weekly by job.
entity ModelCatalog {
  key id                : String(80);     // "claude-3-5-sonnet", "gemini-1.5-flash"
      displayName       : String(200);
      provider          : String(50);     // "anthropic" | "google" | "openai"
      inputCUPer1k      : Decimal(10,6);  // capacity units per 1k input tokens
      outputCUPer1k     : Decimal(10,6);  // capacity units per 1k output tokens
      contextWindow     : Integer;
      tier              : String(20) default 'standard'; // "standard" | "premium"
      isActive          : Boolean default true;
      updatedAt         : Timestamp;
}

// ── Orchestration Configurations ──────────────────────────────────────────────
// Each row = one "persona" available to users.
// deploymentId  → ML Ops deployment (1 shared across all personas)
// aicoreConfigId → Orchestration Configuration UUID from AI Launchpad Gen AI Hub
//                  Used as config_ref in the /completion request body — AI Core
//                  resolves modules (model, filters, grounding, masking) server-side.
entity OrchestrationConfig {
  key id                     : UUID;
      name                   : String(200);
      description            : String(1000);
      deploymentId           : String(100);   // AI Core ML Ops deployment ID (shared)
      aicoreConfigId         : String(100);   // Gen AI Hub Orchestration Config UUID (reference only)
      moduleConfigJson       : LargeString;   // JSON of modules block exported from AI Launchpad
      groundingEnabled       : Boolean default false; // true = pass grounding_input_variable_1 as placeholder
      model                  : Association to ModelCatalog; // for cost calculation only
      orchestrationCUPerCall : Decimal(10,6) default 0.0001;
      isActive               : Boolean default true;
      sortOrder              : Integer default 0;
      createdAt              : Timestamp;
      updatedAt              : Timestamp;
}

// ── Cost Policies ─────────────────────────────────────────────────────────────
entity CostPolicy {
  key id                   : UUID;
      name                 : String(200);  // "Política Estagiário", "Política Especialista"
      monthlyBudgetCU      : Integer; // max capacity units per month
      validFrom            : Date;
      validTo              : Date;         // null = sem expiração
      isActive             : Boolean default true;
      createdAt            : Timestamp;
      updatedAt            : Timestamp;
      allowedOrchestrations : Composition of many PolicyOrchestrations
                               on allowedOrchestrations.policy = $self;
}

// ── Policy ↔ Orchestration (M:N) ─────────────────────────────────────────────
entity PolicyOrchestrations {
  key policy        : Association to CostPolicy;
  key orchestration : Association to OrchestrationConfig;
}

// ── Job Roles ─────────────────────────────────────────────────────────────────
entity JobRole {
  key id          : UUID;
      name        : String(200);   // "Estagiário", "Analista", "Especialista"
      department  : String(200);
      directorate : String(200);
      policy      : Association to CostPolicy; // default policy for this role
      isActive    : Boolean default true;
      createdAt   : Timestamp;
      updatedAt   : Timestamp;
}

// ── User Profiles ─────────────────────────────────────────────────────────────
// userId = subject from XSUAA JWT. Populated on first login or by AD sync.
entity UserProfile {
  key userId      : String(255);  // XSUAA subject
      email       : String(255);
      displayName : String(200);
      role        : Association to JobRole;
      isActive    : Boolean default true;
      createdAt   : Timestamp;
      updatedAt   : Timestamp;
}

// ── Per-user policy overrides (temporary exceptions) ─────────────────────────
entity UserPolicyOverride {
  key id            : UUID;
      user          : Association to UserProfile;
      policy        : Association to CostPolicy;
      reason        : String(500);
      grantedBy     : String(255); // userId of admin who granted
      validFrom     : Date;
      validTo       : Date;        // null = indefinite
      isActive      : Boolean default true;
      createdAt     : Timestamp;
}

// ── Conversations ─────────────────────────────────────────────────────────────
entity Conversations {
  key id             : UUID;
      userId         : String(255);
      orchestration  : Association to OrchestrationConfig;
      title          : String(500);
      createdAt      : Timestamp;
      updatedAt      : Timestamp;
      messages       : Composition of many Messages on messages.conversation = $self;
}

entity Messages {
  key id           : UUID;
      conversation : Association to Conversations;
      seq          : Integer;
      role         : String(20);   // "user" | "assistant"
      content      : LargeString;
      createdAt    : Timestamp;
      ledgerEntry  : Association to TokenLedger;
}

// ── Token Ledger ──────────────────────────────────────────────────────────────
// One row per LLM response. Source of truth for cost control.
entity TokenLedger {
  key id             : UUID;
      userId         : String(255);
      conversation   : Association to Conversations;
      message        : Association to Messages;
      orchestration  : Association to OrchestrationConfig;
      model          : Association to ModelCatalog;
      inputTokens    : Integer default 0;
      outputTokens   : Integer default 0;
      cachedTokens   : Integer default 0;    // prompt cache hits (cheaper)
      llmCU          : Decimal(14,8);         // (input/1k*inputCUPer1k) + (output/1k*outputCUPer1k)
      orchCU         : Decimal(14,8);         // orchestrationCUPerCall snapshot
      totalCU        : Decimal(14,8);         // llmCU + orchCU
      timestamp      : Timestamp;
      // Monthly budget enforcement snapshot at call time
      budgetCU       : Integer;               // policy budget at time of call
      usedCUMonth    : Decimal(14,8);         // cumulative CU used in same calendar month before this call
}

// ── Monthly Budget Summary (materialized by job, read-only for dashboard) ─────
entity MonthlyUsageSummary {
  key id            : UUID;
      userId        : String(255);
      yearMonth     : String(7);   // "2026-10"
      totalCU       : Decimal(14,8);
      totalCalls    : Integer;
      budgetCU      : Integer;
      percentUsed   : Decimal(5,2);
      computedAt    : Timestamp;
}
