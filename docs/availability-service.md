# Microsserviço de Disponibilidade

- Stack: `Express`, `Prisma` (SQLite), `Jest` + `Supertest`
- Pasta: `services/availability`
- Porta padrão: `4100`

## Endpoints

- `GET /health`
  - Retorna `{ status: "ok" }`

- `GET /availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=2`
  - Valida entrada (datas válidas, `checkin < checkout`, hóspedes > 0)
  - Filtra quartos com `capacity >= guests`
  - Remove quartos com reservas que sobrepõem o intervalo solicitado
  - Resposta:
    ```json
    {
      "availableRooms": [
        { "id": 1, "name": "Standard", "description": "...", "priceNight": 200, "capacity": 2 }
      ],
      "totalAvailable": 1,
      "dateRange": { "checkin": "2025-11-01", "checkout": "2025-11-03" }
    }
    ```

## Banco de Dados Temporário

- SQLite local com URL em `.env`: `DATABASE_URL="file:./dev.db"`
- Schema Prisma em `services/availability/prisma/schema.prisma`
- Seed: `npm run db:seed` (quartos padrão + uma reserva de exemplo)

## Como Rodar Localmente

1. `cd services/availability`
2. `npm install`
3. `npm run prisma:generate`
4. `npm run prisma:push`
5. `npm run db:seed`
6. `npm run dev`

Testar:
```
curl "http://localhost:4100/availability?checkin=2025-11-01&checkout=2025-11-03&guests=2"
```

## Testes

- Rodar: `npm test` (prepara `file:./test.db`, aplica schema e executa Jest)
- Cenários cobertos:
  - Parâmetros ausentes (400)
  - Sem reservas: retorna quartos disponíveis
  - Reserva sobreposta: quarto filtrado da resposta
  - Limites inclusivos (checkout <= checkin não sobrepõe)
  - Datas inválidas (400)

### Resultado (última execução)

```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        ~1.7s
```

## Próximos Passos

- Após aprovação, implementar o microsserviço de Reserva (criar/alterar/cancelar) com validações de negócio e suíte de testes.
- Só então integrar pagamentos, notificações e painel admin, mantendo serviços independentes.

