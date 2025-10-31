# Plano de Negócio — Motor de Reservas

## Visão & Objetivos
- Oferecer um motor de reservas simples e confiável para hotéis independentes.
- Reduzir dependência e comissões de OTAs com reservas diretas.
- Aumentar conversão e receita com pagamentos instantâneos (PIX) e UX clara.

## Mercado & Segmentos
- Segmentos: pousadas e hotéis independentes (10–80 quartos), hostels, flats.
- Principais dores: conciliação de disponibilidade, comissões altas, pagamento lento/complexo.
- Oportunidade: produto leve, implementação rápida, foco Brasil com PIX e LGPD.

## Proposta de Valor
- Disponibilidade em tempo real + reserva direta + PIX em minutos.
- Onboarding rápido, sem equipe técnica, documentação clara.
- Custos previsíveis e sem lock-in.

## Produto
- Núcleo: lista de quartos, consulta de disponibilidade, reserva com dados do cliente, pagamento PIX.
- Avançado: gestão de inventário, bloqueios, preços dinâmicos, cupons, cancelamentos/refunds, relatórios.
- Integrações: channel manager (futuro), gateways adicionais, CRM simples, WhatsApp Business API.

## Go-To-Market (Marketing)
- SEO: páginas de produto, docs e conteúdos sobre “reservas diretas + PIX”.
- Conteúdo: guias e estudos de caso para pousadas.
- Parcerias: associações locais, consultores de hotéis, comunidades.
- Provas: demos gravadas, trial de 14 dias, páginas de benchmark.

## Vendas
- Modelo: self-serve + assistida (demo/WhatsApp).
- Precificação: mensal por faixa de quartos (ex.: até 20/50/100) + add-ons.
- Pipeline: CRM simples, cadência de follow-up, checklists de implantação.

## Operações
- Suporte: base de conhecimento, onboarding, tempos de resposta (SLA), playbooks.
- Incidentes: status page, runbook, monitoramento 24/7.
- Migração: importação CSV, templates de dados, sanitização.

## Tecnologia
- Arquitetura: frontend React/Vite; backend Node/Express; Prisma; microserviços de disponibilidade e booking.
- Infra: Netlify (frontend), Render (backend), base de dados gerenciada.
- Observabilidade: logs centralizados, erros (Sentry), métricas (uptime, latência).
- Segurança: LGPD, práticas de segurança (tokens, backups, acesso, segredos).

## Dados & Métricas
- KPIs: reservas/mês, GMV, taxa de conversão, cancelamentos, uptime, latência API, NPS, churn, CAC, LTV.
- Analytics: funil (visita → consulta → reserva → pagamento), cohort de clientes.

## Financeiro
- Receita: assinaturas + add-ons; margem por plano.
- Custos: infra, pagamento, suporte, marketing, vendas.
- Unit Economics: CAC, LTV, payback; metas de break-even.

## Legal & Compliance
- LGPD: termos, privacidade, DPA; gestão de consentimento.
- Contratos: assinatura, cancelamento, reembolso.
- Pagamentos: aderência a reguladores e políticas do gateway.

## Roadmap (12 meses)
- Q1: núcleo (disponibilidade, reservas, PIX, onboarding + docs).
- Q2: relatórios, cupons, melhorias de UX e testes E2E.
- Q3: integrações (channel manager, novos gateways), auditoria de segurança.
- Q4: automações (mensagens), app PWA, otimização de conversão.

## Riscos & Mitigações
- Gateway PIX instável → fallback, monitoramento, suporte proativo.
- Dados sensíveis → criptografia, backups, testes de recuperação.
- Escala e concorrência → caching, filas, testes de carga, feature flags.
- Diversidade operacional de hotéis → playbooks e treinamento.

