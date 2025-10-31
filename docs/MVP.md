# MVP — Motor de Reservas

Este guia descreve o mínimo necessário para executar localmente, validar os fluxos principais e preparar deploy rápido.

## Funcionalidades essenciais

- Listar quartos (`GET /api/quartos`).
- Consultar disponibilidade (`GET /api/disponibilidade`).
- Criar reserva (`POST /api/reservas`).
- Gerar pagamento PIX (stub em dev) (`POST /api/pagamento/pix`).

## Pré‑requisitos

- Node.js 18+ e npm 9+.
- SQLite local (criado automaticamente pelo Prisma).

## Configuração rápida

1) Backend `.env` (arquivo `backend/.env`):

```
PORT=4000
DATABASE_URL="file:./src/prisma/dev.db"
PIX_STUB=true
MP_ACCESS_TOKEN=
AVAILABILITY_URL=http://localhost:4100
```

2) Sincronizar schema do banco:

```
cd backend
npm install
npm run prisma:push
```

3) Subir ambiente integrado (frontend + backend):

```
cd frontend
npm install
npm run dev:full
```

- Frontend: `http://localhost:5174/` (porta pode variar).
- Backend: `http://localhost:4000`.

Observação: em desenvolvimento, o frontend usa base `'/api'` via proxy do Vite. Não é necessário definir `VITE_API_URL`.

## Validação dos fluxos

Execute em outro terminal (PowerShell):

- Quartos

```
Invoke-RestMethod http://localhost:4000/api/quartos
```

- Disponibilidade

```
Invoke-RestMethod "http://localhost:4000/api/disponibilidade?checkin=2025-11-20&checkout=2025-11-22&guests=2"
```

- Criar reserva

```
$body = @{ quartoId = 3; nomeCliente = 'Cliente Teste'; email = 'cliente@exemplo.com'; checkin = ([DateTime]::Parse('2025-11-20').ToString('o')); checkout = ([DateTime]::Parse('2025-11-22').ToString('o')); guests = 2 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/reservas -ContentType 'application/json' -Body $body
```

- PIX (stub)

```
$pix = @{ email = 'cliente@exemplo.com'; total = 1200 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/pagamento/pix -ContentType 'application/json' -Body $pix
```

Resultado esperado: QR code (base64), código `qr_code` e `id` stub.

## Deploy rápido

- Backend (Render):
  - Root: `backend`
  - Build: `npm install && npx prisma generate`
  - Start: `node src/app.js`
  - Definir variáveis: `DATABASE_URL`, `PIX_STUB`, `MP_ACCESS_TOKEN`, `AVAILABILITY_URL`.

- Frontend (Netlify):
  - Base: `frontend`
  - Build: `npm run build`
  - Publish: `dist`
  - Definir `VITE_API_URL` apontando para o backend em produção.

## Notas de produção

- `PIX_STUB=false` e `MP_ACCESS_TOKEN` obrigatório para transações reais.
- `AVAILABILITY_URL` deve apontar para o microserviço de disponibilidade em produção.
- Adicionar regras de CORS conforme domínios (ex.: `CORS_ALLOWED_ORIGINS`).

## Troubleshooting

- Porta 4000 em uso: encerrar processo (`taskkill /PID <pid> /F`) e reiniciar `npm run dev:full`.
- `DATABASE_URL` inválido: utilizar formato `file:./src/prisma/dev.db` para SQLite.
- Proxy Vite não funciona: garantir que o backend está em `4000`; o frontend chama `'/api'` em dev.

