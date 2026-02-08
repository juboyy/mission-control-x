# Sprint 1 - Plano de Execução

## 🎯 Objetivo

**Implementar a fundação do Gateway de Pagamentos:**
- Stripe Connect funcionando
- Onboarding de vendedores
- Catálogo de produtos e planos
- Sistema de Split multi-nível operacional

---

## 📅 Período

- **Início:** 10/02/2026 (Segunda)
- **Fim:** 21/02/2026 (Sexta)
- **Duração:** 2 semanas

---

## 🎫 Tickets da Sprint

### Semana 1: Stripe Connect + Split

| Ticket | Descrição | SP | Owner |
|--------|-----------|-----|-------|
| SCRUM-288 | Onboarding de Connected Account | 8 | Zoro |
| SCRUM-291 | Dashboard de Contas Conectadas | 5 | Zoro |
| SCRUM-1620 | Split Receivers (Multi-nível) | 5 | Zoro |
| **Subtotal** | | **18** | |

### Semana 2: Produtos + Split Engine

| Ticket | Descrição | SP | Owner |
|--------|-----------|-----|-------|
| SCRUM-255 | EPIC-02: Plans and Products | 13 | Zoro |
| SCRUM-1621 | Motor de Execução de Split | 8 | Zoro |
| **Subtotal** | | **21** | |

### **Total Sprint:** 39 Story Points

---

## 🔗 Dependências

```
SCRUM-288 (Connect) ─────┐
                         ├──► SCRUM-1620 (Receivers)
SCRUM-1619 (Rules) ✅ ───┘
                                    │
                                    ▼
                         SCRUM-1621 (Split Engine)
                                    │
                                    ▼
                         SCRUM-255 (Products) ──► SCRUM-256 (Subscriptions)
```

---

## ✅ Critérios de Aceite

### SCRUM-288: Onboarding Connected Account
- [ ] Endpoint POST /connect/onboard funciona
- [ ] Redirect para Stripe Express funciona
- [ ] Webhook account.updated processa corretamente
- [ ] Status KYC sincronizado no banco

### SCRUM-291: Dashboard Contas Conectadas
- [ ] Lista contas conectadas
- [ ] Mostra status de cada conta
- [ ] Filtros por status funcionam

### SCRUM-1620: Split Receivers
- [ ] CRUD de receivers funciona
- [ ] Suporta 3 níveis (platform, tenant, sub_merchant)
- [ ] Validação de percentuais (soma = 100%)

### SCRUM-255: Plans and Products
- [ ] CRUD de produtos funciona
- [ ] Sincronização com Stripe Products
- [ ] Versionamento de preços implementado

### SCRUM-1621: Motor de Split
- [ ] Processa payment.succeeded
- [ ] Calcula distribuição correta
- [ ] Cria Stripe Transfers
- [ ] Registra execução no banco

---

## ⚠️ Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rate limit Stripe | Média | Médio | Usar Test Mode |
| Complexidade Split | Alta | Alto | Testes extensivos |
| Dependência de KYC | Média | Médio | Contas teste prontas |

---

## 📊 Métricas de Sucesso

- [ ] 100% dos tickets concluídos
- [ ] Cobertura de testes > 80%
- [ ] Zero bugs críticos
- [ ] Documentação atualizada

---

## 📝 DoD (Definition of Done)

- Código revisado e aprovado
- Testes unitários passando
- Testes de integração passando
- Documentação atualizada
- Deploy em staging
- Ticket movido para "Concluído"

---

*Documento criado em 08/02/2026*
*Ticket: SCRUM-1607*
