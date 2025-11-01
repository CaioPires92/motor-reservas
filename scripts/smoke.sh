#!/usr/bin/env bash
set -euo pipefail

BASE="https://motor-reservas-backend.onrender.com"
EMAIL="cliente@exemplo.com"
CHECKIN="2025-12-01T00:00:00.000Z"
CHECKOUT="2025-12-03T00:00:00.000Z"
QUARTO_ID=${QUARTO_ID:-1}
TOTAL_FOR_PIX=${TOTAL_FOR_PIX:-350}

echo "# Health" && curl -s "$BASE/health" && echo -e "\n"
echo "# Quartos" && curl -s "$BASE/api/quartos" && echo -e "\n"
echo "# Disponibilidade" && curl -s "$BASE/api/disponibilidade?checkin=${CHECKIN%%T*}&checkout=${CHECKOUT%%T*}&guests=2" && echo -e "\n"

echo "# Criando reserva"
RES=$(curl -s -X POST "$BASE/api/reservas" \
  -H 'Content-Type: application/json' \
  -d "{\"quartoId\":$QUARTO_ID,\"nomeCliente\":\"Smoke Test\",\"email\":\"$EMAIL\",\"checkin\":\"$CHECKIN\",\"checkout\":\"$CHECKOUT\",\"guests\":2}")
echo "$RES"
RID=$(printf "%s" "$RES" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)

if [ -n "${RID:-}" ]; then
  echo -e "\n# Gerando PIX (pode requerer PIX_STUB=true ou MP_ACCESS_TOKEN)"
  curl -s -X POST "$BASE/api/pagamento/pix" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"total\":$TOTAL_FOR_PIX,\"reservaId\":$RID}"
  echo -e "\n\n# Status da reserva"
  curl -s "$BASE/api/reservas/$RID" && echo -e "\n"
else
  echo "Não foi possível extrair o id da reserva do payload acima."
fi

