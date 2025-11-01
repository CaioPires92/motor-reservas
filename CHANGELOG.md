# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.
Formato inspirado em Keep a Changelog e SemVer.

## [Unreleased]
### Adicionado
- CHANGELOG inicial com escopo e entradas recentes.

### Alterado
- `VITE_API_URL` no Netlify para `https://motor-reservas-backend.onrender.com/api`.

### Deploy
- Redeploy de produção com `--prod --build` incorporando `VITE_API_URL`.

### Verificado
- `GET /api/quartos` retorna lista de quartos válida.

### Documentação
- README atualizado com resumo de backend, frontend, infra e microsserviços.

## [2025-11-01]
### Documentação
- `docs: resumo das implementações (backend, frontend, infra e microsserviços)`.

## [2025-10-31]
### Manutenção
- `chore: commit das alterações pendentes (frontend, backend e infra)` com ajustes em:
  - Frontend: Tailwind, novos componentes, utilitários, `App.jsx`, `main.jsx`.
  - Backend: Prisma `schema.prisma`, `seed.js`, `app.js`, scripts.
  - Infra: `render.yaml`, workflow `prod-smoke.yml`.
