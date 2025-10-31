# 1️⃣ Backend (Dev Rápido)
cd backend
npm install

# Gere Prisma (se necessário)
npx prisma generate --schema src/prisma/schema.prisma

# Suba o servidor (porta padrão em dev: 4000)
# Windows PowerShell
$env:PORT=4000; npm run dev
# Linux/macOS
PORT=4000 npm run dev

Servidor: http://localhost:4000

# 2️⃣ Frontend (Dev com Proxy)
cd ../frontend
npm install

# Não defina VITE_API_URL em dev. O frontend usa base "/api" e o proxy
# encaminha para o backend.
npm run dev

Acesse: http://localhost:5173

API (proxy dev): /api → http://localhost:4000

---

## 🔀 Execução integrada
Você também pode iniciar frontend+backend juntos:
- `cd frontend && npm run dev:full`
Isso usa o proxy do Vite para encaminhar `'/api'` ao backend em `http://localhost:4000`.

Caso altere a porta do backend, ajuste `vite.config.js` (proxy target).

## 🌐 Produção
No build/produção o proxy não existe. Defina `VITE_API_URL` apontando
para o backend publicado, por exemplo:
```
VITE_API_URL=https://api.seudominio.com/api
```
