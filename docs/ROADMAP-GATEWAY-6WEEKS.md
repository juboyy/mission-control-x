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
| **Split** | Split Rules & Execution | 21 SP | 2-4 |
| **Total** | | **212 SP** | **6 semanas** |

---

## 💰 Sistema de Split de Pagamentos

O Split é o coração do modelo de marketplace, permitindo dividir pagamentos entre a plataforma e vendedores.

### Tickets de Split (US-10.x)

| Ticket | Descrição | Status | Semana |
|--------|-----------|--------|--------|
| SCRUM-1619 | Modelo de Dados e CRUD de Split Rules | ✅ CONCLUÍDO | - |
| SCRUM-1620 | Gestão de Split Receivers (Destinatários) | Backlog | 2 |
| SCRUM-1621 | Motor de Execução de Split (Orquestrador) | Backlog | 3 |
| SCRUM-1622 | Split em Assinaturas Recorrentes | Backlog | 4 |
| SCRUM-1623 | Dashboard de Reconciliação de Split | Backlog | 5 |

### Arquitetura de Split

```
┌──────────────────────────────────────────────────────────────┐
│                    PAGAMENTO RECEBIDO                        │
│                      (Payment Intent)                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    SPLIT RULES ENGINE                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Regras Fixas    │  │ Regras %       │  │ Regras       │ │
│  │ (R$ 5.00/tx)    │  │ (15% platform) │  │ Condicionais │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Platform │   │ Vendor A │   │ Vendor B │
       │   15%    │   │   70%    │   │   15%    │
       └──────────┘   └──────────┘   └──────────┘
              │              │              │
              ▼              ▼              ▼
       ┌──────────────────────────────────────┐
       │         STRIPE TRANSFERS             │
       │  (para Connected Accounts)           │
       └──────────────────────────────────────┘
```

### Modelo de Dados de Split

```sql
-- Regras de Split (já implementado em SCRUM-1619)
CREATE TABLE split_rules (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    rule_type VARCHAR NOT NULL, -- 'percentage', 'fixed', 'tiered'
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    conditions JSONB, -- condições de aplicação
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Destinatários do Split
CREATE TABLE split_receivers (
    id UUID PRIMARY KEY,
    split_rule_id UUID REFERENCES split_rules(id),
    receiver_type VARCHAR NOT NULL, -- 'platform', 'vendor', 'partner'
    connected_account_id VARCHAR, -- Stripe Connected Account
    percentage DECIMAL(5,2), -- para regras de %
    fixed_amount INTEGER, -- para regras fixas (centavos)
    description TEXT
);

-- Execuções de Split
CREATE TABLE split_executions (
    id UUID PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    split_rule_id UUID REFERENCES split_rules(id),
    total_amount INTEGER NOT NULL,
    platform_amount INTEGER,
    status VARCHAR, -- 'pending', 'executed', 'failed'
    stripe_transfer_ids TEXT[], -- IDs dos transfers criados
    executed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Distribuição por Receiver
CREATE TABLE split_distributions (
    id UUID PRIMARY KEY,
    execution_id UUID REFERENCES split_executions(id),
    receiver_id UUID REFERENCES split_receivers(id),
    amount INTEGER NOT NULL,
    stripe_transfer_id VARCHAR,
    status VARCHAR
);
```

### Tipos de Regras de Split

| Tipo | Exemplo | Uso |
|------|---------|-----|
| **Percentage** | 15% plataforma, 85% vendedor | Modelo padrão de marketplace |
| **Fixed** | R$ 2.00 por transação | Taxa fixa de processamento |
| **Tiered** | 10% até R$ 1k, 8% acima | Volume-based pricing |
| **Conditional** | Se categoria = "premium", 20% | Regras por produto/categoria |
| **Composite** | R$ 1.00 + 10% | Combinação fixa + percentual |

### Fluxo de Execução do Split

```
1. Pagamento confirmado (payment_intent.succeeded)
   │
2. Webhook Handler identifica o pagamento
   │
3. Split Rules Engine:
   ├── Busca regras aplicáveis (por produto, tenant, categoria)
   ├── Ordena por prioridade
   ├── Calcula distribuição
   │
4. Para cada receiver:
   ├── Calcula amount
   ├── Cria Stripe Transfer
   ├── Registra em split_distributions
   │
5. Atualiza status da execução
   │
6. Notifica stakeholders (webhook/email)
```

### Integração com Subscriptions (SCRUM-1622)

Para assinaturas recorrentes, o split é aplicado automaticamente a cada fatura:

```
subscription.invoice.paid
    │
    ▼
Buscar split_rule vinculada ao plano
    │
    ▼
Executar split com amount da invoice
    │
    ▼
Criar transfers para cada receiver
```

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

### Semana 2 (15-21/02): EPIC-01 (Parte 2) + EPIC-02 (Parte 1) + Split Receivers

**Objetivo:** Completar Connect, iniciar catálogo e gestão de receivers.

| Dia | Tarefa | Ticket | Responsável |
|-----|--------|--------|-------------|
| Seg | Dashboard mínimo do vendedor | EPIC-01 | Zoro |
| Ter | Capability monitoring (webhooks) | EPIC-01 | Zoro |
| Qua | **Split Receivers:** CRUD de destinatários | SCRUM-1620 | Zoro |
| Qui | **EPIC-02:** Modelo products/plans/prices | SCRUM-255 | Zoro |
| Sex | Product Service: CRUD + Sync Stripe | SCRUM-255 | Zoro |

**Marcos da Semana 2:**
- [ ] EPIC-01 100% funcional
- [ ] Split Receivers funcionando (SCRUM-1620)
- [ ] CRUD de produtos funcionando

---

### Semana 3 (22-28/02): EPIC-02 (Parte 2) + EPIC-03 (Parte 1) + Split Engine

**Objetivo:** Completar catálogo, iniciar subscriptions e motor de split.

| Dia | Tarefa | Ticket | Responsável |
|-----|--------|--------|-------------|
| Seg | Versionamento de preços (grandfathering) | SCRUM-255 | Zoro |
| Ter | Cache Redis para pricing | SCRUM-255 | Franky |
| Qua | **Split Engine:** Motor de execução | SCRUM-1621 | Zoro |
| Qui | **EPIC-03:** Modelo subscriptions | SCRUM-256 | Zoro |
| Sex | Subscription Service: criar assinatura | SCRUM-256 | Zoro |

**Marcos da Semana 3:**
- [ ] EPIC-02 100% funcional
- [ ] Motor de Split funcionando (SCRUM-1621)
- [ ] Criar assinatura funcionando

---

### Semana 4 (01-07/03): EPIC-03 (Parte 2) + Split Recorrente

**Objetivo:** Motor de subscriptions completo com split automático.

| Dia | Tarefa | Ticket | Responsável |
|-----|--------|--------|-------------|
| Seg | Upgrade/Downgrade com proration | SCRUM-256 | Zoro |
| Ter | Cancelamento (imediato/fim período) | SCRUM-256 | Zoro |
| Qua | **Split Recorrente:** Integrar split com invoices | SCRUM-1622 | Zoro |
| Qui | Webhooks: invoice.paid → trigger split | SCRUM-1622 | Zoro |
| Sex | Reconciliação diária + testes E2E | SCRUM-256 | Chopper |

**Marcos da Semana 4:**
- [ ] EPIC-03 100% funcional
- [ ] Split em assinaturas funcionando (SCRUM-1622)
- [ ] Ciclo completo: criar → cobrar → split

---

### Semana 5 (08-14/03): EPIC-05 - Payments + Split Dashboard

**Objetivo:** Processar pagamentos com múltiplos métodos e dashboard de reconciliação.

| Dia | Tarefa | Ticket | Responsável |
|-----|--------|--------|-------------|
| Seg | Modelo payments + Payment Service | SCRUM-258 | Zoro |
| Ter | POST /payments/create-intent + confirm | SCRUM-258 | Zoro |
| Qua | Suporte a PIX e Boleto | SCRUM-258 | Zoro |
| Qui | **Split Dashboard:** UI de reconciliação | SCRUM-1623 | Zoro |
| Sex | Dashboard: métricas, filtros, exports | SCRUM-1623 | Zoro |

**Marcos da Semana 5:**
- [ ] EPIC-05 100% funcional
- [ ] PIX e Boleto funcionando
- [ ] Dashboard de Split (SCRUM-1623)

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
