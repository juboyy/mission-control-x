# MISSION_CONTROL.md - Guia Completo do Sistema Multi-Agente

_Versão condensada e operacional do Mission Control Comprehensive_

---

## 1. Visão Geral

### O Problema

Sistemas de IA tradicionais enfrentam três armadilhas:

1. **Monolítico:** Um modelo caro pra tudo → $1500+/mês
2. **Fragmentado:** Múltiplos sistemas sem coordenação → caos
3. **Local:** Infraestrutura própria → falsa economia

### A Solução: Equipe Chapéus de Palha

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
│              (Memória Compartilhada + Orquestração)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────────────┐
    │                      │                              │
┌───▼────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ LUFFY  │ │ NAMI │ │ ZORO │ │SANJI │ │ROBIN │ │USOPP │ │CHOPPER│ │BROOK │
│Captain │ │Reqts │ │ Code │ │ API  │ │Research│ │ QA  │ │Debug │ │DevOps│
└────────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

**Cada agente é:**
- Especializado em um domínio
- Otimizado em custo (modelo apropriado)
- Autônomo mas coordenado
- Observável (decisões logadas)
- Racionado (orçamento individual)

---

## 2. Arquitetura

### Fluxo de Execução

```
Usuario → Canal (Telegram) → Gateway (OpenClaw) → Lane Queue
    → Agent Runner → Agentic Loop (Claude) → Response → Usuario
                                    ↓
                           Logging (JSONL + Memory)
```

### Janela de Contexto (8KB)

```
┌─────────────────────────────────────────┐
│ CACHED (sem custo após primeira vez)    │
│ • SOUL.md (2KB)                         │
│ • USER.md (1KB)                         │
│ • IDENTITY.md (1KB)                     │
│                               Total: 4KB │
├─────────────────────────────────────────┤
│ DINÂMICO (pago por sessão)              │
│ • memory/HOJE.md (3KB)                  │
│ • Input do usuário (0.5KB)              │
│ • Contexto da tarefa (0.5KB)            │
│                               Total: 4KB │
├─────────────────────────────────────────┤
│ NUNCA CARREGAR                          │
│ ✗ Arquivos de archive                   │
│ ✗ Histórico completo                    │
│ ✗ Logs brutos                           │
│ ✗ Documentação externa                  │
└─────────────────────────────────────────┘
```

### Hierarquia de Modelos

| Tier | Modelo | Custo/1K | Latência | Quando Usar |
|------|--------|----------|----------|-------------|
| 4 | Haiku | $0.00025 | <100ms | 80% das tarefas (padrão) |
| 3 | Sonnet | $0.003 | <300ms | Implementação, debug |
| 2 | Opus | $0.006 | <800ms | Arquitetura, estratégia |
| 1 | Thinking | $0.008 | <1200ms | Design crítico, algoritmos novos |

---

## 3. A Equipe

### Luffy - Capitão Orquestrador
- **Papel:** Coordenação multi-agente, decisões estratégicas
- **Modelo:** Opus (primário), Thinking (decisões críticas)
- **Orçamento:** $2.00/dia
- **Autoridade:** Decisões até $0.50 autônomas, acima consulta equipe

### Nami - Requisitos & Produto
- **Papel:** Entender requisitos, prevenir scope creep
- **Modelo:** Sonnet (primário), Opus (análise complexa)
- **Orçamento:** $0.50/dia
- **Entrega:** Specs claros com critérios de aceitação

### Zoro - Code Warrior
- **Papel:** Implementação, arquitetura de componentes
- **Modelo:** Sonnet (primário), Thinking (arquitetura nova)
- **Orçamento:** $1.50/dia
- **Padrões:** TDD, >85% coverage, OWASP validado

### Sanji - Backend & APIs
- **Papel:** Design de APIs REST/GraphQL, serviços backend
- **Modelo:** Sonnet (primário), Opus (design de API)
- **Orçamento:** $1.00/dia
- **Padrões:** OpenAPI, p95 <200ms, versionamento

### Robin - Pesquisa & RAG
- **Papel:** Research profundo, síntese de conhecimento
- **Modelo:** Opus (primário), Thinking (análise novel)
- **Orçamento:** $0.80/dia
- **Metodologia:** Decomposição → Fontes → Síntese → Validação

### Usopp - QA & Testes
- **Papel:** Estratégia de testes, automação
- **Modelo:** Sonnet (primário), Haiku (testes rotina)
- **Orçamento:** $0.60/dia
- **Cobertura:** Unit, integration, e2e, security, performance

### Chopper - Debug & Troubleshooting
- **Papel:** Root cause analysis, debugging produção
- **Modelo:** Sonnet (primário), Thinking (bugs complexos)
- **Orçamento:** $0.40/dia
- **Métricas:** MTTR <30min, postmortems completos

### Brook - Integração & DevOps
- **Papel:** CI/CD, infraestrutura, integrações
- **Modelo:** Sonnet (primário), Opus (arquitetura)
- **Orçamento:** $0.40/dia
- **SLA:** 99.9% uptime, deploy <15min

---

## 4. Sistema de Memória

### Níveis de Memória

```
Level 0 - IMEDIATO (cached toda sessão)
└─ SOUL.md, USER.md, IDENTITY.md

Level 1 - HOJE (carregado sob demanda)
└─ memory/2026-02-08.md

Level 2 - RECENTE (buscado sob demanda)
└─ memory/2026-02-07.md ... (últimos 7 dias)

Level 3 - ARQUIVO (buscado raramente)
└─ memory/archive/2026-01/ ...
```

### Formato do Memory Diário

```markdown
# Memory Log - YYYY-MM-DD (Dia)

## Morning Status
- Sistema: Healthy ✓
- Orçamento: $X.XX disponível
- Prioridade: [do USER.md]

## Tarefas por Agente
### Nami (Requisitos)
- Tarefa 1: Status, Custo, Output

## Decisões Tomadas
1. **Decisão X:** Contexto, Raciocínio, Custo, Aprovação

## Bloqueios & Escalações
- [RESOLVIDO] / [ATIVO] / [ESCALADO]

## Métricas (Fim do Dia)
- Custo total: $X.XX de $5.00
- Tarefas completadas: N
- Cache hit rate: X%

## Aprendizados & Próximos Passos
```

---

## 5. Comunicação Entre Agentes

### Formato de Mensagem

```json
{
  "message_id": "msg-YYYYMMDD-NNN",
  "timestamp": "ISO-8601",
  "from_agent": "nami",
  "to_agent": "zoro",
  "priority": "high",
  "subject": "Spec: Nova Feature",
  "task_description": "...",
  "acceptance_criteria": ["..."],
  "budget_allocated": "$0.40",
  "deadline": "ISO-8601"
}
```

### Ledger de Decisões

Toda decisão significativa é logada com:
- Propositor e timestamp
- Modelo usado e custo
- Contexto e opções consideradas
- Raciocínio (do extended thinking se aplicável)
- Aprovação e stakeholders
- Status de implementação
- Avaliação de risco

---

## 6. Monitoramento

### Dashboard de Agentes

```
┌─ LUFFY (Orquestrador) ─────────────────────┐
│ Status: HEALTHY ✓                          │
│ Modelo: Opus                               │
│ Gasto hoje: $1.23 / $2.00                  │
│ Tarefas: 3 completadas                     │
│ Latência média: 420ms                      │
│ Último heartbeat: agora                    │
└────────────────────────────────────────────┘
```

### Métricas de Custo

- Custo por modelo (Thinking/Opus/Sonnet/Haiku)
- Custo por agente
- Forecast até fim do dia
- Histórico últimos 30 dias

### Métricas de Performance

- Latência: p50, p95, p99
- Throughput: tasks/minuto
- Taxa de erro: <1% target
- Cache hit rate: >85% target

### Alertas

| Nível | Condição | Ação |
|-------|----------|------|
| 🔴 CRÍTICO | Custo >$5/dia, uptime <95% | Hard stop, escalar |
| 🟡 ALTO | Custo >$4, latência >1s | Throttle, investigar |
| 🟠 MÉDIO | Custo >$3, latência >500ms | Monitorar |
| 🟢 BAIXO | Normal | Continuar |

---

## 7. Lifecycle do Agente

### Ciclo de 15 Minutos

```
00:00 - SPAWN
└─ Instanciar, carregar contexto, status READY

00:01-10:00 - EXECUTE
└─ Processar tarefas, fazer API calls, status BUSY

10:00 - CHECK-IN
└─ Heartbeat, verificar orçamento, status HEALTHY/SICK

12:00-14:00 - MEMORY UPDATE
└─ Atualizar memory/HOJE.md

15:00 - DISPERSE
└─ Liberar contexto, salvar estado, aguardar
```

### Heartbeat

- **Modelo:** Haiku (mais barato)
- **Frequência:** A cada 15 minutos
- **Custo:** ~$0.0001/heartbeat
- **Propósito:** Detectar loops, verificar API, checar orçamento

---

## 8. Exemplo End-to-End

**Cenário:** "Relatórios demoram 20s pra carregar"

```
10:00 - Usuário reporta problema
10:01 - Luffy recebe, classifica HIGH priority, monta plano
10:02 - Nami clarifica: qual relatório? qual comportamento?
10:08 - Robin pesquisa: encontra precedente similar (N+1 queries)
10:15 - Chopper investiga: confirma N+1 (12 queries ao invés de 1)
10:25 - Zoro + Sanji implementam: SQL JOIN + HTTP caching
10:45 - Usopp valida: testes de performance passando
10:55 - Zoro pede review, Sanji aprova
11:00 - Brook deploya: canary → full rollout
11:15 - Luffy reporta ao usuário: 20s → 200ms (100x melhoria)

Custo total: $0.40 (7 agentes, 1 hora)
```

---

## 9. Padrões Replicáveis

### Padrão 1: Equipe Especialista
- Roles narrow e deep (não generalistas)
- Handoffs claros entre agentes
- Scaling independente

### Padrão 2: Memória como Ledger
- Append-only (JSONL) para imutabilidade
- Markdown searchable para humanos
- Headers estruturados para indexação

### Padrão 3: Cost-First
- Orçamento diário como hard stop
- Monitoramento real-time
- Atribuição por agente/tarefa

### Padrão 4: Contexto Mínimo
- Carregar só o necessário
- Cache conteúdo estável
- Buscar histórico sob demanda

### Padrão 5: Heartbeat como Válvula
- Health checks regulares
- Ping simples (não análise completa)
- Loops param em 15min máximo

---

## 10. Métricas de Sucesso

### Eficiência de Custo
- Gasto mensal: <$200
- Custo por tarefa: <$0.05 (média)
- Cache hit rate: >85%

### Qualidade
- Cobertura de testes: >85%
- Findings de segurança: 0 críticos
- Latência p95: <500ms

### Execução
- Taxa de conclusão: >95%
- Taxa de escalação humana: <5%
- Documentação: 100% completa

---

_Documento vivo. Atualizar conforme o sistema evolui._

_Última atualização: 2026-02-08_
_Owner: Imu 🌀_
