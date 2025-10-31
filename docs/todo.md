# To-Do — Plano de Negócio & Produto

Atualize marcando `[x]` ao concluir. Itens concluídos nesta sessão já estão marcados.

## Produto
- [ ] Definir MVP detalhado (fluxo completo de reserva e pagamento).
- [ ] Desenhar telas de gestão (inventário, bloqueios, preços).
- [ ] Especificar relatórios essenciais (reservas, receita, cancelamentos).

## Mercado & Marketing
- [ ] Produzir landing page com proposta de valor e demo.
- [ ] Conteúdo: 3 artigos sobre “reservas diretas + PIX”.
- [ ] Parcerias: 5 contatos com associações locais.
- [ ] Trial: definir parâmetros e mensagens de onboarding.

## Vendas
- [ ] Tabelas de preço por faixa de quartos.
- [ ] Playbook de vendas (qualificação, demo, follow-up).
- [ ] CRM simples e funil (qualificado → proposta → fechado).

## Operações
- [ ] Base de conhecimento e FAQs (onboarding, uso básico).
- [ ] SLA de suporte e status page públicos.
- [ ] Processo de migração (modelo CSV + checklist).

## Tecnologia (Dev/Infra)
- [x] Proxy dev `/api` para backend em `4001` (Vite).
- [x] Ajustar `frontend/.env.example` (sem `VITE_API_URL` em dev).
- [x] UI: spinner de carregamento e badges de disponibilidade.
- [x] Documentar fluxo Dev Rápido em `.trae/rodarlocal.md`.
- [x] Reiniciar dev server e validar preview.
- [x] Commit e push para `origin/main`.
- [ ] Testes E2E com Cypress para disponibilidade e reserva.
- [ ] Logger central e captura de erros (Sentry).
- [ ] Health-check endpoints e monitoramento básico.
- [ ] Alinhar versão Node no CI/CD e ativar cache de build.
- [ ] Configurar segredos de deploy (Netlify/Render), `VITE_API_URL` produção.
- [ ] Token do Mercado Pago (`MP_ACCESS_TOKEN`) seguro e fallback.

## Dados & Métricas
- [ ] Instrumentar funil de conversão (visita → consulta → reserva).
- [ ] Painel com KPIs chave (reservas, GMV, conversão, cancelamentos).

## Financeiro
- [ ] Projeções 12 meses (receita, custos, margem).
- [ ] CAC/LTV e metas de payback por canal.

## Legal & Compliance
- [ ] Termos de uso e política de privacidade (LGPD).
- [ ] DPA e mecanismos de consentimento.

## Roadmap
- [ ] Planejamento detalhado por trimestre com épicos e milestones.
- [ ] Critérios de aceitação para features núcleo.

