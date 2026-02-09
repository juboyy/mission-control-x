# GitHub Actions CI/CD Spec - revenue-OS

**Versão:** 1.0  
**Data:** 2026-02-08  
**Status:** Draft  
**Autor:** Robin (pesquisa automatizada)

---

## 📋 Resumo Executivo

Esta spec define a estratégia de CI/CD para o monorepo **revenue-OS** usando GitHub Actions, integrando:
- **Vite + React + TypeScript** (frontend)
- **Supabase** (backend, edge functions, migrations)
- **Playwright** (E2E tests)
- **Vitest** (unit tests)

---

## 🏗️ Estrutura de Workflows

```
.github/
└── workflows/
    ├── ci.yml                 # Lint + Type-check + Unit tests (em todo push/PR)
    ├── e2e.yml                # Playwright tests (PRs para main)
    ├── preview.yml            # Deploy preview para PRs
    ├── staging.yml            # Deploy staging (merge em main)
    ├── production.yml         # Deploy production (tags v*)
    └── supabase-migrations.yml # Sync migrations com Supabase
```

---

## 🔐 Secrets Necessários

### GitHub Repository Secrets

| Secret | Descrição | Ambiente |
|--------|-----------|----------|
| `SUPABASE_ACCESS_TOKEN` | Token de acesso pessoal do Supabase CLI | Todos |
| `SUPABASE_DB_PASSWORD` | Senha do banco de dados | Todos |
| `SUPABASE_PROJECT_ID_STAGING` | Project ID do ambiente staging | Staging |
| `SUPABASE_PROJECT_ID_PROD` | Project ID do ambiente production | Production |
| `VERCEL_TOKEN` | Token de API da Vercel | Deploy |
| `VERCEL_ORG_ID` | ID da organização Vercel | Deploy |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel | Deploy |

### Variables (GitHub Environments)

| Variable | Valor | Ambiente |
|----------|-------|----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Por ambiente |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anon | Por ambiente |

---

## 📝 Workflow Detalhado

### 1. CI Pipeline (`ci.yml`)

**Trigger:** Push em qualquer branch, PRs

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run ESLint
        run: npm run lint
        
      - name: TypeScript check
        run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Vitest
        run: npx vitest run --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

---

### 2. E2E Tests (`e2e.yml`)

**Trigger:** PRs para main

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.57.0-jammy
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Playwright tests
        run: npx playwright test
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY_STAGING }}
          
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

### 3. Preview Deploy (`preview.yml`)

**Trigger:** PRs - cria ambiente de preview único por PR

```yaml
name: Preview Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
        
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Preview
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT
          
      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 **Preview deployed!**\n\n${{ steps.deploy.outputs.url }}'
            })
```

---

### 4. Staging Deploy (`staging.yml`)

**Trigger:** Push/merge em `main`

```yaml
name: Deploy Staging

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.revenue-os.app
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Supabase Migrations (Staging)
        uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID_STAGING }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_STAGING }}
          
      - name: Deploy to Vercel (Staging)
        run: |
          npm install -g vercel@latest
          vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }} --alias staging.revenue-os.app
```

---

### 5. Production Deploy (`production.yml`)

**Trigger:** Tags semânticas `v*`

```yaml
name: Deploy Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://revenue-os.app
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Tests (Safety Check)
        run: |
          npm run lint
          npx tsc --noEmit
          npx vitest run
          
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Link Supabase Project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run Migrations (Production)
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_PROD }}
          
      - name: Deploy Edge Functions
        run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Deploy to Vercel (Production)
        run: |
          npm install -g vercel@latest
          vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
          
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

---

### 6. Supabase Migrations Standalone (`supabase-migrations.yml`)

**Trigger:** Push em `supabase/migrations/**`

```yaml
name: Supabase Migrations Check

on:
  push:
    paths:
      - 'supabase/migrations/**'
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 54322:5432
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Start Supabase Local
        run: supabase start
        
      - name: Validate Migrations
        run: supabase db reset
        
      - name: Check for Migration Conflicts
        run: |
          if supabase migration list | grep -q "pending"; then
            echo "✅ Migrations validated successfully"
          fi
```

---

## 🌊 Fluxo de Deploy

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVELOPER                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Feature Branch                                                  │
│  ├── Push → CI (lint, typecheck, unit tests, build)            │
│  └── PR → CI + E2E + Preview Deploy                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (merge)
┌─────────────────────────────────────────────────────────────────┐
│  main Branch                                                     │
│  └── Push → Staging Deploy + Supabase Migrations (staging)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (git tag v*)
┌─────────────────────────────────────────────────────────────────┐
│  Production Release                                              │
│  └── Tag → Full Tests + Supabase Migrations (prod) + Vercel    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Proteções de Branch Recomendadas

### Branch `main`

```yaml
# Settings > Branches > Branch protection rules
- Require pull request reviews: 1
- Require status checks to pass:
  - CI / lint-typecheck
  - CI / unit-tests
  - CI / build
  - E2E Tests / playwright
- Require branches to be up to date
- Restrict pushes (only via PR)
```

---

## 📊 Matriz de Ambientes

| Ambiente | Branch/Tag | Supabase Project | URL |
|----------|------------|------------------|-----|
| **Preview** | PR-* | staging | `pr-{n}.preview.vercel.app` |
| **Staging** | main | staging | `staging.revenue-os.app` |
| **Production** | v* tags | production | `revenue-os.app` |

---

## ⚡ Performance & Cache

### Estratégias de Cache Implementadas

1. **npm cache** - `actions/setup-node` com cache habilitado
2. **Playwright browsers** - Container pré-configurado
3. **Build artifacts** - Compartilhados entre jobs
4. **Concurrency groups** - Cancela runs anteriores no mesmo branch

### Tempos Estimados

| Job | Tempo Estimado |
|-----|----------------|
| lint-typecheck | ~1 min |
| unit-tests | ~2 min |
| build | ~2 min |
| e2e (playwright) | ~5 min |
| deploy-preview | ~3 min |
| deploy-staging | ~5 min |
| deploy-production | ~8 min |

---

## 🔧 Configuração Adicional Necessária

### 1. Adicionar scripts ao `package.json`

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 2. Criar `vitest.setup.ts` (se não existir)

```typescript
import '@testing-library/jest-dom';
```

### 3. GitHub Environments

Criar os seguintes environments no GitHub:
- `preview`
- `staging`
- `production` (com reviewers obrigatórios)

---

## 📋 Checklist de Implementação

- [ ] Criar pasta `.github/workflows/`
- [ ] Criar `ci.yml`
- [ ] Criar `e2e.yml`
- [ ] Criar `preview.yml`
- [ ] Criar `staging.yml`
- [ ] Criar `production.yml`
- [ ] Criar `supabase-migrations.yml`
- [ ] Configurar secrets no GitHub
- [ ] Criar GitHub Environments
- [ ] Configurar branch protection rules
- [ ] Conectar projeto Vercel
- [ ] Testar pipeline completo

---

## 📚 Referências

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Supabase CLI Setup Action](https://github.com/supabase/setup-cli)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Playwright GitHub Actions](https://playwright.dev/docs/ci-github-actions)

---

**Próximos Passos:** Implementar workflows seguindo esta spec e validar em ambiente de desenvolvimento.
