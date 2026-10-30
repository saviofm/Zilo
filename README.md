# Zilo — Assistente Corporativo de IA da Zilor

Assistente de IA corporativo para colaboradores da **Zilor** (setor sucroenergético, 4 usinas em SP), desenvolvido sobre SAP BTP com CAP, SAP AI Core Orchestration e React.

Proposta do RFP: **Caso 1** (chat corporativo com budget control) + **Caso 3** (RAG sobre base documental SDM).

---

## Estrutura do repositório

```
Zilo/
├── ziloback/          # Backend CAP + apps admin Fiori Elements (MTA próprio)
│   ├── db/            # Schema CDS (10 entidades)
│   ├── srv/           # Serviços CAP + server.js (streaming SSE)
│   ├── app/           # 5 apps admin Fiori Elements
│   ├── scripts/       # Scripts de seed (modelos, personas)
│   └── mta.yaml
├── zilofront/         # Frontend React + Vite (chat UI, MTA próprio)
│   ├── src/           # Componentes, rotas, API clients
│   └── mta.yaml
└── ZILO_ORCHESTRATION_CONFIGS.md  # Referência das 8 personas AI Core
```

---

## Arquitetura

```
zilofront (React + Vite)
    │  SSE streaming
    ▼
ziloback (CAP Node.js + Express)
    │  config_ref → deploymentId
    ▼
SAP AI Core Orchestration
    ├── LLM (GPT / Gemini / Claude / Sonar Pro)
    ├── Grounding (SAP Document Management)
    ├── Masking (SAP Data Privacy Integration)
    └── Content Filter (Azure Content Safety + Prompt Shield)
```

### Componentes BTP

| Serviço | Uso |
|---|---|
| SAP AI Core | LLM Orchestration (1 deployment, 8 personas via config_ref) |
| SAP HANA Cloud | Banco de dados (HDI) |
| SAP Document Management | Data Repository para RAG (Caso 3) |
| XSUAA | Autenticação |
| SAP Build Work Zone | Launchpad dos apps admin |
| HTML5 Application Repository | Apps Fiori Elements |

---

## 8 Personas

| Persona | Modelo | Grounding | Masking |
|---|---|---|---|
| Zilo Base | GPT-6 Luna | ❌ | ❌ |
| Zilo Base Docs | GPT-6 Luna | ✅ SDM | ❌ |
| Zilo Advanced Docs GPT | GPT-5.6 Sol | ✅ SDM | ✅ |
| Zilo Advanced Docs Gemini | Gemini 3.5 Flash | ✅ SDM | ✅ |
| Zilo Executive Docs Claude | Claude Sonnet 4.6 | ✅ SDM | ✅ |
| Zilo Executive Docs Astra | GPT-6 Astra | ✅ SDM | ✅ |
| Zilo Pesquisa Web | Sonar Pro (Perplexity) | ❌ web nativo | ✅ |
| Zilo SAP Help | GPT-6 Luna | ✅ help.sap.com | ❌ |

---

## Entidades CAP

| Entidade | Descrição |
|---|---|
| `ModelCatalog` | Modelos com preços em CU/1k tokens |
| `OrchestrationConfig` | Personas (deploymentId + aicoreConfigId) |
| `CostPolicy` | Budget mensal em CU + orquestrações permitidas |
| `PolicyOrchestrations` | M:N entre CostPolicy e OrchestrationConfig |
| `JobRole` | Cargo com departamento, diretoria e policy padrão |
| `UserProfile` | Usuário (userId = XSUAA sub) vinculado ao JobRole |
| `UserPolicyOverride` | Exceções temporárias por usuário |
| `Conversations` + `Messages` | Histórico de chat |
| `TokenLedger` | Log granular: tokens, llmCU, orchCU, totalCU |
| `MonthlyUsageSummary` | Agregado mensal |

---

## Deploy

### Backend
```bash
cd ziloback
mbt build
cf deploy mta_archives/ziloback_1.0.0.mtar
```

### Frontend
```bash
cd zilofront
mbt build
cf deploy mta_archives/zilofront_1.0.0.mtar
```

### Seed de dados
```bash
cd ziloback
node scripts/seed-models.mjs          # ModelCatalog (59 modelos)
node scripts/seed-orchestrations.mjs  # OrchestrationConfig (8 personas)
```
