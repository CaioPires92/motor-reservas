# Booking Service (Microsserviço de Reservas)

Este serviço gerencia reservas de quartos, com validação de conflitos de período (check-in/checkout) e operações de criação, alteração e cancelamento.

## Stack
• Express
• Prisma (SQLite)
• Jest + Supertest

## Estrutura
• `services/booking/src/app.js` — rotas e lógica de reservas
• `services/booking/src/server.js` — inicialização do servidor
• `services/booking/prisma/schema.prisma` — modelos `Room` e `Reservation`
• `services/booking/prisma/seed.js` — dados iniciais de quartos
• `services/booking/tests/booking.test.js` — testes de API
• `services/booking/.env` — `PORT` e `DATABASE_URL`

## Porta padrão
• `PORT=4200`

## Endpoints
• `POST /reservas` — cria reserva, valida sobreposição; retorna `201` ou `409`
• `PUT /reservas/:id` — altera datas/status; valida conflito; `200` ou `409`
• `DELETE /reservas/:id` — cancela reserva; impede cancelamentos duplicados; `200` ou `400`

## Banco de dados
• `DATABASE_URL` usa SQLite (`file:./dev.db` por padrão)
• Testes isolam banco definindo `DATABASE_URL="file:./test.db"` antes dos testes
• `AVAILABILITY_URL` aponta para o serviço de disponibilidade (ex.: `http://localhost:4100`)

## Como rodar localmente
1. `cd services/booking`
2. `npm install`
3. `npm run prisma:generate && npm run prisma:push`
4. `npm run db:seed`
5. `npm run dev` — servidor em `http://localhost:4200`

## Testes
• Comando: `npm test`
• Fluxos cobertos:
  - Criar reserva disponível (`201`)
  - Rejeitar criação em período conflitado (`409`)
  - Modificar reserva sem conflito (`200`)
  - Rejeitar modificação para período conflitado (`409`)
  - Cancelar reserva e impedir cancelamento duplicado (`200`/`400`)
• Resultado atual: 1 suíte, 5 testes — todos passando

## Contrato de dados
• `Room`: `id`, `name`, `description`, `priceNight`, `capacity`
• `Reservation`: `id`, `roomId`, `checkin` (DateTime), `checkout` (DateTime), `status` (default `pendente`), `nomeCliente`, `email`, `createdAt`

## Observações de implementação
• Validação de sobreposição: busca reservas da mesma sala com intervalos que cruzam `checkin`/`checkout` e bloqueia (`409`) quando houver.
• Isolamento de testes: o `DATABASE_URL` é ajustado via `cross-env` para `test.db` antes de `prisma db push`, garantindo base separada.
• Orquestração com disponibilidade: antes de criar/alterar reserva, o serviço chama `GET {AVAILABILITY_URL}/availability` para validar, filtrando se o `roomId` está disponível. Em caso de indisponibilidade, retorna `409`.
