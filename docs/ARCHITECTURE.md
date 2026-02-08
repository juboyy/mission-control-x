# ARCHITECTURE.md - Arquitetura Técnica

_Como o sistema funciona por baixo dos panos_

---

## 1. Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE DO USUÁRIO                     │
│            (Telegram, Slack, Discord, CLI, Web)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    CHANNEL ADAPTER                          │
│           Normaliza input para schema OpenClaw              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    GATEWAY SERVER                           │
│    • Coordenação de sessão                                  │
│    • Autenticação                                           │
│    • Rate limiting                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    LANE QUEUE                               │
│         Execução serial (FIFO, previne race conditions)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    AGENT RUNNER                             │
│    • Carrega contexto (SOUL.md + USER.md + IDENTITY.md)     │
│    • Busca memória se necessário                            │
│    • Seleciona modelo (Haiku → Sonnet → Opus → Thinking)    │
│    • Monta prompt                                           │
│    • Faz API call                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    AGENTIC LOOP                             │
│    • Claude planeja ação                                    │
│    • Chama tool (file read, bash, etc.)                     │
│    • Recebe resultado                                       │
│    • Itera até completar                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                RESPONSE PATH & LOGGING                      │
│    • Monta resposta                                         │
│    • Log para JSONL transcript                              │
│    • Atualiza memory/YYYY-MM-DD.md                          │
│    • Stream para usuário                                    │
│    • Atualiza custos                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack de Providers

### AntiGravity (LLM Provider)
- Gerencia disponibilidade de modelos
- Rate limiting nativo
- Contagem de tokens
- Cálculo de custos
- Autenticação de API

### OpenClaw (Orchestration)
- Gerenciamento de sessão
- Roteamento de modelo
- Enforcement de orçamento
- Lane queuing
- Knowledge assembly
- Agentic loop
- Transcript logging

---

## 3. Gerenciamento de Contexto

### Janela de 8KB

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW (8KB)                      │
│                                                              │
│  ┌────────────────────────────────────┐                      │
│  │ CACHED (sem custo após 1ª vez)     │                      │
│  │ • SOUL.md (2KB)                    │ ─┐                   │
│  │ • USER.md (1KB)                    │  │                   │
│  │ • IDENTITY.md (1KB)                │  ├─ 4KB pinned       │
│  │ • [Parâmetros de modelo cached]    │  │                   │
│  └────────────────────────────────────┘ ─┘                   │
│                                                              │
│  ┌────────────────────────────────────┐                      │
│  │ DINÂMICO (pago por sessão)         │                      │
│  │ • memory/2026-02-08.md (3KB)       │ ┌─ 4KB dynamic       │
│  │ • Input do usuário (0.5KB)         │ │                    │
│  │ • Contexto da tarefa (0.5KB)       │ └─────────────────── │
│  └────────────────────────────────────┘                      │
│                                                              │
│  NUNCA CARREGAR:                                             │
│  ✗ Arquivos de archive                                       │
│  ✗ Histórico completo de sessão                              │
│  ✗ Logs brutos                                               │
│  ✗ Documentação externa (referenciar por URL)                │
└──────────────────────────────────────────────────────────────┘
```

### Por que isso importa para custo

| Abordagem | Contexto/Request | Custo/Request |
|-----------|------------------|---------------|
| Típica | 50KB | $0.0003 |
| Nossa | 4KB pago | $0.00006 |
| Com 85% cache hit | ~0.6KB efetivo | $0.00001 |

**Resultado:** 90-97% de redução de custo

---

## 4. Hierarquia de Modelos

```
┌─────────────────────────────────────────────────────────────┐
│                    MODEL SELECTION                          │
│                                                             │
│  COMPLEXIDADE    MODELO      CUSTO/1K   LATÊNCIA   % USO    │
│  ─────────────────────────────────────────────────────────  │
│  Simples/Rotina  Haiku      $0.00025   <100ms     80%       │
│  Moderada/Dev    Sonnet     $0.003     <300ms     15%       │
│  Complexa/Arch   Opus       $0.006     <800ms      4%       │
│  Crítica/Novel   Thinking   $0.008     <1200ms     1%       │
│                                                             │
│  DEFAULT: Sempre Haiku, escalar só quando necessário        │
└─────────────────────────────────────────────────────────────┘
```

### Quando usar cada modelo

**Haiku (80% das tarefas)**
- Status checks
- File operations
- Comandos simples
- Log processing
- Routing decisions

**Sonnet (15% das tarefas)**
- Code implementation
- Code review
- Debugging
- Feature development
- Security analysis

**Opus (4% das tarefas)**
- Architecture decisions
- Strategic planning
- Complex research
- Cost-benefit analysis
- Multi-service coordination

**Thinking (1% das tarefas, cap $50/mês)**
- Feature design from scratch
- Novel algorithm development
- Security threat modeling
- Critical architectural decisions
- Complex problem solving

---

## 5. Sistema de Memória

### Níveis de Memória

```
Level 0 - IMEDIATO (cached toda sessão)
├── SOUL.md (princípios)
├── USER.md (missão)
└── IDENTITY.md (perfil)

Level 1 - HOJE (carregado sob demanda)
└── memory/2026-02-08.md

Level 2 - RECENTE (buscado via memory_search)
├── memory/2026-02-07.md
├── memory/2026-02-06.md
└── ... (últimos 7 dias)

Level 3 - ARQUIVO (buscado raramente)
└── memory/archive/
    ├── 2026-01/
    └── 2025-12/
```

### Por que arquivos, não banco de dados?

| Aspecto | Arquivos | Banco de Dados |
|---------|----------|----------------|
| Custo | Zero | $20+/mês |
| Transparência | Human-readable | Opaco |
| Simplicidade | git-friendly | Migrações complexas |
| Searchability | grep + semantic | Queries SQL |
| Lock contention | JSONL append-only | Possível |
| Auditabilidade | Plain text | Requires tooling |

---

## 6. Rate Limiting & Budget

### Rate Limits (Enforced)

```yaml
api_calls:
  min_interval: 5 seconds
  
web_searches:
  min_interval: 10 seconds
  max_per_batch: 5
  batch_break: 2 minutes
  
on_429_error:
  action: STOP
  wait: 5 minutes
  retry: once
  
on_3_consecutive_failures:
  action: escalate_to_human
```

### Budget Enforcement

```yaml
daily:
  limit: $5.00
  alert_75_percent: $3.75
  alert_90_percent: $4.50
  hard_stop: 100%

monthly:
  limit: $200.00
  thinking_model_cap: $50.00
```

---

## 7. Heartbeat System

### Ciclo de 15 Minutos

```
:00 - SPAWN
     └─ Instanciar agente
     └─ Carregar SOUL.md, USER.md, IDENTITY.md
     └─ Status: READY

:01-:10 - EXECUTE
     └─ Processar tarefas da queue
     └─ Fazer API calls (com rate limits)
     └─ Status: BUSY

:10 - CHECK-IN (Heartbeat)
     └─ Modelo: Haiku
     └─ Prompt: "Healthy? HEALTHY/DEGRADED/CRITICAL"
     └─ Custo: ~$0.0001
     └─ Verificar: API válida? Budget ok? Loops?

:12-:14 - MEMORY UPDATE
     └─ Append em memory/HOJE.md
     └─ Tarefas, decisões, custos

:15 - DISPERSE
     └─ Liberar contexto
     └─ Salvar estado
     └─ Aguardar próximo ciclo
```

### Por que heartbeat é crítico

- Detecta agentes runaway (infinite loops)
- Verifica se API key ainda válida
- Checa se budget não foi excedido
- Coleta métricas (cost, latency, task count)
- Permite graceful shutdown se necessário

---

## 8. Logging & Observability

### JSONL Transcript

```jsonl
{"ts":"2026-02-08T10:15:00Z","agent":"zoro","model":"sonnet","tokens":1234,"cost":0.004,"action":"implement_feature","status":"complete"}
{"ts":"2026-02-08T10:16:00Z","agent":"zoro","model":"haiku","tokens":89,"cost":0.00002,"action":"commit","status":"complete"}
{"ts":"2026-02-08T10:17:00Z","agent":"usopp","model":"sonnet","tokens":2341,"cost":0.007,"action":"write_tests","status":"complete"}
```

### Métricas Coletadas

```yaml
operational:
  - uptime_percentage
  - response_latency_p95
  - error_rate
  - task_completion_rate

cost:
  - daily_cost
  - cost_per_task
  - cost_per_agent
  - cache_efficiency_ratio

quality:
  - test_coverage_percent
  - security_findings_count
  - code_review_approval_rate
  - incident_count
```

---

## 9. Security Model

### Princípios

- **Encryption in transit:** TLS 1.3 obrigatório
- **Encryption at rest:** AES-256-GCM para dados sensíveis
- **No PII in logs:** Nunca logar dados pessoais
- **Credential isolation:** API keys apenas em environment variables
- **Audit trail:** Todas as ações administrativas logadas

### Fluxo de Autenticação

```
User → Channel (Telegram) → Bot Token validates → 
OpenClaw Gateway → User ID in allowlist? →
Session created → Agent authorized
```

---

## 10. Escalabilidade

### Horizontal Scaling

```
Load Balancer
    ├── OpenClaw Instance 1 (agent pool 1-4)
    ├── OpenClaw Instance 2 (agent pool 5-8)
    └── OpenClaw Instance N (agent pool N*4)

Shared State:
    └── Memory files (NFS/S3)
    └── JSONL logs (append-only, no conflicts)
```

### Limites Atuais

| Recurso | Limite | Nota |
|---------|--------|------|
| Agentes simultâneos | 8 | Pode escalar horizontalmente |
| Tasks/minuto | ~5 | Rate limited by design |
| Contexto/sessão | 8KB | Hard constraint |
| Budget/dia | $5.00 | Soft limit, configurável |

---

_Última atualização: 2026-02-08_
_Owner: Imu 🌀_
