# Arquitetura DDD — Motor Reservas

## 1. Contexto e domínios
- **Domínio Principal:** Reservas de hospedagem.
- **Subdomínios:**
  - *Catálogo*: gestão de quartos, características e disponibilidade.
  - *Reserva*: criação de reservas, cálculo de tarifas e status.
  - *Pagamento*: integração Mercado Pago (PIX) e reconciliação futura.

## 2. Camadas lógicas
- **Interface (frontend React):** fluxo do hóspede, seleção de quartos, formulário de reserva e exibição de QR Code.
- **Aplicação (Express):** coordena casos de uso, orquestra Prisma e Mercado Pago, aplica validações básicas.
- **Domínio (Prisma models/services):** entidades `Quarto` e `Reserva` mapeadas no schema, encapsulam regras primárias.
- **Infraestrutura:** Mercado Pago SDK, SQLite (via Prisma), serviços de e-mail e webhooks (futuro).

## 3. Modelagem
- `Quarto`
  - Atributos: `nome`, `descricao`, `precoNoite`, `imagens`, `capacidade`.
  - Regras: preço positivo, capacidade inteira (>0).
- `Reserva`
  - Atributos: `quartoId`, `nomeCliente`, `email`, `checkin`, `checkout`, `total`, `status`.
  - Regras: datas válidas, `checkout` > `checkin`, status padrão `pendente`.

## 4. Casos de uso (backend/src/app.js)
1. **Consultar quartos** — obtém dados via Prisma e expõe ao frontend.【F:backend/src/app.js†L17-L21】
2. **Criar reserva** — recebe payload do frontend, valida mínimas obrigatoriedades e persiste em SQLite.【F:backend/src/app.js†L23-L31】
3. **Gerar pagamento PIX** — cria cobrança usando Mercado Pago SDK e devolve QR Code ao cliente.【F:backend/src/app.js†L33-L47】

## 5. Estratégia de persistência
- **Banco padrão:** SQLite `file:./dev.db` para desenvolvimento.
- **Migrações:** gerenciadas pelo Prisma Migrate.
- **Escalada futura:** migrar para PostgreSQL na nuvem alterando `DATABASE_URL`.

## 6. Integrações externas
- **Mercado Pago:** autenticação via `MP_ACCESS_TOKEN`, uso do SDK v2 com `MercadoPagoConfig` e `Payment.create({ body })` para gerar PIX.
- **Render/Netlify:** utilizados para deploy automatizado via GitHub Actions.

## 7. Observabilidade e operações
- Logs HTTP e de erros via console (sugere-se integrar com plataforma de logs no futuro).
- Webhooks de confirmação de pagamento e notificações e-mail estão planejados para releases futuros.

## 8. Decisões futuras
- Criar camada de serviços para isolar regras de cálculo de tarifas.
- Implementar repositórios dedicados para facilitar testes unitários.
- Adicionar CQRS caso o volume de consultas cresça.
