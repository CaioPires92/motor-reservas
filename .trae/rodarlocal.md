# 1️⃣ Backend (Dev Rápido)
cd backend
npm install

# Gere Prisma (se necessário)
npx prisma generate --schema src/prisma/schema.prisma

# Suba o servidor (porta recomendada em dev: 4001)
# Windows PowerShell
$env:PORT=4001; npm run dev
# Linux/macOS
PORT=4001 npm run dev

Servidor: http://localhost:4001

# 2️⃣ Frontend (Dev com Proxy)
cd ../frontend
npm install

# Não defina VITE_API_URL em dev. O frontend usa base "/api" e o proxy
# encaminha para o backend.
npm run dev

Acesse: http://localhost:5173

API (proxy dev): /api → http://localhost:4001

---

## 🔀 Alternativa Convencional
Se preferir usar a porta 4000, libere-a e ajuste o proxy:
- Vite `vite.config.js` → `target: 'http://localhost:4000'`
- Backend: `PORT=4000 npm run dev`

## 🌐 Produção
No build/produção o proxy não existe. Defina `VITE_API_URL` apontando
para o backend publicado, por exemplo:
```
VITE_API_URL=https://api.seudominio.com/api
```
