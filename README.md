# Zilo — Assistente Corporativo de IA da Zilor

Assistente de IA corporativo para colaboradores da **Zilor** (setor sucroenergético, 4 usinas em SP), desenvolvido sobre SAP BTP com CAP, SAP AI Core Orchestration e React.

Proposta do RFP: **Caso 1** (chat corporativo com budget control) + **Caso 3** (RAG sobre base documental SDM).

---

## Estrutura do repositório

```
Zilo/
├── ziloback/          # Backend CAP + apps admin Fiori Elements (MTA próprio)
│   ├── db/            # Schema CDS (11 entidades)
│   ├── srv/           # Serviços CAP + server.js (SSE)
│   ├── app/           # 6 apps admin Fiori Elements
│   ├── scripts/       # Seed: modelos, perfis, políticas, cargos, module-configs
│   └── mta.yaml
├── zilofront/         # Frontend React + Vite (MTA próprio)
│   ├── src/
│   │   ├── components/  # Sidebar, ConversationList, MessageInput, SessionExpiredScreen
│   │   ├── api/         # chat, conversations, orchestrations, ledger, sessionGuard
│   │   └── routes/      # ConsumptionRoute
│   └── mta.yaml
└── ZILO_ORCHESTRATION_CONFIGS.md
```

---

## Arquitetura

```
zilofront (React + Vite)
    │  SSE / non-streaming
    ▼
ziloback (CAP Node.js + Express)
    │  config_ref → deploymentId  (fallback: moduleConfigJson)
    ▼
SAP AI Core Orchestration (deployment d7a09bc4d6d523f7)
    ├── LLM (GPT-5.6 Luna/Sol, Gemini 3.5 Flash, Claude Sonnet 4.6, Sonar Pro)
    ├── Grounding (SAP Document Management — 5 perfis)
    ├── Masking (SAP DPI — 4 perfis)
    └── Content Filter (Azure Content Safety + Prompt Shield)
```

### Componentes BTP

| Serviço | Uso |
|---|---|
| SAP AI Core | LLM Orchestration (1 deployment, 8 perfis de IA) |
| SAP HANA Cloud | Banco de dados (HDI) |
| SAP Document Management | Data Repository para RAG (Caso 3) |
| XSUAA | Autenticação |
| SAP Build Work Zone | Launchpad dos apps admin |
| HTML5 Application Repository | Apps Fiori Elements |

---

## 8 Perfis de IA

| Perfil | Modelo | Grounding | Masking |
|---|---|---|---|
| Zilo Base | GPT-5.6 Luna | ❌ | ❌ |
| Zilo Base Docs | GPT-5.6 Luna | ✅ SDM | ❌ |
| Zilo Advanced Docs GPT | GPT-5.6 Sol | ✅ SDM | ✅ |
| Zilo Advanced Docs Gemini | Gemini 3.5 Flash | ✅ SDM | ✅ |
| Zilo Executive Docs Claude | Claude Sonnet 4.6 | ✅ SDM | ✅ |
| Zilo Executive Docs Astra | GPT-5.6 Sol | ✅ SDM | ✅ |
| Zilo Pesquisa Web | Sonar Pro (Perplexity) | ❌ web nativo | ✅ |
| Zilo SAP Help | GPT-5.6 Luna | ✅ help.sap.com | ❌ |

---

## Funcionalidades implementadas

- Chat com SSE + fallback non-streaming
- Budget enforcement (402 quando limite atingido)
- Troca livre de perfil por mensagem
- Grounding com Data Repository SDM
- Masking de PII (SAP DPI)
- Content Filter (Azure Content Safety + Prompt Shield)
- Tela de consumo: KPIs, por perfil, modal drill-down com filtros
- Ledger de tokens em tempo real
- Session expiry screen
- Scroll inteligente + ThinkingMessage dots

---

## Entidades CAP

| Entidade | Descrição |
|---|---|
| `ModelCatalog` | Modelos com preços em Créditos de IA/1k tokens |
| `OrchestrationConfig` | Perfis (deploymentId + aicoreConfigId + moduleConfigJson + groundingEnabled) |
| `CostPolicy` | Budget mensal (Integer) + perfis permitidos |
| `PolicyOrchestrations` | M:N entre CostPolicy e OrchestrationConfig |
| `JobRole` | Cargo com departamento, diretoria e policy padrão |
| `UserProfile` | Usuário (userId = XSUAA sub) vinculado ao JobRole |
| `UserPolicyOverride` | Exceções temporárias por usuário |
| `Conversations` + `Messages` | Histórico de chat |
| `TokenLedger` | Log granular: tokens, llmCU, orchCU, totalCU |
| `MonthlyUsageSummary` | Agregado mensal (recomputado após cada chat) |

---

## Próxima fase — Upload e análise de arquivos

- PDF, Word, Excel, CSV, imagens
- Drag & drop, múltiplos arquivos, preview, progress
- Processamento: `pdf-parse`, `mammoth`, `xlsx` (SheetJS)
- Imagens: base64 para modelos com visão (Claude, Gemini)
- Associação ao contexto da conversa

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
node scripts/seed-models.mjs
node scripts/seed-orchestrations.mjs
node scripts/seed-policies.mjs
node scripts/seed-jobroles.mjs
```
