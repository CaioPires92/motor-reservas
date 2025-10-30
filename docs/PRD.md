# Produto: Motor Reservas

## 1. Visão geral
- **Objetivo:** permitir que hotéis cadastrem quartos, recebam reservas online e processem pagamentos via PIX.
- **Escopo inicial:** disponibilizar catálogo de quartos, fluxo de reserva com cálculo de valor total e integração PIX Mercado Pago.
- **Stakeholders:** equipe de operações do hotel, equipe financeira, hóspede final, squad de engenharia.

## 2. Requisitos funcionais
1. **Listagem de quartos**: o sistema deve exibir nome, descrição, preço por noite e capacidade dos quartos.
2. **Disponibilidade**: a API deve permitir consultar quartos disponíveis para um intervalo de datas (MVP considera todos disponíveis).
3. **Criar reserva**: hospede informa dados pessoais, datas e quarto; sistema grava reserva e retorna confirmação.
4. **Pagamento PIX**: ao confirmar a reserva, o sistema gera QR Code PIX via Mercado Pago.
5. **Notificações**: enviar e-mail de confirmação (fase futura).

## 3. Requisitos não funcionais
- **Performance:** primeira resposta de API < 1s em 95% dos casos.
- **Segurança:** tokens Mercado Pago e URL de banco devem estar protegidos em variáveis de ambiente.
- **Confiabilidade:** registrar logs de erro e acompanhar status dos pagamentos.
- **Escalabilidade:** arquitetura separa frontend e backend permitindo deploy independente.

## 4. Jornada do usuário
1. Usuário acessa landing page com lista de quartos.
2. Seleciona um quarto, informa dados e datas.
3. Sistema calcula total e solicita geração de PIX.
4. Usuário efetua pagamento via QR Code.
5. (Futuro) Reserva muda para status "confirmada" após webhook Mercado Pago.

## 5. Métricas de sucesso
- Taxa de conversão de reservas concluidas ≥ 60%.
- Tempo médio para geração do PIX < 5s.
- Índice de disponibilidade da aplicação ≥ 99%.

## 6. Roadmap
- **Fase 1:** MVP web com geração PIX e painel básico (concluído).
- **Fase 2:** Webhooks de confirmação, painel administrativo, e-mails.
- **Fase 3:** Aplicativo mobile, suporte a múltiplas moedas e integrações PMS.
