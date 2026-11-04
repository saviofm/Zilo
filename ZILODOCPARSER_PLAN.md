# zilodocparser — Plano de Implementação

App independente no BTP para parse inteligente de documentos antes do upload no SAP Document Management (SDM), otimizando o conteúdo para o pipeline de RAG do Zilo.

**Status:** Planejado — não iniciado  
**Data do plano:** 2026-11-03

---

## Contexto

O pipeline do SAP AI Core Grounding (SDM) recebe arquivos como estão e faz chunking genérico. Problemas:
- PDF com layout complexo: tabelas viram texto caótico
- PDF escaneado/imagem: sem OCR, texto é zero ou lixo
- Excel: múltiplas abas, cells merged, fórmulas — pipeline não entende estrutura
- Word: formatação e hierarquia perdidas no chunking cego

O `zilodocparser` intercepta o arquivo ANTES de ir para o SDM, parseia com inteligência (incluindo OCR via AI Core GPT Vision), e sobe uma versão em markdown estruturado no lugar do original.

---

## App independente — sem dependência do `dms_ui_app` ou `ziloback`

O `dms_ui_app` continua existindo para navegar/visualizar o repositório SDM.  
O `zilodocparser` é o ponto de entrada para uploads que vão alimentar o RAG.

---

## Fluxo completo

```
Usuário acessa zilodocparser.cfapps.us10-001.hana.ondemand.com
    │
    │  1. Seleciona arquivo (PDF/Excel/Word/Imagem)
    │  2. POST /api/parse  (multipart → srv)
    ▼
srv — parser
    ├── PDF nativo     → pdf-parse → markdown
    ├── PDF escaneado  → pdfjs render → AI Core GPT Vision → OCR
    ├── Excel          → exceljs → markdown por aba
    ├── Word           → mammoth → markdown estruturado
    └── Imagem         → AI Core GPT Vision → OCR + descrição
    │
    │  Retorna: { parsedText, pageCount, type, hasOcr, tokensUsed }
    │
    │  3. UI mostra preview + badge de métricas
    │  4. Usuário escolhe: processado (padrão) ou original
    │  5. POST /api/upload
    ▼
srv — CMIS client
    │  Autentica via SDM service binding
    │  POST multipart para https://api-sdm-di.cfapps.us10.hana.ondemand.com
    │  repositoryId: 8c102e74-d256-4456-b7eb-384e37a4a1ec
    │  folderId: escolhido pelo usuário via FolderPicker
    ▼
SAP Document Management (SDM)
    ▼
Pipeline vetorização → AI Core Grounding → RAG no Zilo
```

---

## Estrutura de diretórios

```
zilo/
└── zilodocparser/
    ├── approuter/
    │   ├── package.json
    │   └── xs-app.json
    ├── src/                        # React + Vite (mesmo stack do zilofront)
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── DropZone.jsx        # drag & drop de arquivo
    │   │   ├── ParseProgress.jsx   # progresso do parse/OCR página a página
    │   │   ├── ParsePreview.jsx    # preview do markdown + badge de métricas
    │   │   ├── UploadOptions.jsx   # toggle processado/original + aviso
    │   │   └── FolderPicker.jsx    # navegador de pastas do SDM
    │   └── api/
    │       ├── parse.js            # POST /api/parse
    │       └── upload.js           # POST /api/upload + GET /api/folders
    ├── srv/
    │   ├── server.js               # Express: /api/parse, /api/upload, /api/folders, /health
    │   ├── parsers/
    │   │   ├── index.js            # dispatcher por MIME type
    │   │   ├── pdf.js              # nativo + OCR Vision
    │   │   ├── excel.js            # exceljs → markdown
    │   │   ├── word.js             # mammoth → markdown
    │   │   └── image.js            # Vision direto
    │   ├── providers/
    │   │   └── aicore-vision.js    # AI Core GPT Vision para OCR
    │   └── sdm/
    │       └── client.js           # CMIS: listar pastas + upload
    ├── package.json                # workspace root (Vite build)
    ├── mta.yaml
    └── xs-security.json
```

---

## Serviços BTP — todos existing-service, zero provisionamento novo

| Serviço | Nome na subaccount | Uso |
|---|---|---|
| `xsuaa` | `zilo-xsuaa` | Auth do approuter (reusa o mesmo do Zilo) |
| `aicore` | `default_aicore` | GPT Vision para OCR |
| `sdm` | `document-management-standard-service` | Upload CMIS |
| `destination` | `dmsuiapp-destination-service` | `sdibackend` destination → SDM |

---

## Endpoints do `srv`

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/api/parse` | Recebe arquivo multipart, retorna `{ parsedText, pageCount, type, hasOcr, tokensUsed }` |
| `POST` | `/api/upload` | Recebe `{ parsedText, originalName, folderId, mode: "parsed"\|"raw", rawFile? }`, faz upload CMIS |
| `GET` | `/api/folders` | Lista pastas do repositório SDM para o FolderPicker |

---

## Lógica de parse por tipo

### PDF
1. `pdf-parse` extrai texto nativo
2. Página com menos de 100 chars → renderiza com `pdfjs-dist` como imagem base64
3. Imagem → AI Core GPT Vision: `"Extraia TODO o texto desta página. Preserve tabelas como markdown. Seja completo."`
4. Concatena páginas com `## Página N`

### Excel
1. `exceljs` lê todas as abas
2. Cada aba vira `## Aba: <nome>`
3. Cada linha vira `| col1 | col2 | col3 |`
4. Valores calculados, não fórmulas

### Word
1. `mammoth.convertToMarkdown()`
2. Preserva hierarquia h1/h2/h3, listas, tabelas
3. Imagens embutidas → Vision → descrição textual no lugar

### Imagem (PNG/JPG/TIFF/WebP)
1. Direto para AI Core GPT Vision
2. Prompt: `"Extraia TODO o texto visível. Se houver tabelas, preserve como markdown. Se houver gráficos, descreva os dados. Seja completo."`

---

## UI — tela única, fluxo em steps

### Step 1 — Drop
```
┌─────────────────────────────────────────────────┐
│  Zilo Doc Parser                                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │   📄  Arraste o arquivo aqui            │   │
│  │       ou clique para selecionar         │   │
│  │                                         │   │
│  │   PDF · Excel · Word · Imagens · 20MB   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Step 2 — Analisando
```
│  🔍 Analisando documento...
│  Extraindo texto — página 3 de 12
│  ⚡ 2 páginas via OCR (Vision)
```

### Step 3 — Preview + opções
```
┌─────────────────────────────────────────────────┐
│  ✅ Relatório_Q3.pdf                            │
│  12 páginas · OCR em 2 · ~3.800 tokens usados  │
│                                                 │
│  ┌── Preview ─────────────────────────────┐    │
│  │ ## Relatório Trimestral Q3 2025        │    │
│  │ ### Resumo Executivo                   │    │
│  │ A produção total atingiu 142.000 ton.. │    │
│  └────────────────────────────────────────┘    │
│                                                 │
│  Pasta de destino: [Selecionar pasta ▼]        │
│                                                 │
│  ● Subir versão processada  ← recomendado      │
│  ○ Subir arquivo original                       │
│                                                 │
│  ⚠ O arquivo carregado será uma versão         │
│    otimizada para busca, não o original.        │
│                                                 │
│         [Nova análise]  [Confirmar Upload]      │
└─────────────────────────────────────────────────┘
```

### Step 4 — Sucesso
```
│  ✅ Upload concluído
│  Relatório_Q3_parsed.md → SDM / Documentos Zilor
│  [Fazer outro upload]
```

---

## mta.yaml — estrutura resumida

```yaml
ID: zilodocparser
modules:
  - name: zilodocparser-approuter
    type: approuter.nodejs
    path: approuter
    # serve React build + proxy /api → srv
    requires: [zilo-xsuaa, zilodocparser-srv-api]

  - name: zilodocparser-srv
    type: nodejs
    path: srv
    parameters:
      memory: 512M      # OCR é pesado
      disk-quota: 1024M
    requires: [zilo-xsuaa, default_aicore, sdm-instance, dmsuiapp-destination-service]
    provides:
      - name: zilodocparser-srv-api
        properties:
          srv-url: ${default-url}

resources:
  - name: zilo-xsuaa
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: zilo-xsuaa

  - name: default_aicore
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: default_aicore

  - name: sdm-instance
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: document-management-standard-service

  - name: dmsuiapp-destination-service
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: dmsuiapp-destination-service
```

---

## Plano de execução por fases

| Fase | O que | Entregável |
|---|---|---|
| **1** | Scaffold completo: pastas, `package.json` (srv + frontend), `mta.yaml`, `xs-security.json`, Express com `/health`, Vite config | App deployável sem funcionalidade |
| **2** | `providers/aicore-vision.js` — cliente Vision via `@sap-ai-sdk/orchestration` ou HTTP direto para o deployment existente | OCR funcionando isoladamente |
| **3** | `parsers/pdf.js` — nativo com `pdf-parse` + fallback OCR por página com `pdfjs-dist` | PDF parse end-to-end |
| **4** | `parsers/excel.js` com `exceljs` + `parsers/word.js` com `mammoth` | Excel e Word funcionando |
| **5** | `parsers/image.js` — Vision direto + `parsers/index.js` dispatcher por MIME | Todos os tipos cobertos |
| **6** | `sdm/client.js` — CMIS: autenticação via service binding, `GET` pastas, `POST` upload multipart | Cliente SDM funcionando |
| **7** | `server.js` completo — `multer` para multipart, `/api/parse`, `/api/upload`, `/api/folders`, auth JWT | Backend completo |
| **8** | Frontend React: `DropZone`, `ParseProgress`, `ParsePreview`, `UploadOptions`, `FolderPicker` | UI funcional |
| **9** | `approuter/xs-app.json` + build commands no `mta.yaml` copiando `dist/` para o approuter | App roteado e buildável |
| **10** | Deploy BTP + smoke test: PDF nativo, PDF escaneado, Excel, Word, Imagem | Validação end-to-end |

---

## Dependências npm

### srv
```json
{
  "dependencies": {
    "@sap-ai-sdk/core": "^2.11.0",
    "@sap-ai-sdk/orchestration": "^2.17.0",
    "@sap/xssec": "^4",
    "express": "^4",
    "multer": "^1",
    "pdf-parse": "^1",
    "pdfjs-dist": "^4",
    "exceljs": "^4",
    "mammoth": "^1",
    "sharp": "^0.33",
    "axios": "^1"
  }
}
```

### frontend (raiz)
```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-markdown": "^10",
    "lucide-react": "^1"
  },
  "devDependencies": {
    "vite": "^8",
    "@vitejs/plugin-react": "^6",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```

---

## Decisões de design registradas

- **Substituir, não complementar**: sobe o `.md` parseado no lugar do original. O original não vai para o SDM por padrão. Opção "subir original" existe mas é secundária e exige ação explícita do usuário.
- **Aviso obrigatório**: a UI deixa claro antes do upload que o arquivo no SDM será a versão processada.
- **OCR só quando necessário**: só chama Vision se a página tiver menos de 100 chars de texto nativo — economiza tokens.
- **Mesmo stack do zilofront**: React + Vite + Tailwind + Lucide — consistência visual e de tooling.
- **Zero serviços novos**: todos os bindings BTP reutilizam serviços existentes da subaccount.
- **SDM direto do srv**: o backend autentica com o service binding do SDM e faz o upload CMIS — o browser nunca toca no SDM diretamente.
- **repositoryId fixo**: `8c102e74-d256-4456-b7eb-384e37a4a1ec` (mesmo do `dms_ui_app`) — mesmo repositório, só muda a pasta de destino escolhida pelo usuário.
