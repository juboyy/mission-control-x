# Roadmap: Gateway de Pagamentos revenue-OS
## Período: 6 Semanas (08/02 - 22/03/2026)

---

## 📋 Sumário Executivo

Este roadmap detalha a implementação da **Estrutura de Gateway** do revenue-OS, cobrindo as EPICs fundamentais do Q1 Core Financeiro:

| EPIC | Nome | Story Points | Semanas |
|------|------|-------------|---------|
| EPIC-01 | Stripe Connect Platform | 34 SP | 1-2 |
| EPIC-02 | Plans and Products | 34 SP | 2-3 |
| EPIC-03 | Subscriptions Engine | 55 SP | 3-4 |
| EPIC-05 | Payments Processing | 34 SP | 4-5 |
| EPIC-07 | Payouts and Transfers | 34 SP | 5-6 |
| **Total** | | **191 SP** | **6 semanas** |

---

## 🗓️ Cronograma Detalhado

### Semana 1 (08-14/02): EPIC-01 - Stripe Connect Platform (Parte 1)

**Objetivo:** Estabelecer a fundação do marketplace com onboarding de vendedores.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Setup Stripe Connect Express | Franky | Conta Stripe configurada |
| Ter | Modelo de dados: connected_accounts | Zoro | Migrations PostgreSQL |
| Qua | Edge Function: /connect/onboard | Zoro | Endpoint de onboarding |
| Qui | Edge Function: /webhooks/stripe (account.*) | Zoro | Webhook handler base |
| Sex | Testes de integração | Chopper | Cobertura 80% |

**Marcos da Semana 1:**
- [ ] Vendedor consegue iniciar onboarding
- [ ] Webhook account.updated funcionando
- [ ] Status de KYC sincronizado

---

### Semana 2 (15-21/02): EPIC-01 (Parte 2) + EPIC-02 (Parte 1)

**Objetivo:** Completar Connect e iniciar catálogo de produtos.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Dashboard mínimo do vendedor | Zoro | Página de status |
| Ter | Capability monitoring | Zoro | Webhooks capability.* |
| Qua | **EPIC-02:** Modelo products/plans/prices | Zoro | Schema completo |
| Qui | Product Service: CRUD | Zoro | API endpoints |
| Sex | Sincronização Stripe Products | Zoro | Worker Celery |

**Marcos da Semana 2:**
- [ ] EPIC-01 100% funcional
- [ ] CRUD de produtos funcionando
- [ ] Sincronização bidirecional Stripe

---

### Semana 3 (22-28/02): EPIC-02 (Parte 2) + EPIC-03 (Parte 1)

**Objetivo:** Completar catálogo e iniciar subscriptions.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Versionamento de preços (grandfathering) | Zoro | Lógica de versioning |
| Ter | Cache Redis para pricing | Franky | Cache layer |
| Qua | API pública de planos | Zoro | GET /v1/products/*/plans |
| Qui | **EPIC-03:** Modelo subscriptions | Zoro | Schema + State machine |
| Sex | Subscription Service: criar assinatura | Zoro | POST /v1/subscriptions |

**Marcos da Semana 3:**
- [ ] EPIC-02 100% funcional
- [ ] Criar assinatura funcionando
- [ ] Stripe Subscription criada automaticamente

---

### Semana 4 (01-07/03): EPIC-03 (Parte 2)

**Objetivo:** Motor de subscriptions completo.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Upgrade/Downgrade com proration | Zoro | PATCH /v1/subscriptions |
| Ter | Cancelamento (imediato/fim período) | Zoro | DELETE /v1/subscriptions |
| Qua | Webhooks: invoice.paid, subscription.updated | Zoro | Handlers completos |
| Qui | State machine de status | Zoro | Transições validadas |
| Sex | Reconciliação diária | Franky | Job de sync |

**Marcos da Semana 4:**
- [ ] EPIC-03 100% funcional
- [ ] Ciclo completo: criar → upgrade → cancelar
- [ ] Status sempre sincronizado com Stripe

---

### Semana 5 (08-14/03): EPIC-05 - Payments Processing

**Objetivo:** Processar pagamentos com múltiplos métodos.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Modelo payments + Payment Service | Zoro | Schema + Service base |
| Ter | POST /payments/create-intent | Zoro | Payment Intent criado |
| Qua | POST /payments/confirm | Zoro | Confirmar com PM |
| Qui | Suporte a PIX e Boleto | Zoro | Métodos BR |
| Sex | 3D Secure handling | Zoro | SCA compliance |

**Marcos da Semana 5:**
- [ ] EPIC-05 100% funcional
- [ ] Pagamento com cartão funcionando
- [ ] PIX e Boleto funcionando
- [ ] 3D Secure tratado

---

### Semana 6 (15-21/03): EPIC-07 - Payouts + Integração Final

**Objetivo:** Payouts automáticos e validação end-to-end.

| Dia | Tarefa | Responsável | Entregável |
|-----|--------|-------------|------------|
| Seg | Modelo payouts + Payout Service | Zoro | Schema + Service |
| Ter | POST /v1/payouts (manual) | Zoro | Payout manual |
| Qua | Scheduler: payouts automáticos | Franky | Celery Beat jobs |
| Qui | Webhooks payout.* | Zoro | Status tracking |
| Sex | **Integração E2E completa** | Chopper | Fluxo completo testado |

**Marcos da Semana 6:**
- [ ] EPIC-07 100% funcional
- [ ] Payout automático funcionando
- [ ] Fluxo E2E validado

---

## 🔧 Infraestrutura Necessária

| Componente | Tecnologia | Setup |
|------------|------------|-------|
| Backend | Python/FastAPI | Railway |
| Edge Functions | Deno | Supabase |
| Database | PostgreSQL | Supabase |
| Cache | Redis | Railway |
| Queue | Celery + Redis | Railway |
| Scheduler | Celery Beat | Railway |
| Payments | Stripe Connect | API Keys |

---

## 📊 Métricas de Sucesso

### Por Semana
| Semana | Cobertura Testes | APIs Funcionais | Uptime |
|--------|-----------------|-----------------|--------|
| 1 | 60% | 3 | 99% |
| 2 | 70% | 8 | 99% |
| 3 | 75% | 14 | 99% |
| 4 | 80% | 18 | 99.5% |
| 5 | 85% | 23 | 99.5% |
| 6 | 90% | 28+ | 99.9% |

### Final
- [ ] 28+ endpoints funcionais
- [ ] 90%+ cobertura de testes
- [ ] Tempo de resposta < 200ms (p95)
- [ ] 0 erros de sync com Stripe

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Delays na aprovação Stripe | Média | Alto | Usar Test Mode até produção |
| Complexidade de proration | Alta | Médio | Testes extensivos semana 4 |
| Rate limits Stripe | Baixa | Alto | Implementar backoff exponencial |
| Webhook failures | Média | Alto | DLQ + reconciliação diária |

---

## 📅 Milestones

| Data | Milestone | Validação |
|------|-----------|-----------|
| 14/02 | MVP Connect | Vendedor faz onboarding |
| 21/02 | Catálogo Ready | Produtos/planos criados |
| 28/02 | Subscriptions MVP | Assinatura criada e cobrada |
| 07/03 | Subscriptions Full | Upgrade/downgrade funcionando |
| 14/03 | Payments Ready | Cartão/PIX/Boleto funcionando |
| 21/03 | **Gateway Complete** | Fluxo E2E: pagamento → split → payout |

---

## 🏴‍☠️ Crew Assignments

| Agente | Responsabilidades |
|--------|-------------------|
| ⚔️ Zoro | Implementação de todos os endpoints e serviços |
| 🔧 Franky | Infraestrutura, cache, workers, schedulers |
| 🩺 Chopper | Testes, QA, validação E2E |
| 📚 Robin | Documentação, specs técnicas |
| 🍊 Nami | Tracking de progresso, métricas |
| 🎯 Usopp | Comunicação Slack, standups |
| 🌀 Imu | Orquestração e decisões |

---

## 📝 Próximos Passos

1. **Validar timeline** com João
2. **Criar tickets no Jira** para cada tarefa diária
3. **Configurar ambiente** Railway + Supabase + Stripe
4. **Kick-off** segunda-feira 10/02

---

*Documento gerado por Imu 🌀 em 08/02/2026*
*Baseado na documentação do Confluence (EPICs 01, 02, 03, 05, 07)*
