using { zilo } from '../db/schema';

// ── ConversationService — /api/conversations ──────────────────────────────────
// End-user facing: chat history + message streaming trigger.
// userId injected server-side from JWT — never trusted from client.
service ConversationService @(path: '/api/conversations') {

  // Exposed so OData navigation from Conversations works within this service
  @readonly entity OrchestrationConfig as projection on zilo.OrchestrationConfig
    { id, name, description, model, isActive };

  entity Conversations as projection on zilo.Conversations
    excluding { userId }
    actions {
      action rename(title : String(500)) returns Conversations;
    };

  entity Messages as projection on zilo.Messages
    excluding { ledgerEntry };

  // Returns available orchestrations for the authenticated user
  // (filtered by their CostPolicy's allowedOrchestrations)
  function myOrchestrations() returns array of {
    id          : UUID;
    name        : String;
    description : String;
    modelName   : String;
    isDefault   : Boolean;
  };

  // Returns current month budget status for the authenticated user
  function myBudgetStatus() returns {
    budgetCU     : Decimal;
    usedCU       : Decimal;
    remainingCU  : Decimal;
    percentUsed  : Decimal;
    yearMonth    : String;
  };
}
