using AdminService from '../srv/admin-service';

// ── OrchestrationConfig ───────────────────────────────────────────────────────
annotate AdminService.OrchestrationConfig with @(
  UI.LineItem: [
    { Value: name },
    { Value: model_id,               Label: 'Model' },
    { Value: aicoreConfigId,         Label: 'AI Launchpad Config ID' },
    { Value: orchestrationCUPerCall, Label: 'CU/Call' },
    { Value: sortOrder,              Label: 'Ordem' },
    { Value: isActive }
  ],
  UI.HeaderInfo: {
    TypeName:       'Orchestration',
    TypeNamePlural: 'Orchestrations',
    Title:          { Value: name },
    Description:    { Value: description }
  },
  UI.FieldGroup #General: {
    Label: 'Geral',
    Data: [
      { Value: name },
      { Value: description },
      { Value: deploymentId,           Label: 'AI Core Deployment ID (ML Ops)' },
      { Value: aicoreConfigId,         Label: 'Orchestration Config ID (AI Launchpad)' },
      { Value: model_id,               Label: 'Model (para cálculo de custo)' },
      { Value: orchestrationCUPerCall, Label: 'CU por chamada' },
      { Value: sortOrder,              Label: 'Ordem de exibição' },
      { Value: isActive,               Label: 'Ativo' }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Geral', Target: '@UI.FieldGroup#General' }
  ]
);

// ── CostPolicy ────────────────────────────────────────────────────────────────
annotate AdminService.CostPolicy with @(
  UI.LineItem: [
    { Value: name },
    { Value: monthlyBudgetCU, Label: 'Budget Mensal (CU)' },
    { Value: validFrom,       Label: 'Válido De' },
    { Value: validTo,         Label: 'Válido Até' },
    { Value: isActive,        Label: 'Ativo' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Política de Custo',
    TypeNamePlural: 'Políticas de Custo',
    Title:          { Value: name }
  },
  UI.FieldGroup #General: {
    Label: 'Geral',
    Data: [
      { Value: name },
      { Value: monthlyBudgetCU, Label: 'Budget Mensal (CU)' },
      { Value: validFrom,       Label: 'Válido De' },
      { Value: validTo,         Label: 'Válido Até' },
      { Value: isActive,        Label: 'Ativo' }
    ]
  },
  // Section listing which orchestrations are allowed for this policy
  UI.LineItem #AllowedOrchestrations: [
    { Value: orchestration.name,        Label: 'Orquestração' },
    { Value: orchestration.model_id,    Label: 'Model' },
    { Value: orchestration.isActive,    Label: 'Ativa' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Geral', Target: '@UI.FieldGroup#General' },
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Orquestrações Liberadas',
      Target: 'allowedOrchestrations/@UI.LineItem#AllowedOrchestrations'
    }
  ]
);

annotate AdminService.PolicyOrchestrations with @(
  UI.HeaderInfo: {
    TypeName:       'Orquestração',
    TypeNamePlural: 'Orquestrações',
    Title:          { Value: orchestration.name }
  }
);

// ── JobRole ───────────────────────────────────────────────────────────────────
annotate AdminService.JobRole with @(
  UI.LineItem: [
    { Value: name },
    { Value: department,   Label: 'Departamento' },
    { Value: directorate,  Label: 'Diretoria' },
    { Value: policy.name,  Label: 'Política Padrão' },
    { Value: isActive,     Label: 'Ativo' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Cargo',
    TypeNamePlural: 'Cargos',
    Title:          { Value: name },
    Description:    { Value: department }
  },
  UI.FieldGroup #General: {
    Label: 'Geral',
    Data: [
      { Value: name },
      { Value: department,  Label: 'Departamento' },
      { Value: directorate, Label: 'Diretoria' },
      { Value: policy_id,   Label: 'Política Padrão' },
      { Value: isActive,    Label: 'Ativo' }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Geral', Target: '@UI.FieldGroup#General' }
  ]
);

// ── UserProfile ───────────────────────────────────────────────────────────────
annotate AdminService.UserProfile with @(
  UI.LineItem: [
    { Value: displayName },
    { Value: email },
    { Value: role.name,  Label: 'Cargo' },
    { Value: isActive,   Label: 'Ativo' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Usuário',
    TypeNamePlural: 'Usuários',
    Title:          { Value: displayName },
    Description:    { Value: email }
  },
  UI.FieldGroup #General: {
    Label: 'Dados do Usuário',
    Data: [
      { Value: userId,      Label: 'User ID (XSUAA)' },
      { Value: displayName, Label: 'Nome' },
      { Value: email,       Label: 'E-mail' },
      { Value: role_id,     Label: 'Cargo' },
      { Value: isActive,    Label: 'Ativo' }
    ]
  },
  // Section for individual policy overrides
  UI.LineItem #Overrides: [
    { Value: policy.name,  Label: 'Política' },
    { Value: reason,       Label: 'Motivo' },
    { Value: grantedBy,    Label: 'Concedido por' },
    { Value: validFrom,    Label: 'Válido De' },
    { Value: validTo,      Label: 'Válido Até' },
    { Value: isActive,     Label: 'Ativo' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Dados do Usuário', Target: '@UI.FieldGroup#General' },
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Exceções de Política',
      Target: 'Overrides/@UI.LineItem#Overrides'
    }
  ]
);

// Navigation name must match the composition name in schema.cds
// UserPolicyOverride doesn't use a nav path here — it's projected directly
annotate AdminService.UserPolicyOverride with @(
  UI.HeaderInfo: {
    TypeName:       'Exceção de Política',
    TypeNamePlural: 'Exceções de Política',
    Title:          { Value: policy.name }
  }
);

// ── TokenLedger (read-only) ───────────────────────────────────────────────────
annotate AdminService.TokenLedger with @(
  UI.LineItem: [
    { Value: timestamp,            Label: 'Data/Hora' },
    { Value: userId,               Label: 'Usuário' },
    { Value: orchestration.name,   Label: 'Orquestração' },
    { Value: model_id,             Label: 'Model' },
    { Value: inputTokens,          Label: 'Tokens Input' },
    { Value: outputTokens,         Label: 'Tokens Output' },
    { Value: cachedTokens,         Label: 'Tokens Cache' },
    { Value: llmCU,                Label: 'CU LLM' },
    { Value: orchCU,               Label: 'CU Orq.' },
    { Value: totalCU,              Label: 'CU Total' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Entrada do Ledger',
    TypeNamePlural: 'Entradas do Ledger',
    Title:          { Value: timestamp }
  },
  UI.FieldGroup #Detail: {
    Label: 'Detalhes',
    Data: [
      { Value: userId },
      { Value: orchestration.name },
      { Value: model_id },
      { Value: inputTokens },
      { Value: outputTokens },
      { Value: cachedTokens },
      { Value: llmCU },
      { Value: orchCU },
      { Value: totalCU },
      { Value: budgetCU },
      { Value: usedCUMonth }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Detalhes', Target: '@UI.FieldGroup#Detail' }
  ]
);

// ── ModelCatalog ──────────────────────────────────────────────────────────────
annotate AdminService.ModelCatalog with @(
  UI.LineItem: [
    { Value: id },
    { Value: displayName,    Label: 'Nome' },
    { Value: provider,       Label: 'Fornecedor' },
    { Value: inputCUPer1k,   Label: 'CU Input/1k' },
    { Value: outputCUPer1k,  Label: 'CU Output/1k' },
    { Value: tier,           Label: 'Tier' },
    { Value: isActive,       Label: 'Ativo' },
    { Value: updatedAt,      Label: 'Atualizado em' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Modelo',
    TypeNamePlural: 'Modelos',
    Title:          { Value: displayName },
    Description:    { Value: provider }
  },
  UI.FieldGroup #General: {
    Label: 'Geral',
    Data: [
      { Value: id },
      { Value: displayName },
      { Value: provider },
      { Value: inputCUPer1k,   Label: 'CU por 1k tokens input' },
      { Value: outputCUPer1k,  Label: 'CU por 1k tokens output' },
      { Value: contextWindow,  Label: 'Context Window' },
      { Value: tier },
      { Value: isActive },
      { Value: updatedAt }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Geral', Target: '@UI.FieldGroup#General' }
  ]
);

// ── MonthlyUsageSummary (read-only) ───────────────────────────────────────────
annotate AdminService.MonthlyUsageSummary with @(
  UI.LineItem: [
    { Value: yearMonth,   Label: 'Mês' },
    { Value: userId,      Label: 'Usuário' },
    { Value: totalCU,     Label: 'CU Total' },
    { Value: totalCalls,  Label: 'Chamadas' },
    { Value: budgetCU,    Label: 'Budget (CU)' },
    { Value: percentUsed, Label: '% Utilizado' },
    { Value: computedAt,  Label: 'Calculado em' }
  ],
  UI.HeaderInfo: {
    TypeName:       'Resumo Mensal',
    TypeNamePlural: 'Resumos Mensais',
    Title:          { Value: yearMonth }
  }
);
