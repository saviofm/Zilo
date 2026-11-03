# Zilo — Assistente Corporativo de IA da Zilor

Assistente de IA corporativo para colaboradores da **Zilor** (setor sucroenergético, 4 usinas em SP), desenvolvido sobre SAP BTP com CAP, SAP AI Core Orchestration e React.

Proposta do RFP: **Caso 1** (chat corporativo com budget control) + **Caso 3** (RAG sobre base documental SDM).

---

## Estrutura do repositório

```
Zilo/
├── ziloback/          # Backend CAP + apps admin Fiori Elements (MTA próprio)
│   ├── db/            # Schema CDS (11 entidades)
│   ├── srv/           # Serviços CAP + server.js (SSE + tool_use)
│   ├── app/           # 6 apps admin Fiori Elements
│   ├── scripts/       # Seed: modelos, perfis, políticas, cargos, module-configs
│   └── mta.yaml
├── zilofront/         # Frontend React + Vite (MTA próprio)
│   ├── src/
│   │   ├── components/  # Sidebar, ConversationList, MessageInput, ChartBlock, SessionExpiredScreen
│   │   ├── api/         # chat, conversations, orchestrations, ledger, files, sessionGuard
│   │   └── routes/      # ConsumptionRoute
│   └── mta.yaml
├── usecase/           # Casos de uso para testes
│   ├── basic/         # Pedidos_simples.xlsx + prompt.txt
│   └── advanced/      # Faturamento Zilo.xlsx + prompt_advanced.txt
└── ZILO_ORCHESTRATION_CONFIGS.md
```

---

## Arquitetura

```
zilofront (React + Vite)
    │  SSE / non-streaming fallback
    ▼
ziloback (CAP Node.js + Express)
    │  config_ref → deploymentId  (fallback: moduleConfigJson)
    ▼
SAP AI Core Orchestration (deployment d7a09bc4d6d523f7)
    ├── LLM (GPT-5.6 Luna/Sol, Gemini 3.5 Flash, Claude Sonnet 4.6, Sonar Pro)
    ├── Grounding (SAP Document Management — 5 perfis)
    ├── Masking (SAP DPI — 4 perfis)
    ├── Content Filter (Azure Content Safety + Prompt Shield)
    └── Tool Use (render_chart — 6 perfis)
```

### Produtos SAP utilizados

| Produto | Uso |
|---|---|
| SAP BTP Cloud Foundry | Runtime de todas as aplicações |
| SAP HANA Cloud (HDI) | Banco de dados — entidades, ledger, histórico |
| SAP AI Core | LLM Orchestration (1 deployment, 8 perfis) |
| SAP AI Launchpad | Configuração das Orchestration Configs |
| SAP Authorization & Trust Management (XSUAA) | Autenticação e autorização |
| SAP HTML5 Application Repository | Apps admin Fiori Elements |
| SAP Destination Service | Roteamento Work Zone → ziloback |
| SAP Build Work Zone (managed) | Launchpad dos apps admin |
| SAP Document Management Service (SDM) | Data Repository para grounding RAG |
| SAP Identity Authentication (IAS) | Login SSO |

---

## 8 Perfis de IA

| Perfil | Modelo | Grounding | Masking | Gráficos |
|---|---|---|---|---|
| Zilo Base | GPT-5.6 Luna | ❌ | ❌ | ✅ |
| Zilo Base Docs | GPT-5.6 Luna | ✅ SDM | ❌ | ✅ |
| Zilo Advanced Docs GPT | GPT-5.6 Sol | ✅ SDM | ✅ | ✅ |
| Zilo Advanced Docs Gemini | Gemini 3.5 Flash | ✅ SDM | ✅ | ✅ |
| Zilo Executive Docs Claude | Claude Sonnet 4.6 | ✅ SDM | ✅ | ✅ |
| Zilo Executive Docs Astra | GPT-5.6 Sol | ✅ SDM | ✅ | ✅ |
| Zilo Pesquisa Web | Sonar Pro (Perplexity) | ❌ web nativo | ✅ | ❌ |
| Zilo SAP Help | GPT-5.6 Luna | ✅ help.sap.com | ❌ | ❌ |

---

## Funcionalidades

### Chat
- Streaming SSE com fallback automático para non-streaming
- Troca livre de perfil de IA por mensagem
- Budget enforcement — bloqueia ao atingir limite mensal
- Indicador "pensando" (dots animados) enquanto aguarda resposta
- Scroll inteligente — não interrompe leitura se usuário rolou para cima
- Sessão expirada: tela de bloqueio com botão de re-login

### Upload e análise de arquivos
- Formatos suportados: PDF, Word (.docx), Excel (.xlsx/.xls), CSV, TXT, MD, imagens
- Interface: botão Anexar + drag & drop na área de input
- Múltiplos arquivos por mensagem, chips de preview antes do envio
- Processamento client-side: `pdfjs-dist`, `mammoth`, `xlsx` (SheetJS)
- **Contexto persistido:** conteúdo extraído salvo no histórico → modelo tem acesso em toda a conversa
- Chip clicável na conversa: imagem → download; doc → download do texto extraído

### Geração de arquivos e gráficos
- Modelo instrui para retornar dados em blocos \`\`\`csv ou \`\`\`json
- Backend detecta blocos de código e tabelas Markdown → botão "Baixar" abaixo da resposta
- Gráficos via tool_use (`render_chart`): line, bar, stacked-bar, pie
- Renderizado com Recharts, paleta Zilor
- Download para Excel via SheetJS

### Consumo e budget
- Créditos de IA calculados por chamada (tokens × preço do modelo)
- Tela de Consumo: KPIs em tempo real, por perfil, navegação por mês
- Modal de drill-down com filtros por perfil e ordenação
- Budget enforcement: 402 quando `usedCU ≥ budgetCU`
- Políticas de acesso por cargo/departamento

---

## Entidades CAP

| Entidade | Descrição |
|---|---|
| `ModelCatalog` | 59 modelos com preços em Créditos de IA/1k tokens |
| `OrchestrationConfig` | 8 perfis (deploymentId + aicoreConfigId + moduleConfigJson + groundingEnabled) |
| `CostPolicy` | Budget mensal (Integer Créditos) + perfis permitidos |
| `PolicyOrchestrations` | M:N entre CostPolicy e OrchestrationConfig |
| `JobRole` | Cargo com departamento, diretoria e policy padrão |
| `UserProfile` | Usuário (userId = XSUAA sub) vinculado ao JobRole |
| `UserPolicyOverride` | Exceções temporárias por usuário |
| `Conversations` + `Messages` | Histórico de chat (Messages.content inclui texto de arquivos anexados) |
| `TokenLedger` | Log granular: tokens, llmCU, orchCU, totalCU por resposta |
| `MonthlyUsageSummary` | Agregado mensal recomputado após cada chat |

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
node scripts/seed-models.mjs            # ModelCatalog (59 modelos)
node scripts/seed-orchestrations.mjs    # OrchestrationConfig (8 perfis)
node scripts/seed-module-configs.mjs    # moduleConfigJson de cada perfil
node scripts/seed-policies.mjs          # CostPolicy (5 políticas)
node scripts/seed-jobroles.mjs          # JobRole (8 cargos)
```

---

## Roadmap

### Armazenamento de Arquivos — SAP Object Store
Situação atual: texto extraído gravado em `Messages.content` (HANA). Próxima fase:
- Arquivo binário → SAP Object Store (S3-compatible)
- TTL de 90 dias, job de limpeza, delete em cascata
- Presigned URLs (validade 1h), validação de ownership
- Limites: 20MB/arquivo, 100MB/conversa
- Nova entidade `Attachments` no schema CAP

### Streaming Real
- Validar se `gpt-5.6-luna` passou a suportar streaming via orchestration deployment
- Log a checar: `chat result type { hasStreamResp: true }` = streaming ativo

### Outros
- Adicionar docs reais da Zilor no Data Repository SDM (grounding)
- Configurar trust IAS↔XSUAA (fix definitivo de auth)
- RUNBOOK.md operacional
