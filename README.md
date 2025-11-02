# 🏨 Motor Reservas — Plataforma de reservas com PIX e CI/CD

### Links rápidos
- [Checklist MVP](#checklist-mvp-rápido)
- [Copiar e colar (PowerShell)](#copiar-e-colar-windows-powershell)
- [Copiar e colar (bash)](#copiar-e-colar-bash--linuxmacos)
- [FAQ MVP](#faq-mvp-rápido)
- [Troubleshooting](#troubleshooting)
- [Erros conhecidos (Prisma)](#erros-conhecidos-prisma)
- [Exemplos de payloads](#exemplos-de-payloads-rápidos)
 - [Rodar testes](#rodar-testes-rápido)

## 🌐 Produção (Live)

- Backend: https://motor-reservas-backend.onrender.com (health: https://motor-reservas-backend.onrender.com/health)
- Frontend: https://magnificent-moxie-8bdddd.netlify.app/

## ⚡ Produção em 5 minutos

1) Backend (Render)
- Tipo: Web Service, Root: `backend`
- Build (SQLite testes): `npm install && npx prisma generate --schema src/prisma/schema.prisma && npx prisma db push --schema src/prisma/schema.prisma && node src/prisma/seed.js`
- Build (PostgreSQL produção): `npm install && npx prisma generate --schema src/prisma/schema.prisma && npx prisma migrate deploy --schema src/prisma/schema.prisma && node src/prisma/seed.js`
- Start: `node src/app.js`
- Variáveis: para testes, defina `DATABASE_URL="file:./src/prisma/dev.db"` (SQLite efêmero em Render free), `PIX_STUB=true` (MVP), `CORS_ALLOWED_ORIGINS=https://magnificent-moxie-8bdddd.netlify.app` e (opcional) `AVAILABILITY_URL`. Para produção com persistência, use PostgreSQL no Render: `DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"`. Para PIX real: `PIX_STUB=false` + `MP_ACCESS_TOKEN`.

2) Frontend (Netlify)
- Base: `frontend`, Build: `npm ci && npm run build`, Publish: `frontend/dist`
- Variáveis: `VITE_API_URL=https://motor-reservas-backend.onrender.com/api`

3) Validar
- `GET https://motor-reservas-backend.onrender.com/health` → `{ status: "ok" }`
- Acesse o frontend, crie uma reserva e verifique o PIX (stub ou real).

Detalhes completos em: [Guia de Produção](#-guia-de-produção)

## 🔧 Atualização de imagens em produção

Para popular o campo `imagens` dos quartos já existentes no banco de produção (Render/PostgreSQL), execute o patch abaixo no Shell do serviço (Render → seu serviço backend → Shell):

```
# Caminho padrão do projeto no Render
cd /opt/render/project/src/backend

# (Opcional) Se o container acabou de subir e não tem node_modules:
npm ci --omit=dev

# Rodar o patch — usa padrões por nome e fallback
npm run db:patch:images
```

Notas:
- O script só atualiza quartos sem `imagens` definida e registra a quantidade atualizada.
- Não altera registros que já possuam imagens.
- Em ambientes locais: defina `DATABASE_URL` e rode `cd backend && npm ci && npm run db:patch:images`.


## ✅ Checklist MVP (rápido)

- Preparar ambiente
  - `cp backend/.env.example backend/.env`
  - Em `backend/.env`: `PORT=4000`, `DATABASE_URL="file:./src/prisma/dev.db"`, `PIX_STUB=true`.
  - `cd backend && npm run prisma:push`
  - `cd frontend && npm run dev:full` (abre `http://localhost:5173/`)

- Validar fluxo
  - Health: `GET /health` retorna `200` e `{ status: 'ok' }`.
  - Frontend lista quartos na home.
  - Disponibilidade: `GET /api/disponibilidade?checkin=2025-11-20&checkout=2025-11-22&guests=2` retorna `200` e `availableRooms`.
  - Reserva cria `id` e `total` (ex.: 600 ou 350) e exibe PIX.
  - PIX stub: mostra `qr_code_base64` e "Copia e Cola".
  - Testes do backend: `cd backend && npm test` deve passar sem falhas.

- Evitar problemas
  - Não defina `VITE_API_URL` em dev; use base `'/api'`.
  - Proxy do Vite: `/api → http://localhost:4000`.
  - Se erro Prisma: pare servidores e rode `npm run prisma:push`.

> Exemplos de payloads e troubleshooting detalhados abaixo.

### Copiar e colar (Windows PowerShell)

Execute os comandos abaixo em sequência para configurar e iniciar o ambiente, depois faça a validação em um segundo terminal:

```powershell
# Setup
Copy-Item backend/.env.example backend/.env
cd backend
npm run prisma:push
cd ../frontend
npm run dev:full

# Validação rápida (em outro terminal)
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/api/quartos
Invoke-RestMethod "http://localhost:4000/api/disponibilidade?checkin=2025-11-20&checkout=2025-11-22&guests=2"
$body = @{ quartoId = 1; nomeCliente = 'Cliente Teste'; email = 'cliente@exemplo.com'; checkin = ([DateTime]::Parse('2025-11-20').ToString('o')); checkout = ([DateTime]::Parse('2025-11-22').ToString('o')); guests = 2 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/reservas -ContentType 'application/json' -Body $body
$pix = @{ email = 'cliente@exemplo.com'; total = 350 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/pagamento/pix -ContentType 'application/json' -Body $pix

# Testes do backend (em outro terminal)
cd backend
npm test
```

### Copiar e colar (bash — Linux/macOS)

Execute os comandos abaixo em sequência para configurar e iniciar o ambiente e validar o fluxo:

```bash
# Setup
cp backend/.env.example backend/.env
(cd backend && npm run prisma:push)
(cd frontend && npm run dev:full)

# Validação (em outro terminal)
curl -s http://localhost:4000/health
curl -s http://localhost:4000/api/quartos
curl -s "http://localhost:4000/api/disponibilidade?checkin=2025-11-20&checkout=2025-11-22&guests=2"
curl -s -X POST http://localhost:4000/api/reservas \
  -H 'Content-Type: application/json' \
  -d '{"quartoId":1,"nomeCliente":"Cliente Teste","email":"cliente@exemplo.com","checkin":"2025-11-20T00:00:00.000Z","checkout":"2025-11-22T00:00:00.000Z","guests":2}'
curl -s -X POST http://localhost:4000/api/pagamento/pix \
  -H 'Content-Type: application/json' \
  -d '{"email":"cliente@exemplo.com","total":350}'

# Testes do backend (em outro terminal)
(cd backend && npm test)
```

## ❓ FAQ MVP (rápido)
- Preciso definir `VITE_API_URL` em desenvolvimento?
  - Não. Em dev, o frontend usa base `'/api'` e o proxy do Vite redireciona para `http://localhost:4000`. Garanta que o backend esteja na porta `4000`. Se mudar a porta, ajuste `frontend/vite.config.js`.
  - Veja também: "✅ Checklist MVP" e "Copiar e colar" para validação rápida.

- Como resolver `Prisma P1012: Environment variable not found: DATABASE_URL`?
  - Copie o `.env`: `cp backend/.env.example backend/.env` (ou `Copy-Item` no Windows).
  - Em `backend/.env`, defina `DATABASE_URL` (ex.: `"file:./src/prisma/dev.db"`) e rode `npm run prisma:push` no diretório `backend`.
  - Veja: "🧯 Troubleshooting" e "⚠️ Erros conhecidos (Prisma)" para causas e soluções.

- Como ativar o PIX simulado (stub)?
  - Defina `PIX_STUB=true` no `.env` do backend. Não é necessário `MP_ACCESS_TOKEN` para o stub.
  - Valide com `POST /api/pagamento/pix` usando os exemplos da seção "📦 Exemplos de payloads".
  - Em produção, use `PIX_STUB=false` e configure `MP_ACCESS_TOKEN`.

- Posso mudar a porta do backend?
  - Sim, via `PORT` no `.env` do backend. Recomenda-se manter `4000` em dev para compatibilidade com o proxy do Vite e com os comandos da checklist.
  - Se alterar, atualize o proxy em `frontend/vite.config.js` e ajuste os comandos de validação (`curl`/`Invoke-RestMethod`).
  - Veja: "🧯 Troubleshooting" (proxy) e `frontend/vite.config.js`.

Motor Reservas é uma aplicação full stack que oferece fluxo completo de reservas de hotel, cobrança com PIX via Mercado Pago e base pronta para CI/CD com Render (backend) e Netlify (frontend). O repositório está organizado em **Node.js + Express + Prisma** no backend e **React + Vite + Tailwind** no frontend, com documentação em `docs/` e automação via GitHub Actions.

## 🚀 Estrutura do projeto

```
motor-reservas/
├── backend/             # API Express + Prisma + Mercado Pago
│   ├── package.json
│   └── src/
│       ├── app.js       # Rotas de quartos, reservas e PIX
│       └── prisma/
│           └── schema.prisma
├── frontend/            # SPA React + Vite + Tailwind
│   ├── package.json
│   └── src/
│       └── App.jsx      # Listagem de quartos e checkout PIX
├── docs/                # PRD, visão arquitetural e guias
├── .github/workflows/   # Pipeline CI/CD para testes e deploy
├── render.yaml          # Configuração sugerida para Render
└── netlify.toml         # Configuração sugerida para Netlify
```

> **Importante:** a pasta `docs/` deve conter, no mínimo, `PRD.md` e `DDD-architecture.md` com os detalhes funcionais e técnicos do produto.

## 📦 Resumo das implementações

### Backend (Node.js + Express + Prisma)
- Endpoints com prefixo `/api`:
  - `GET /api/quartos` — lista quartos.
  - `GET /api/disponibilidade` — consulta disponibilidade por período e hóspedes, integrando opcionalmente microsserviço externo.
  - `POST /api/reservas` — cria reserva com validações de datas, email e capacidade.
  - `PUT /api/reservas/:id` — atualiza reserva com checagem de conflito.
  - `DELETE /api/reservas/:id` — cancela reserva.
  - `GET /api/reservas/historico` — histórico por email/data.
  - `POST /api/pagamento/pix` — gera QR Code PIX (stub ou Mercado Pago real).
  - `POST /api/pagamento/cartao` e `GET /api/pagamento/status/:id` — integração com cartão via Mercado Pago.
  - `POST /api/webhooks/mercadopago` — webhook para atualização de status de pagamento.
- Observabilidade e segurança:
  - Health-check em `/health` com informações de ambiente.
  - `helmet`, `compression` e CORS por env (`CORS_ALLOWED_ORIGINS`).
  - Rate limiting configurável por env para reservas e pagamentos.
  - Sentry opcional (`SENTRY_DSN`) com `requestHandler` e `errorHandler`.
- Banco de dados e migrações:
  - Prisma com `Quarto` e `Reserva`.
  - Seed automático em dev e script `src/prisma/seed.js` para produção.
  - Migração de proteção a overbooking (`tsrange + exclusion constraint`).
  - Índices em `Reserva` para consultas por período e histórico.

### Frontend (React + Vite + Tailwind)
- SPA com listagem de quartos, checagem de disponibilidade e fluxo de reserva.
- Componentes principais:
  - `RoomGrid`, `RoomCard`, `SkeletonCard` — catálogo de quartos.
  - `CheckoutForm`, `ConfirmModal` — fluxo de reserva e confirmação.
  - `PixPanel`, `CardPaymentBrick`, `PaymentMethodSelector` — pagamentos PIX/cartão.
  - `ReservationHistory`, `StatusToast`, `Spinner`, `Header`, `EmptyState` — suporte a histórico, feedback e layout.
- Integrações:
  - Sentry com `BrowserTracing` e `ErrorBoundary`.
  - `API_BASE` dinâmico: em dev usa `"/api"` via proxy do Vite; em produção usa `VITE_API_URL`.
  - Utilitários de preço (`calculateNights`, `formatBRL`).
- Estilo:
  - Tailwind configurado e `index.css` com estilos base.

### Infra / CI/CD
- Netlify (`netlify.toml`):
  - `[build] base = "frontend"`, `publish = "dist"`, `command = "npm install && npm run build"`.
  - `[dev] framework = "vite"`, `port = 5173` e `targetPort = 5173`.
- Render (`render.yaml`):
  - Build com `prisma generate`, `db push` (SQLite em testes) ou `migrate deploy` (PostgreSQL em produção), e `seed`.
  - Variáveis de ambiente para rate limiting, CORS, PIX e disponibilidade.
- GitHub Actions:
  - `ci-cd.yml`: testes backend/frontend/services e deploy automatizado (Netlify + Render) com segredos.
  - `prod-smoke.yml`: smoke horário com health e listagem de quartos.
- Scripts:
  - `scripts/smoke.sh` e `scripts/smoke.ps1` para validação rápida.

### Microsserviços (opcionais)
- Availability Service: endpoint `/availability` com validação, rate limit e consulta a `room/reservation` em Prisma.
- Booking Service: orquestra criação/atualização de reservas, verifica disponibilidade externa e integra pagamentos PIX.

> Em produção atual, o frontend está em Netlify e o backend no Render. `VITE_API_URL` foi definido como `https://motor-reservas-backend.onrender.com/api` e o deploy de produção está ativo.

## 🔑 Variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp backend/.env.example backend/.env
```

Exemplo de conteúdo:

```bash
PORT=4000
DATABASE_URL="file:./src/prisma/dev.db"
PIX_STUB=true
MP_ACCESS_TOKEN=
AVAILABILITY_URL=http://localhost:4100
```

- Desenvolvimento:
  - Mantenha `PIX_STUB=true` e não defina `MP_ACCESS_TOKEN`.
  - Sincronize o schema do SQLite com `cd backend && npm run prisma:push`.
  - Inicie ambos os servidores com `cd frontend && npm run dev:full`.
  - Não defina `VITE_API_URL` em dev; o Vite proxy envia `'/api'` para `http://localhost:4000`.

- Produção:
  - Defina `MP_ACCESS_TOKEN` e use `PIX_STUB=false`.
  - Configure as variáveis no Render (backend) e Netlify (frontend) conforme necessário.

## 🧰 Pré-requisitos

- Node.js 18+
- npm 9+
- Conta no Mercado Pago com token de acesso
- Acesso a serviços de deploy (Render e Netlify) para CI/CD

## 🛠️ Instalação e execução local

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

O servidor Express ficará disponível em `http://localhost:4000`. As rotas principais são:

- `GET /api/quartos` — lista quartos cadastrados no banco via Prisma.【F:backend/src/app.js†L17-L21】
- `POST /api/reservas` — cria uma reserva persistindo no SQLite e retornando os dados salvos.【F:backend/src/app.js†L23-L31】
- `POST /api/pagamento/pix` — gera um pagamento PIX no Mercado Pago e devolve o QR Code em base64.【F:backend/src/app.js†L33-L47】

### Evitando overbooking (nível banco)

- Implementado no PostgreSQL via migration: `backend/src/prisma/migrations/20251101093000_overbooking_guard/migration.sql`.
- Como funciona:
  - Coluna gerada `periodo tsrange = [checkin, checkout)`.
  - Exclusion constraint: `EXCLUDE USING gist (quartoId WITH =, periodo WITH &&) WHERE (status <> 'cancelada')`.
  - Impede sobreposição de reservas para o mesmo quarto, mesmo em corridas de escrita.
- O backend já trata esse erro e retorna 409 (conflito de reserva) quando ocorrer.

### Índices de performance

- Adicionados índices para acelerar consultas mais comuns:
  - `Reserva(quartoId, checkin, checkout)` — auxilia filtros por quarto/período.
  - `Reserva(email, criadoEm desc)` — acelera histórico por e-mail ordenado.
- Migration: `backend/src/prisma/migrations/20251101094000_reserva_indexes/migration.sql`.

O schema Prisma mantém o relacionamento entre quartos e reservas e usa SQLite por padrão.【F:backend/src/prisma/schema.prisma†L1-L27】

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O Vite servirá a aplicação em `http://localhost:5173`. A tela lista quartos, permite selecionar um quarto, cadastrar dados básicos e gerar o QR Code PIX após confirmar a reserva.【F:frontend/src/App.jsx†L5-L58】

## 🧪 Rodar testes (rápido)

Execute a suíte de testes do backend para garantir estabilidade do MVP:

```bash
cd backend && npm test
```

Notas rápidas:
- Em desenvolvimento, mantenha `PIX_STUB=true` para evitar dependência de `MP_ACCESS_TOKEN`.
- Se `PIX_STUB=false` e sem token, o endpoint `POST /api/pagamento/pix` deve retornar `503` (comportamento esperado e coberto nos testes).
- O ambiente de teste usa SQLite e sincroniza schema automaticamente; se necessário, rode `npm run prisma:push` antes.

Visualizar cobertura no CI (GitHub Actions):
- Os jobs publicam artifacts de cobertura por componente:
  - Backend: `backend-coverage` (caminho: `backend/coverage`)
  - Availability: `availability-coverage` (caminho: `services/availability/coverage`)
  - Booking: `booking-coverage` (caminho: `services/booking/coverage`)
- Para baixar e visualizar:
  - Acesse `Actions → execução do workflow → Artifacts`.
  - Baixe o artifact desejado e abra `coverage/lcov-report/index.html`.
  - Localmente, você pode rodar `npm test -- --coverage` nos diretórios correspondentes.

## 🧯 Troubleshooting

- `net::ERR_CONNECTION_REFUSED` no frontend
  - Verifique se o backend está ativo em `http://localhost:4000` (o log deve exibir "Servidor rodando em http://localhost:4000").
  - Inicie integrado com `cd frontend && npm run dev:full` para garantir proxy e ordem de inicialização.
  - Em desenvolvimento, não defina `VITE_API_URL`; o frontend usa base `'/api'` e o proxy do Vite redireciona para `http://localhost:4000`.

- Proxy do Vite não redireciona `/api`
  - Confirme o alvo em `frontend/vite.config.js` está `http://localhost:4000`.
  - Em dev, o frontend deve chamar `'/api'` (sem host/porta). Em produção, use `VITE_API_URL`.

- Prisma `P1012 Environment variable not found: DATABASE_URL`
  - Defina `DATABASE_URL="file:./src/prisma/dev.db"` em `backend/.env` (copie de `backend/.env.example`).
  - Rode `cd backend && npm run prisma:push` para sincronizar o schema com o banco SQLite.

- Erros de constraint/`P2022` ao reservar
  - Indica divergência de schema no banco de desenvolvimento. Pare os servidores e rode `npm run prisma:push` no backend.

- PIX stub vs Mercado Pago real
  - Desenvolvimento: `PIX_STUB=true` e sem `MP_ACCESS_TOKEN` ativa stub; `POST /api/pagamento/pix` retorna `qr_code_base64`, `qr_code` e `id` simulados.
  - Produção: `PIX_STUB=false` e `MP_ACCESS_TOKEN` definido.

- Testar rapidamente o backend (PowerShell)
  - Listar quartos:
    - `Invoke-RestMethod http://localhost:4000/api/quartos`
  - Checar disponibilidade:
    - `Invoke-RestMethod "http://localhost:4000/api/disponibilidade?checkin=2025-11-20&checkout=2025-11-22&guests=2"`
  - Criar reserva:
    - `"$body = @{ quartoId = 1; nomeCliente = 'Teste'; email = 'teste@exemplo.com'; checkin = ([DateTime]::Parse('2025-11-20').ToString('o')); checkout = ([DateTime]::Parse('2025-11-22').ToString('o')); guests = 2 } | ConvertTo-Json; Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/reservas -ContentType 'application/json' -Body $body"`

- Aviso de depreciação `util._extend`
  - É apenas um aviso do Node.js; não afeta a execução. Pode ser ignorado em desenvolvimento.

## ⚠️ Erros conhecidos (Prisma)

- P1012: `Environment variable not found: DATABASE_URL`
  - Causa: variável de ambiente ausente.
  - Solução: defina `DATABASE_URL="file:./src/prisma/dev.db"` em `backend/.env` e rode `cd backend && npm run prisma:push`.

- P2021: Tabela não existe
  - Causa: banco inicial sem schema ou arquivo SQLite recém-criado.
  - Solução: `cd backend && npm run prisma:push` para aplicar o schema no dev.

- P2002: Restrição de unicidade falhou
  - Causa: inserção duplicada em campo único.
  - Soluções:
    - Ajuste os dados de teste (evite duplicar campos únicos).
    - Se precisar resetar o banco de dev: pare servidores, apague `backend/src/prisma/dev.db`, e rode `npm run prisma:push`.

- P2003: Falha de chave estrangeira
  - Causa: referência para registro inexistente (ex.: `quartoId` inválido).
  - Solução: valide com `GET /api/quartos` e use um `quartoId` existente.

- P2025: Registro não encontrado
  - Causa: operação em registro inexistente (update/delete).
  - Solução: confira IDs antes de operar; garanta que o registro foi criado.

- Diagnóstico rápido
  - Inspecione dados com `cd backend && npx prisma studio`.
  - Confirme schema aplicado: `cd backend && npm run prisma:push`.
  - Verifique logs no terminal do backend (mensagens de erro detalham o endpoint e payload).

## 📦 Exemplos de payloads (rápidos)

- Criar reserva (válido)
  - Requisitos: datas em ISO (`.ToString('o')`), `quartoId` existente, `guests` não deve exceder a capacidade.
  - Exemplo (PowerShell):
    - ``
      $body = @{ quartoId = 1; nomeCliente = 'Cliente Teste'; email = 'cliente@exemplo.com'; checkin = ([DateTime]::Parse('2025-11-20').ToString('o')); checkout = ([DateTime]::Parse('2025-11-22').ToString('o')); guests = 2 } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/reservas -ContentType 'application/json' -Body $body
      ``

- Criar reserva (inválido por capacidade)
  - Excede capacidade do quarto; espera `400` e mensagem contendo "capacidade".
  - Exemplo (PowerShell):
    - ``
      $body = @{ quartoId = 1; nomeCliente = 'Capacidade Teste'; email = 'capacidade@exemplo.com'; checkin = ([DateTime]::Parse('2025-11-20').ToString('o')); checkout = ([DateTime]::Parse('2025-11-22').ToString('o')); guests = 3 } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/reservas -ContentType 'application/json' -Body $body
      ``

- Pagamento PIX (stub ativo)
  - Pré-condição: `PIX_STUB=true` no `backend/.env`.
  - Request: `POST /api/pagamento/pix` com `{ email, total }`.
  - Resposta esperada: `200` com `qr_code_base64`, `qr_code`, `id` simulados.
  - Exemplo (PowerShell):
    - ``
      $body = @{ email = 'cliente@exemplo.com'; total = 350 } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/pagamento/pix -ContentType 'application/json' -Body $body
      ``

- Pagamento PIX (sem token e stub desativado)
  - Pré-condição: `PIX_STUB=false` e sem `MP_ACCESS_TOKEN`.
  - Resposta esperada: `503` com erro de indisponibilidade.
  - Exemplo (PowerShell):
    - ``
      $body = @{ email = 'cliente@exemplo.com'; total = 100 } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/pagamento/pix -ContentType 'application/json' -Body $body
      ``

- Observações
  - `total` é calculado pelo backend a partir das datas e preço do quarto; enviar no payload é opcional.
  - Sempre valide `quartoId` com `GET /api/quartos` antes de criar reservas.

## ✅ Testes e qualidade

- `npm test` no backend executa a suíte Jest configurada em `package.json`.
- `npm run test:e2e` no frontend executa os testes de ponta a ponta via Cypress.
- Configure ferramentas adicionais (ESLint, Prettier, etc.) conforme necessário.

## 🔄 CI/CD com GitHub Actions

O pipeline em `.github/workflows/ci-cd.yml` (adicione-o se ainda não existir) deve executar testes automatizados e publicar o backend no Render e o frontend no Netlify. Para habilitar o fluxo:

1. Abra o repositório no GitHub/Codex.
2. Vá em **Settings → Secrets and variables → Actions → New repository secret**.
3. Cadastre:

   | Secret | Descrição |
   | ------ | --------- |
   | `MP_ACCESS_TOKEN` | Token da API Mercado Pago |
   | `RENDER_API_KEY` | Chave de API do Render |
   | `RENDER_BACKEND_SERVICE_ID` | ID do serviço backend no Render |
   | `NETLIFY_AUTH_TOKEN` | Token de deploy no Netlify |
   | `NETLIFY_SITE_ID` | ID do site Netlify |

Todo push na branch `main` dispara o workflow.

## 🚢 Guia de Produção

Este guia consolida variáveis, comandos e etapas para publicar um MVP simples em produção usando Render (backend e microserviços) e Netlify (frontend).

### Backend (Render)

- Serviço: `motor-reservas-backend` (root `backend`)
- Build:
  - `npm install`
  - `npx prisma generate --schema src/prisma/schema.prisma`
  - `npx prisma db push --schema src/prisma/schema.prisma`
  - `node src/prisma/seed.js` (idempotente: cria quartos se vazio)
- Start:
  - `node src/app.js`
- Variáveis obrigatórias/recomendadas:
  - `DATABASE_URL` — banco de produção (recomendado Postgres gerenciado; se SQLite, configure disco persistente no Render)
  - `PIX_STUB` — `true` no MVP para simular PIX; para PIX real: `false` + `MP_ACCESS_TOKEN`
  - `MP_ACCESS_TOKEN` — somente para PIX real
  - `AVAILABILITY_URL` — URL do microserviço de disponibilidade (opcional)
  - `CORS_ALLOWED_ORIGINS` — lista CSV de origens permitidas, ex.: `https://magnificent-moxie-8bdddd.netlify.app,https://app.seudominio.com`
  - `AVAILABILITY_TIMEOUT_MS` — timeout (ms) da consulta ao serviço externo de disponibilidade (padrão 3000)
  - `SENTRY_DSN` — opcional, ativa captura de erros no backend
  - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_RESERVAS_MAX`, `RATE_LIMIT_PIX_MAX` — limites configuráveis de rate limit

#### Nota sobre SQLite no Render (plano free)

- O sistema de arquivos é efêmero; dados em SQLite não persistem entre deploys/restarts.
- Use `DATABASE_URL="file:./src/prisma/dev.db"` apenas para testes com o PIX stub e validações rápidas.
- Em produção, utilize um Postgres gerenciado e `npx prisma migrate deploy` no build para manter migrações versionadas.

### Histórico de reservas (minimalista)

- Endpoint dedicado: `GET /api/reservas/historico?email=SEU_EMAIL`
- Retorna apenas: `id, status, total, checkin, checkout, quarto.nome`
- Exemplo:
```
curl -s "https://motor-reservas-backend.onrender.com/api/reservas/historico?email=cliente@exemplo.com"
```
– Alternativa (legado): `GET /api/reservas?email=...` (retorna todos os campos)

### Webhook Mercado Pago (PIX)

- Endpoint no backend: `POST https://motor-reservas-backend.onrender.com/api/webhooks/mercadopago`
- Configuração no painel do Mercado Pago:
  - URL de webhook: `https://motor-reservas-backend.onrender.com/api/webhooks/mercadopago`
  - Eventos: `payment`
  - Token de acesso: configure `MP_ACCESS_TOKEN` no Render
- Como funciona:
  - No front, após criar a reserva, o PIX é gerado com `external_reference` igual ao `reserva.id`.
  - O webhook recebe o `payment.id`, consulta no MP e, se `status=approved`, atualiza `Reserva.status` para `paga`.
  - Em caso de `cancelled/rejected`, atualiza para `cancelada`.
  - Campo de auditoria: `Reserva.mpPaymentId` armazena o id do pagamento no MP.

### Cartão (Mercado Pago)

- Backend: `POST /api/pagamento/cartao`
  - Body: `{ token, email, total, installments, payment_method_id, issuer_id?, reservaId? }`
  - Retorno: `{ id, status, status_detail }`
  - Usa o mesmo webhook para refletir mudanças de status; se vier aprovado, o backend já marca `status='paga'`.
- Frontend:
  - Integre o Card Payment Brick do Mercado Pago para tokenizar o cartão no navegador (public key).
  - Envie ao backend: `token`, `email`, `total`, `installments`, `payment_method_id`, `issuer_id` (se fornecido) e `reservaId`.
- Variáveis:
  - Backend: `MP_ACCESS_TOKEN`
  - Frontend: `VITE_MP_PUBLIC_KEY` (public key do Mercado Pago)

### Consultar status de pagamento

- Endpoint: `GET /api/pagamento/status/:id`
  - Retorna: `{ id, status, status_detail, reservaId }` consultando direto no Mercado Pago.
  - Útil como fallback para operação manual/diagnóstico.

### Observabilidade

- Backend: defina `SENTRY_DSN` no Render para capturar erros. O endpoint `/health` retorna `commit` (RENDER_GIT_COMMIT) para rastreio de versão.
- Frontend (opcional): configure `VITE_SENTRY_DSN` e integre no `main.jsx` caso deseje monitorar erros no navegador.

#### Teste rápido do Sentry (backend)

1. Render → backend → Environment: `ENABLE_ERROR_TEST=true` e `SENTRY_DSN=<seu DSN>` → Deploy latest.
2. Acesse `https://SEU_BACKEND.onrender.com/error-test`.
3. Verifique o evento no Sentry (após alguns segundos).
4. Volte `ENABLE_ERROR_TEST=false` e faça novo deploy.

### Frontend (Netlify)

- Base: `frontend`
- Build: `npm ci && npm run build`
- Publish: `frontend/dist`
- Variáveis:
  - `VITE_API_URL=https://motor-reservas-backend.onrender.com/api`
  - `VITE_SENTRY_DSN=` (opcional, ativa Sentry no frontend)
  - `VITE_SENTRY_TRACES_SAMPLE_RATE=0.1` (opcional, taxa de amostragem de performance)
  - `VITE_STATUS_POLL_ATTEMPTS=12` e `VITE_STATUS_POLL_INTERVAL=5000` (opcional, polling do status da reserva no modal)

### Microserviços (opcional)

- Availability (`services/availability`)
  - Build: `npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run db:seed`
  - Start: `node src/server.js`
  - Variáveis: `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`

- Booking (`services/booking`)
  - Build: `npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run db:seed`
  - Start: `node src/server.js`
  - Variáveis: `DATABASE_URL`, `AVAILABILITY_URL`, `MP_ACCESS_TOKEN` (se PIX real), `CORS_ALLOWED_ORIGINS`

### CORS

- Defina `CORS_ALLOWED_ORIGINS` como lista separada por vírgulas com os domínios do frontend (produção e, se necessário, staging):
  - Ex.: `CORS_ALLOWED_ORIGINS=https://magnificent-moxie-8bdddd.netlify.app,https://app.seudominio.com`
- Se vazio (padrão em dev), CORS permanece aberto.

### PIX

- MVP simples: `PIX_STUB=true` (sem dependência de `MP_ACCESS_TOKEN`).
- Produção real: `PIX_STUB=false` e configure `MP_ACCESS_TOKEN` (Mercado Pago).

### Validação pós-deploy

- Backend:
  - `GET https://motor-reservas-backend.onrender.com/health` → `{ status: "ok" }`
  - `GET https://motor-reservas-backend.onrender.com/api/quartos` → lista de quartos
- Frontend:
  - Aponte `VITE_API_URL` para o backend; valide fluxo de reserva até exibição do PIX (stub ou real).

### Observações importantes

- Banco de dados: em ambientes dinâmicos (Render), prefira Postgres gerenciado. Caso use SQLite, habilite volume persistente para não perder dados em restarts/realocações.
- Seeds: scripts são idempotentes — podem rodar a cada deploy sem duplicar dados.
- CI/CD: configure os secrets para deploy automático no GitHub Actions (Netlify e Render) se desejar pipeline de ponta a ponta.

## ✅ Checklist de Validação (Endpoints)

- [ ] `GET /health` retorna `{ status: "ok" }`.
- [ ] `GET /api/quartos` retorna lista não vazia (seed aplicado).
- [ ] `GET /api/disponibilidade?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=N` retorna `availableRooms` coerente.
- [ ] `POST /api/reservas` cria reserva, retorna `id` e `total`.
- [ ] `POST /api/pagamento/pix` (stub) retorna `qr_code_base64`, `qr_code` e `id`.
- [ ] `GET /api/reservas/:id` retorna a reserva criada.
- [ ] `PUT /api/reservas/:id` atualiza período/guests sem conflito.
- [ ] `DELETE /api/reservas/:id` marca como `cancelada`.
- [ ] Cenários de erro: email inválido (400), datas inválidas (400), capacidade excedida (400), conflito (409), PIX indisponível sem token e sem stub (503).

## 🧪 Smoke test (produção)

```bash
# Health
curl -s https://motor-reservas-backend.onrender.com/health

# Quartos
curl -s https://motor-reservas-backend.onrender.com/api/quartos

# Disponibilidade
curl -s "https://motor-reservas-backend.onrender.com/api/disponibilidade?checkin=2025-12-01&checkout=2025-12-03&guests=2"

# Criar reserva
curl -s -X POST https://motor-reservas-backend.onrender.com/api/reservas \
  -H 'Content-Type: application/json' \
  -d '{"quartoId":1,"nomeCliente":"Smoke Test","email":"cliente@exemplo.com","checkin":"2025-12-01T00:00:00.000Z","checkout":"2025-12-03T00:00:00.000Z","guests":2}'

# Gerar PIX (real: precisa PIX_STUB=false + MP_ACCESS_TOKEN)
curl -s -X POST https://motor-reservas-backend.onrender.com/api/pagamento/pix \
  -H 'Content-Type: application/json' \
-d '{"email":"cliente@exemplo.com","total":350,"reservaId":123}'
```

Alternativas prontas:
- Bash/Linux/macOS: `chmod +x scripts/smoke.sh && scripts/smoke.sh`
- PowerShell/Windows: `pwsh -File scripts/smoke.ps1`

## 🧰 Coleções Postman/Insomnia

- Coleção Postman: `docs/postman/MotorReservas.postman_collection.json`
  - Importe no Postman (ou no Insomnia, importando como Postman Collection v2.1).
  - Variáveis da coleção:
    - `baseUrl` (padrão: `http://localhost:4000`)
    - `apiBase` (padrão: `{{baseUrl}}/api`)
  - Para produção, ajuste `baseUrl` para a URL do backend Render, por exemplo: `https://motor-reservas-backend.onrender.com`.
 - Coleção Insomnia: `docs/insomnia/MotorReservas-insomnia.json`
   - Insomnia → Application Menu → Import/Export → Import Data → From File.
   - Ajuste as variáveis no ambiente (baseUrl, apiBase, checkin, checkout, guests, reservaId) conforme necessário.

## ☁️ Deploy manual (opcional)

### Backend — Render

- Tipo: **Web Service**
- Diretório raiz: `backend`
- Build command: `npm install && npx prisma generate --schema src/prisma/schema.prisma && npx prisma db push --schema src/prisma/schema.prisma && node src/prisma/seed.js`
- Start command: `node src/app.js`

### Frontend — Netlify

- Diretório base: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

## 📚 Documentação

- [PRD](docs/PRD.md)
- [Arquitetura DDD](docs/DDD-architecture.md)
- [Guia de QA](docs/QA-Guide.md)
- Crie outros guias (ex.: visão de dados, convenções de código) conforme o projeto evoluir.

## 🤝 Contribuição

1. Faça um fork do repositório.
2. Crie uma branch feature: `git checkout -b feature/minha-funcionalidade`.
3. Faça commit das alterações: `git commit -m "feat: minha funcionalidade"`.
4. Abra um Pull Request descrevendo as mudanças.

## 🛡️ Licença

Defina a licença do projeto (MIT, Apache-2.0, etc.) em um arquivo `LICENSE`. Caso esteja migrando para um repositório privado do Codex, siga as políticas internas da sua organização.

