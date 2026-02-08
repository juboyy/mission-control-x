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

## Nomenclatura
- Branches: `feature/SCRUM-XXX-descricao`
- Commits: `tipo(escopo): descrição`
- PRs: `[SCRUM-XXX] Descrição`

## Tipos de Commit
- feat, fix, docs, style, refactor, test, chore, perf

## Pipeline
1. PR → Lint + Tests
2. Merge develop → Deploy Dev
3. Merge staging → Deploy Staging
4. Merge main → Deploy Prod (manual approval)

*Tickets: SCRUM-1600, SCRUM-1601*
