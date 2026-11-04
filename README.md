# Zilo — Assistente Corporativo de IA da Zilor

Assistente de IA corporativo para colaboradores da **Zilor** (setor sucroenergético, 4 usinas em SP), desenvolvido sobre SAP BTP com CAP, SAP AI Core Orchestration e React.

Proposta do RFP: **Caso 1** (chat corporativo com budget control) + **Caso 3** (RAG sobre base documental SDM).

---

## Estrutura do repositório

```
Zilo/
├── ziloback/          # Backend CAP + apps admin Fiori Elements
│   ├── db/            # Schema CDS (11 entidades)
│   ├── srv/           # Serviços CAP + server.js (SSE + tool-use loop)
│   ├── app/           # 6 apps admin Fiori Elements
│   └── scripts/       # Seed: modelos, perfis, políticas, cargos, module-configs
├── zilofront/         # Frontend chat React + Vite
│   └── src/
│       ├── components/  # Sidebar, MessageInput, ProcessingCard, BlockDispatcher,
│       │                # ChartBlock, TableBlock, KpiBlock, CalculatorBlock, CodeBlock
│       ├── api/         # chat, conversations, orchestrations, ledger, files, sessionGuard
│       └── routes/      # ConsumptionRoute
├── zilofinopps/       # Frontend FinOps Analytics React + Vite (admin dashboard)
│   └── src/
│       ├── components/  # ChartCard, KpiCard, InsightsPanel, Sidebar
│       └── routes/      # Overview, ByMonth, ByModel, ByPersona, ByJobRole,
│                        # Visão por Usuários, Simulador, Simulador Avançado
├── ZILODOCPARSER_PLAN.md  # Plano do app de parse de documentos para SDM
└── usecase/           # Casos de uso para testes
    ├── basic/         # Pedidos_simples.xlsx + prompt.txt
    └── advanced/      # Faturamento Zilo.xlsx + prompt_advanced.txt
```

---

## Arquitetura

```
zilofront (React — chat)          zilofinopps (React — admin analytics)
    │  SSE + tool-use loop              │  REST → /api/admin
    ▼                                   ▼
ziloback (CAP Node.js + Express)
    │  config_ref + overrideConfig(tools) + fallback moduleConfigJson
    ▼
SAP AI Core Orchestration (deployment d7a09bc4d6d523f7)
    ├── LLM (GPT-5.6 Luna/Sol, Gemini 3.5 Flash, Claude Sonnet 4.6, Sonar Pro)
    ├── Tool-use loop (render_chart, render_table, render_kpi, calculator,
    │                   generate_file, render_code) — máx 10 iterações
    ├── Grounding (SAP Document Management — 5 perfis)
    ├── Masking (SAP DPI — 4 perfis)
    └── Content Filter (Azure Content Safety + Prompt Shield)
```

### Produtos SAP utilizados

| Produto | Uso |
|---|---|
| SAP BTP Cloud Foundry | Runtime de todas as aplicações |
| SAP HANA Cloud (HDI) | Banco de dados |
| SAP AI Core | LLM Orchestration |
| SAP AI Launchpad | Configuração das Orchestration Configs |
| SAP Authorization & Trust Management (XSUAA) | Autenticação |
| SAP HTML5 Application Repository | Apps admin Fiori Elements |
| SAP Destination Service | Roteamento |
| SAP Build Work Zone (managed) | Launchpad dos apps admin |
| SAP Document Management Service (SDM) | Data Repository para RAG |
| SAP Identity Authentication (IAS) | Login SSO |

---

## Aplicações

| App | URL | Usuários |
|---|---|---|
| **zilofront** — Chat IA | `https://zilo.cfapps.us10-001.hana.ondemand.com` | Todos os colaboradores |
| **zilofinopps** — FinOps Analytics | `https://zilofinopps.cfapps.us10-001.hana.ondemand.com` | Administradores |
| **Work Zone** — Apps admin | `https://saamerbuild.launchpad.cfapps.us10.hana.ondemand.com/site/ai` | Admins Zilo |

---

## 8 Perfis de IA

| Perfil | Modelo | Grounding | Masking | Tools |
|---|---|---|---|---|
| Zilo Base | GPT-5.6 Luna | ❌ | ❌ | ✅ |
| Zilo Base Docs | GPT-5.6 Luna | ✅ SDM | ❌ | ✅* |
| Zilo Advanced Docs GPT | GPT-5.6 Sol | ✅ SDM | ✅ | ✅* |
| Zilo Advanced Docs Gemini | Gemini 3.5 Flash | ✅ SDM | ✅ | ✅* |
| Zilo Executive Docs Claude | Claude Sonnet 4.6 | ✅ SDM | ✅ | ✅* |
| Zilo Executive Docs Astra | GPT-5.6 Sol | ✅ SDM | ✅ | ✅* |
| Zilo Pesquisa Web | Sonar Pro | ❌ web nativo | ✅ | ❌ |
| Zilo SAP Help | GPT-5.6 Luna | ✅ help.sap.com | ❌ | ✅* |

> \* Tools disponíveis via `moduleConfigJson` no banco. Para plena eficácia via `config_ref`, instrução deve estar também no template do AI Launchpad.
> Tools: `render_chart`, `render_table`, `render_kpi`, `calculator`, `generate_file`, `render_code`

---

## Funcionalidades

### Chat (zilofront)
- Streaming SSE + fallback non-streaming automático
- **Tool-use loop** (máx 10 iterações) com ProcessingCard animado
- Blocks renderizados: gráficos (Recharts), tabelas sortable/filterable, KPI cards, calculadora, código com syntax highlight, download de arquivos
- **Blocos persistidos no banco** — gráficos e tabelas reaparecem ao reabrir a conversa
- Upload multimodal: PDF, Word, Excel, CSV, imagens (processamento client-side)
- Contexto de arquivos persistido no histórico da conversa
- Drag & drop, múltiplos arquivos, chips de preview
- Troca livre de perfil de IA por mensagem
- Budget enforcement (402 quando limite atingido)
- Session expiry screen + timeout modal com countdown
- Scroll inteligente + ThinkingMessage dots

### FinOps Analytics (zilofinopps)
- **Overview**: KPIs do mês, trend de 12 meses, top perfis, top usuários, utilização vs budget
- **Por Mês**: evolução histórica com gráficos de área e barras
- **Por Modelo**: distribuição de consumo por LLM com share %
- **Por Perfil de IA**: ranking de personas mais usadas
- **Por Cargo**: consumo agregado por JobRole/departamento
- **Visão por Usuários**: drill-down individual com ledger detalhado
- **Simulador**: aba Por Volume (msgs/mês) e aba Por Cota (alocação orçamentária)
- **Simulador Avançado**: por tokens, msgs/dia, comparação entre todos os perfis
- **Agente de Insights**: chat com IA usando dados de consumo como contexto

### Consumo / Ledger
- `TokenLedger`: uma entrada por execução com tokens acumulados do loop inteiro
- `MonthlyUsageSummary`: recomputado fire-and-forget após cada chat
- Tela de Consumo no zilofront: KPIs, por perfil, navegação por mês, modal drill-down

---

## Entidades CAP

| Entidade | Descrição |
|---|---|
| `ModelCatalog` | 59 modelos com preços em Créditos de IA/1k tokens |
| `OrchestrationConfig` | 8 perfis (deploymentId + aicoreConfigId + moduleConfigJson + groundingEnabled) |
| `CostPolicy` | Budget mensal (Créditos de IA) + perfis permitidos |
| `PolicyOrchestrations` | M:N entre CostPolicy e OrchestrationConfig |
| `JobRole` | Cargo com departamento, diretoria e policy padrão |
| `UserProfile` | Usuário (userId = XSUAA sub) vinculado ao JobRole |
| `UserPolicyOverride` | Exceções temporárias por usuário |
| `Conversations` + `Messages` | Histórico de chat com texto e blocos tool-use persistidos |
| `TokenLedger` | Log granular: tokens, llmCU, orchCU, totalCU |
| `MonthlyUsageSummary` | Agregado mensal recomputado após cada chat |

---

## Deploy

```bash
# Ordem: ziloback primeiro (APIs), depois os frontends
cd ziloback && mbt build && cf deploy mta_archives/ziloback_1.0.0.mtar
cd zilofinopps && mbt build && cf deploy mta_archives/zilofinopps_1.0.0.mtar
cd zilofront && mbt build && cf deploy mta_archives/zilofront_1.0.0.mtar
```

### Seed de dados
```bash
cd ziloback
node scripts/seed-models.mjs
node scripts/seed-orchestrations.mjs
node scripts/seed-module-configs.mjs
node scripts/seed-policies.mjs
node scripts/seed-jobroles.mjs
```

---

## Roadmap

### render_table nos perfis com grounding (próximo passo)
- Adicionar instrução de tools no system prompt de cada perfil no AI Launchpad (5 perfis com grounding)
- Atualizar `aicoreConfigId` no banco após salvar nova versão

### zilodocparser — App de Parse de Documentos para SDM
- App standalone no BTP para parse inteligente de documentos antes do upload no SDM
- OCR via AI Core GPT Vision para PDFs escaneados e imagens
- Suporte: PDF, Excel, Word, imagens → markdown estruturado
- Preview antes do upload + escolha de pasta no SDM
- Ver plano completo: `ZILODOCPARSER_PLAN.md`

### Armazenamento de Arquivos — SAP Object Store
- Binário dos arquivos → SAP Object Store (S3-compatible), TTL 90 dias
- Chip do arquivo clicável ao reabrir conversa (hoje só texto extraído é persistido)
- Nova entidade CAP: `Attachments`

### Streaming Real
- Validar suporte streaming em `gpt-5.6-luna` via orchestration deployment

### Novos Perfis de IA
- Perfil Agente (call_agent, web_search tools)
- Perfil Código (especializado ABAP/SAP)

### zilofinopps — Melhorias
- Export relatórios PDF/Excel
- Alertas de budget por email (SAP Alert Notification Service)
- Previsão de consumo mensal

### Infraestrutura
- Configurar trust IAS↔XSUAA (fix definitivo de auth)
- Adicionar docs reais da Zilor no Data Repository SDM
- RUNBOOK.md operacional
