# Stripe Connect - Platform Profile & Responsabilidades

## 📋 Visão Geral

Para usar Stripe Connect e criar contas conectadas (Connected Accounts), a plataforma Revenue-OS deve aceitar e cumprir um conjunto de responsabilidades definidas pelo Stripe.

**Link da configuração:** https://dashboard.stripe.com/settings/connect/platform-profile

---

## ⚠️ Responsabilidades da Plataforma

### 1. Responsabilidade por Perdas dos Vendedores

**O que significa:**
- A plataforma (Revenue-OS) é responsável por cobrir saldos negativos dos vendedores
- Stripe manterá reservas na conta da plataforma para cobrir perdas

**Implicações:**
- Precisamos ter capital disponível para cobrir chargebacks
- Necessário monitoramento de risco dos vendedores

---

### 2. Onboarding e Conformidade

**Responsabilidades:**
- ✅ Revisar cada vendedor antes de aprovar
- ✅ Garantir que não operam em categorias restritas
- ✅ Verificar se não vendem produtos proibidos

**Categorias Restritas (exemplos):**
- Drogas ilícitas
- Armas e explosivos
- Conteúdo adulto (em alguns casos)
- Jogos de azar (sem licença)
- Criptomoedas (sem regulamentação)

**Saiba mais:** https://stripe.com/docs/connect/accounts/restricted-businesses

---

### 3. Avaliação de Risco

**O que fazer:**
- ✅ Revisar status financeiro de cada vendedor
- ✅ Avaliar fatores de risco (volume, categoria, histórico)
- ✅ Determinar se a plataforma pode cobrir inadimplências

**Ferramentas:**
- Stripe Radar (detecção de fraude)
- Relatórios de risco
- Histórico de transações

---

### 4. Monitoramento e Detecção de Riscos

**Sistemas necessários:**
- ✅ Monitoramento contínuo de vendedores
- ✅ Alertas para comportamento suspeito
- ✅ Identificação de padrões de fraude

**Indicadores de risco:**
- Volume alto repentino
- Taxa de chargeback elevada (>1%)
- Disputas frequentes
- Vendas em categorias de alto risco

---

### 5. Ações para Mitigar Perdas

**Ferramentas do Stripe:**
- ✅ Account holds (pausar pagamentos)
- ✅ Payout delay (atrasar transferências)
- ✅ Reserve funds (segurar reservas)

**Princípios:**
- Minimizar perdas
- Minimizar impacto nos negócios legítimos
- Balancear segurança e experiência do usuário

---

### 6. Comunicação com Vendedores

**Quando notificar:**
- ✅ Conta pausada por risco
- ✅ Documentos adicionais necessários
- ✅ Limite de transação atingido
- ✅ Chargeback recebido

**Como notificar:**
- Email automático
- Notificação in-app
- Dashboard com status claro

---

### 7. Remediação de Vendedor

**Processo:**
1. Identificar problema (ex: documento expirado)
2. Solicitar informação adicional
3. Vendedor envia via onboarding
4. Revisar e aprovar
5. Restaurar conta a status normal

**Ferramentas:**
- Stripe Hosted Onboarding
- Embedded Components
- Dashboard customizado

---

### 8. Suporte a Consultas

**Responsabilidades:**
- ✅ Responder dúvidas sobre pagamentos
- ✅ Explicar processos de risco
- ✅ Guiar vendedores na remediação
- ✅ Fornecer documentação clara

**Canais de suporte:**
- Email
- Chat in-app
- Base de conhecimento
- FAQ

---

### 9. Conformidade Contínua

**Usando a API do Stripe:**
- ✅ Verificar requisitos pendentes (`requirements.currently_due`)
- ✅ Solicitar documentos automaticamente
- ✅ Monitorar status de verificação
- ✅ Enviar lembretes

**Exemplo de código:**
```javascript
const account = await stripe.accounts.retrieve('acct_xxx');

if (account.requirements.currently_due.length > 0) {
  // Notificar vendedor sobre pendências
  await notifyVendor({
    accountId: account.id,
    requirements: account.requirements.currently_due
  });
}
```

---

## ✅ Configuração Inicial (Passo a Passo)

### 1. Acessar Platform Profile
https://dashboard.stripe.com/settings/connect/platform-profile

### 2. Preencher Informações do Negócio
- Nome da empresa: **Vivaldi Finance**
- Tipo de negócio: **Plataforma de Receita Recorrente**
- Website: **revenue-os-sand.vercel.app** (ou domínio final)
- Email de suporte: **suporte@vivaldi.finance**

### 3. Aceitar Responsabilidades
- ✅ Marcar todas as caixas reconhecendo as responsabilidades
- ✅ Ler os termos
- ✅ Clicar em "Aceitar e Continuar"

### 4. Configurar Webhooks (se solicitado)
- URL: `https://cdqqnscgjpzitmmgyfuw.supabase.co/functions/v1/stripe-webhook`
- Eventos:
  - `account.updated`
  - `charge.dispute.created`
  - `payout.failed`
  - `payment_intent.succeeded`

---

## 🛡️ Implementação no Revenue-OS

### Detecção de Risco (Planejado)
```typescript
// Monitorar chargebacks
if (account.chargebacks / account.payments > 0.01) {
  await pauseAccount(account.id, 'high_chargeback_rate');
}

// Verificar volume suspeito
if (todayVolume > previousAverage * 3) {
  await flagForReview(account.id, 'unusual_volume');
}
```

### Remediação Automática
```typescript
// Solicitar documento quando expirado
const account = await stripe.accounts.retrieve(accountId);
if (account.requirements.currently_due.includes('individual.id_document')) {
  await createAccountLink({
    account: accountId,
    type: 'account_update',
    refresh_url: '/dashboard/connect/refresh',
    return_url: '/dashboard'
  });
}
```

---

## 📚 Referências

- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Platform Profile:** https://dashboard.stripe.com/settings/connect/platform-profile
- **Restricted Businesses:** https://stripe.com/docs/connect/accounts/restricted-businesses
- **Risk Management:** https://stripe.com/docs/connect/risk-management
- **Account Requirements:** https://stripe.com/docs/connect/account-requirements

---

## 🎯 Status Atual

- ✅ Edge Functions criadas (connect-onboard, connect-status, connect-refresh)
- ✅ Código implementado com validações de segurança
- ⏳ **Aguardando:** Configuração do Platform Profile no Stripe Dashboard
- ⏳ **Próximo:** Implementar monitoramento de risco

---

**Última atualização:** 10/02/2026 14:28 UTC  
**Responsável:** Imu 🌀
