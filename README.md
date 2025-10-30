# 🏨 Motor Reservas — Plataforma de reservas com PIX e CI/CD

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

## 🔑 Variáveis de ambiente

Crie `backend/.env` com:

```bash
MP_ACCESS_TOKEN=SEU_TOKEN_MERCADOPAGO
DATABASE_URL="file:./dev.db"
```

No Render defina os mesmos valores em **Environment Variables**. O frontend não requer `.env` por padrão, mas você pode definir `VITE_API_URL` caso deseje configurar a URL da API dinamicamente.

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

O schema Prisma mantém o relacionamento entre quartos e reservas e usa SQLite por padrão.【F:backend/src/prisma/schema.prisma†L1-L27】

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O Vite servirá a aplicação em `http://localhost:5173`. A tela lista quartos, permite selecionar um quarto, cadastrar dados básicos e gerar o QR Code PIX após confirmar a reserva.【F:frontend/src/App.jsx†L5-L58】

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

## ☁️ Deploy manual (opcional)

### Backend — Render

- Tipo: **Web Service**
- Diretório raiz: `backend`
- Build command: `npm install && npx prisma generate`
- Start command: `node src/app.js`

### Frontend — Netlify

- Diretório base: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

## 📚 Documentação

- [PRD](docs/PRD.md)
- [Arquitetura DDD](docs/DDD-architecture.md)
- Crie outros guias (ex.: visão de dados, convenções de código) conforme o projeto evoluir.

## 🤝 Contribuição

1. Faça um fork do repositório.
2. Crie uma branch feature: `git checkout -b feature/minha-funcionalidade`.
3. Faça commit das alterações: `git commit -m "feat: minha funcionalidade"`.
4. Abra um Pull Request descrevendo as mudanças.

## 🛡️ Licença

Defina a licença do projeto (MIT, Apache-2.0, etc.) em um arquivo `LICENSE`. Caso esteja migrando para um repositório privado do Codex, siga as políticas internas da sua organização.

