# Padrões de CI/CD e Branches - revenue-OS

## 🌿 Estrutura de Branches

| Branch | Propósito | Deploy |
|--------|-----------|--------|
| `main` | Produção | Prod |
| `staging` | Homologação | Staging |
| `develop` | Desenvolvimento | Dev |
| `feature/*` | Novas funcionalidades | - |
| `hotfix/*` | Correções urgentes | - |
| `release/*` | Preparação de release | - |

### Fluxo de Branches

```
feature/SCRUM-XXX-descricao
        │
        ▼
    develop ──────► Deploy Dev
        │
        ▼
    staging ──────► Deploy Staging
        │
        ▼
     main ────────► Deploy Prod
```

### Nomenclatura de Branches

```
feature/SCRUM-123-stripe-connect-onboarding
hotfix/SCRUM-456-fix-payment-webhook
release/v1.0.0
```

---

## 🔄 Pipeline CI/CD

### Pull Request

```yaml
# Trigger: PR para develop/staging/main
1. Lint (ESLint, Prettier)
2. Type Check (TypeScript)
3. Unit Tests (Jest/Vitest)
4. Integration Tests
5. Security Scan (Snyk/npm audit)
6. Build Check
```

### Deploy Automático

| Evento | Destino | Ação |
|--------|---------|------|
| Merge → develop | Dev | Deploy automático |
| Merge → staging | Staging | Deploy automático |
| Merge → main | Prod | Deploy manual (approval) |

---

## 📝 Nomenclatura de Commits

### Formato
```
tipo(escopo): descrição curta

[corpo opcional]

[footer opcional]
```

### Tipos
| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação |
| `refactor` | Refatoração |
| `test` | Testes |
| `chore` | Manutenção |
| `perf` | Performance |

### Exemplos
```
feat(payments): add PIX payment method support
fix(split): correct percentage calculation for tiered rules
docs(api): update subscription endpoints documentation
chore(deps): upgrade stripe-node to v14
```

---

## 🏷️ Nomenclatura de PRs

### Formato
```
[SCRUM-XXX] Descrição clara da mudança
```

### Exemplos
```
[SCRUM-288] Implement Connected Account onboarding flow
[SCRUM-1620] Add Split Receivers CRUD endpoints
[SCRUM-255] Create Plans and Products service
```

---

## 🚀 Ambientes

| Ambiente | URL | Branch | Propósito |
|----------|-----|--------|-----------|
| Dev | dev.revenue-os.app | develop | Desenvolvimento |
| Staging | staging.revenue-os.app | staging | QA/Homologação |
| Prod | app.revenue-os.app | main | Produção |

---

## ✅ Checklist de PR

- [ ] Código segue os padrões do projeto
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Documentação atualizada
- [ ] Sem secrets hardcoded
- [ ] Ticket do Jira linkado
- [ ] Review solicitado

---

*Documento criado em 08/02/2026*
*Tickets: SCRUM-1600, SCRUM-1601*
