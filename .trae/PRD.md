# 🏨 PRD — Hotel Reserva Automática com Pagamento PIX e Cartão

## 📖 Visão Geral
Sistema de reservas de hotel 100% online com checkout automático via PIX e cartão, integrando painel administrativo, confirmação de reserva e controle financeiro.

## 🎯 Objetivo
Eliminar o processo manual de reservas e oferecer experiência fluida e segura de pagamento digital para hóspedes.

## 👥 Stakeholders
- **Hóspedes:** realizam reservas e pagamentos.
- **Administração do hotel:** gerencia quartos, reservas e relatórios.
- **Equipe de suporte:** acompanha confirmações e falhas de pagamento.
- **Parceiros (OTA):** integrações futuras com Booking/Airbnb.

---

## ⚙️ Escopo do Produto

### Funcionalidades Principais
1. **Catálogo de quartos**
   - Listagem, imagens, descrição, preço, capacidade.
2. **Reserva**
   - Escolha de datas, cálculo de valor e envio de confirmação.
3. **Pagamentos**
   - PIX (QR Code), cartão (parcelado via MercadoPago).
4. **Painel Admin**
   - CRUD de quartos e reservas, filtro por status.
5. **E-mails**
   - Envio automático de confirmação e comprovante.
6. **Dashboard**
   - Métricas de ocupação, faturamento e histórico de reservas.

---

## 🚀 Critérios de Aceitação
| Caso | Critério de sucesso |
|------|---------------------|
| Reserva | Criada e salva no banco |
| Pagamento PIX | QR Code válido e confirmado |
| Cartão | Transação aprovada e vinculada à reserva |
| Admin | Pode editar/quitar reservas |
| API | Responde em menos de 300ms |
| Testes | 100% endpoints cobertos |

---

## 📊 Métricas de Sucesso
- 90% das reservas feitas digitalmente
- 0 falhas em geração de PIX
- Redução de 70% nas reservas manuais
- Tempo médio de checkout: < 1 minuto

---

## 🧭 Roadmap (MVP → V3)
| Sprint | Entregas |
|--------|-----------|
| **1** | CRUD de quartos e reservas |
| **2** | PIX (MercadoPago) |
| **3** | Cartão e parcelamento |
| **4** | Painel Admin |
| **5** | Dashboard e relatórios |
| **6** | Multi-hotel + API pública |

---

## 🧩 Integrações Externas
- **MercadoPago API:** pagamentos PIX e cartão.
- **Render:** backend Node/Express.
- **Netlify:** frontend React.
- **Prisma ORM:** banco de dados SQLite (ou PostgreSQL).

---

## 📱 Fluxo de Usuário
1. Usuário acessa o site e escolhe quarto.
2. Informa nome, e-mail e datas.
3. Gera QR Code PIX ou paga com cartão.
4. Recebe e-mail de confirmação.
5. Reserva aparece no painel administrativo.

---

## 🔒 Requisitos Não Funcionais
- **Segurança:** HTTPS obrigatório.
- **Escalabilidade:** suporte a múltiplos hotéis.
- **Performance:** resposta < 500ms.
- **Testabilidade:** cobertura Jest + Cypress.
- **Disponibilidade:** uptime 99.9%.
