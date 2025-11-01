$ErrorActionPreference = 'Stop'

$Base = 'https://motor-reservas-backend.onrender.com'
$Email = 'cliente@exemplo.com'
$Checkin = '2025-12-01T00:00:00.000Z'
$Checkout = '2025-12-03T00:00:00.000Z'
$QuartoId = $env:QUARTO_ID; if (-not $QuartoId) { $QuartoId = 1 }
$TotalForPix = $env:TOTAL_FOR_PIX; if (-not $TotalForPix) { $TotalForPix = 350 }

Write-Host '# Health'
Invoke-RestMethod "$Base/health" | ConvertTo-Json -Depth 5

Write-Host "`n# Quartos"
Invoke-RestMethod "$Base/api/quartos" | ConvertTo-Json -Depth 5

Write-Host "`n# Disponibilidade"
Invoke-RestMethod "$Base/api/disponibilidade?checkin=$($Checkin.Substring(0,10))&checkout=$($Checkout.Substring(0,10))&guests=2" | ConvertTo-Json -Depth 5

Write-Host "`n# Criando reserva"
$body = @{ quartoId = [int]$QuartoId; nomeCliente = 'Smoke Test'; email = $Email; checkin = $Checkin; checkout = $Checkout; guests = 2 } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "$Base/api/reservas" -ContentType 'application/json' -Body $body
$res | ConvertTo-Json -Depth 5

if ($res.id) {
  Write-Host "`n# Gerando PIX (pode requerer PIX_STUB=true ou MP_ACCESS_TOKEN)"
  $pixBody = @{ email = $Email; total = [int]$TotalForPix; reservaId = [int]$res.id } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$Base/api/pagamento/pix" -ContentType 'application/json' -Body $pixBody | ConvertTo-Json -Depth 5

  Write-Host "`n# Status da reserva"
  Invoke-RestMethod "$Base/api/reservas/$($res.id)" | ConvertTo-Json -Depth 5
} else {
  Write-Host 'Não foi possível obter o id da reserva do payload acima.'
}

