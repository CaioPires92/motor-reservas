# Guia de QA — Motor de Reservas

Este guia descreve cenários manuais para validar o MVP em desenvolvimento ou produção usando Postman/Insomnia ou curl.

## Pré‑requisitos

- Backend ativo (local ou Render). Defina a variável `baseUrl` nas coleções para o seu backend.
- Seed de dados aplicado (o backend já cria quartos se vazio).
- Para PIX real, use `PIX_STUB=false` e configure `MP_ACCESS_TOKEN`. Para MVP, mantenha `PIX_STUB=true`.

## Variáveis para testes (sugestão)

- checkin: `2025-11-20`
- checkout: `2025-11-22`
- guests: `2`
- email válido: `cliente@exemplo.com`

## Coleções

- Postman: `docs/postman/MotorReservas.postman_collection.json`
- Insomnia: `docs/insomnia/MotorReservas-insomnia.json`

Importe a coleção, ajuste `baseUrl` (e `apiBase` se necessário) e use os requests prontos. Cada request possui resposta esperada e erros comuns.

## Cenários de Teste

1) Healthcheck
- GET `{{baseUrl}}/health` → 200 `{ status: "ok" }`.
- Erro (simulado): se DB indisponível, espera 503 `{ status: "degraded" }`.

2) Listar quartos
- GET `{{apiBase}}/quartos` → 200 lista não vazia.
- Verifique campos: `id`, `nome`, `descricao`, `precoNoite`, `capacidade`.

3) Disponibilidade
- GET `{{apiBase}}/disponibilidade?checkin={{checkin}}&checkout={{checkout}}&guests={{guests}}` → 200 com `availableRooms` e `totalAvailable` coerentes.
- Erro 400: omitir um parâmetro (ex.: `guests`) deve retornar mensagem de parâmetros obrigatórios.

4) Criar reserva (feliz)
- POST `{{apiBase}}/reservas` body:
  - `{ "quartoId": 1, "nomeCliente": "Cliente Teste", "email": "cliente@exemplo.com", "checkin": "2025-11-20T00:00:00.000Z", "checkout": "2025-11-22T00:00:00.000Z", "guests": 2 }`
- Esperado 200 com `id`, `total`, `status: "pendente"`.

5) Criar reserva — email inválido
- Mesmo payload com `email: "invalido"` → 400 `{ error: "Email inválido" }`.

6) Criar reserva — capacidade excedida
- Usar `guests` maior que `capacidade` do quarto → 400 `{ error: "Hóspedes excedem a capacidade do quarto" }`.

7) Criar reserva — conflito
- Criar reserva A em `2025-11-20..22`.
- Tentar nova reserva para o mesmo `quartoId` com período sobreposto (ex.: `2025-11-21..23`).
- Esperado 409 `{ error: "Quarto indisponível no período solicitado" }`.

8) Obter reserva por ID
- GET `{{apiBase}}/reservas/{{reservaId}}` (use o ID criado) → 200 com dados da reserva.
- Erro 404: usar ID inexistente.

9) Atualizar reserva
- PUT `{{apiBase}}/reservas/{{reservaId}}` mudando datas (sem conflito) → 200 com dados atualizados.
- Erro 409: ajustar para datas que conflitem com outra reserva existente.

10) Cancelar reserva
- DELETE `{{apiBase}}/reservas/{{reservaId}}` → 200 com `status: "cancelada"`.
- Idempotência/erro: cancelar novamente → 400 `{ error: "Reserva já cancelada" }`.

11) Pagamento PIX
- POST `{{apiBase}}/pagamento/pix` com `{ email: "cliente@exemplo.com", total: 350 }`.
- Com `PIX_STUB=true` → 200 com `qr_code_base64`, `qr_code`, `id` (stub).
- Sem stub e sem token (`PIX_STUB=false` e sem `MP_ACCESS_TOKEN`) → 503.
- Erro 400: email ou total inválido.

## Dicas rápidas

- Em produção, restrinja CORS com `CORS_ALLOWED_ORIGINS` aos domínios do frontend.
- Para reproduzir conflito de disponibilidade de forma determinística, use sempre o mesmo `quartoId` com intervalos sobrepostos.
- Mantenha logs do Render abertos durante os testes para inspecionar erros do servidor.

## Opcional: curl

```bash
curl -s {{baseUrl}}/health
curl -s {{apiBase}}/quartos
curl -s "{{apiBase}}/disponibilidade?checkin={{checkin}}&checkout={{checkout}}&guests={{guests}}"
curl -s -X POST {{apiBase}}/reservas -H 'Content-Type: application/json' \
  -d '{"quartoId":1,"nomeCliente":"Cliente Teste","email":"cliente@exemplo.com","checkin":"2025-11-20T00:00:00.000Z","checkout":"2025-11-22T00:00:00.000Z","guests":2}'
curl -s -X POST {{apiBase}}/pagamento/pix -H 'Content-Type: application/json' \
  -d '{"email":"cliente@exemplo.com","total":350}'
```

