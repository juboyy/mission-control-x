# MONITORING.md - Observabilidade & Métricas

_Veja tudo, entenda tudo, aja rápido_

---

## 1. Dashboard Overview

### Status Geral

```
┌─────────────────────────────────────────────────────────────────┐
│              MISSION CONTROL - 2026-02-08 10:45 UTC             │
├─────────────────────────────────────────────────────────────────┤
│ Budget: $3.47 / $5.00 (69%) ████████████████░░░░░               │
│ Uptime: 99.97%                                                  │
│ Latência p95: 420ms                                             │
│ Error Rate: 0.2%                                                │
│ Cache Hit: 87%                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Status por Agente

```
┌─ LUFFY (Orquestrador) ──────────────────────────────────────────┐
│ Status: HEALTHY ✓                                               │
│ Modelo: Opus                                                    │
│ Gasto: $1.23 / $2.00                                            │
│ Tarefas: 3 completadas                                          │
│ Latência: 420ms                                                 │
│ Heartbeat: 10:45 UTC (agora)                                    │
└─────────────────────────────────────────────────────────────────┘

┌─ ZORO (Code Warrior) ───────────────────────────────────────────┐
│ Status: BUSY ⏳                                                  │
│ Modelo: Sonnet                                                  │
│ Gasto: $0.67 / $1.50                                            │
│ Tarefa atual: "Implement endpoint"                              │
│ Início: 10:38 UTC (7 min ago)                                   │
│ Heartbeat: 10:40 UTC                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Métricas Coletadas

### Operacionais

| Métrica | Descrição | Target |
|---------|-----------|--------|
| `uptime_percentage` | % de tempo online | > 99.9% |
| `response_latency_p50` | Latência mediana | < 200ms |
| `response_latency_p95` | Latência 95th percentile | < 500ms |
| `response_latency_p99` | Latência 99th percentile | < 2000ms |
| `error_rate` | % de requests com erro | < 1% |
| `task_completion_rate` | % tarefas completadas | > 95% |

### Custo

| Métrica | Descrição | Target |
|---------|-----------|--------|
| `daily_cost` | Gasto no dia | < $5.00 |
| `cost_per_task` | Custo médio por tarefa | < $0.05 |
| `cost_per_agent` | Gasto por agente | < budget |
| `cache_hit_rate` | Eficiência do cache | > 85% |

### Qualidade

| Métrica | Descrição | Target |
|---------|-----------|--------|
| `test_coverage` | Cobertura de testes | > 85% |
| `security_findings` | Vulnerabilidades encontradas | 0 críticas |
| `code_review_approval` | % PRs aprovados 1st try | > 80% |
| `incident_count` | Incidentes no período | < 3/mês |

---

## 3. Comandos de Monitoramento

### Status Geral

```bash
# Dashboard completo
openclaw status --verbose

# Status rápido
openclaw status

# Saúde dos agentes
openclaw agents --status
```

### Custos

```bash
# Custo hoje
openclaw costs --today

# Custo por agente
openclaw costs --by-agent

# Custo por modelo
openclaw costs --by-model

# Forecast
openclaw costs --forecast --days 7

# Custo em tempo real
openclaw costs --realtime
```

### Performance

```bash
# Métricas de latência
openclaw metrics --latency

# Throughput
openclaw metrics --throughput

# Eficiência de cache
openclaw cache --efficiency

# Todas as métricas
openclaw metrics --all
```

### Logs

```bash
# Últimas 100 entradas
openclaw logs --tail 100

# Filtrar por agente
openclaw logs --agent zoro

# Filtrar por tempo
openclaw logs --time "2026-02-08 10:00:00" --duration 30m

# Buscar padrão
openclaw logs --search "error.*timeout"

# Apenas erros
openclaw logs --error --last 24h
```

---

## 4. Alertas

### Níveis de Severidade

| Nível | Cor | Condição | Ação |
|-------|-----|----------|------|
| 🔴 CRITICAL | Vermelho | Sistema down, data loss | Acordar humano |
| 🟡 HIGH | Amarelo | Degradação severa | Investigar imediato |
| 🟠 MEDIUM | Laranja | Anomalia detectada | Investigar em 1h |
| 🟢 LOW | Verde | Informativo | Review quando possível |

### Regras de Alerta

```yaml
alerts:
  - name: high_cost_rate
    condition: "cost_rate > $0.50/min"
    severity: critical
    action: hard_stop + escalate
    
  - name: daily_budget_90
    condition: "daily_cost > $4.50"
    severity: high
    action: throttle + alert
    
  - name: high_latency
    condition: "p95_latency > 1000ms"
    severity: medium
    action: investigate
    
  - name: high_error_rate
    condition: "error_rate > 1%"
    severity: medium
    action: investigate
    
  - name: agent_hung
    condition: "no_heartbeat > 30min"
    severity: high
    action: restart_agent
    
  - name: thinking_budget
    condition: "thinking_monthly > $40"
    severity: medium
    action: review_usage
```

### Fluxo de Escalação

```
Alerta detectado
    │
    ├─ CRITICAL → Notificar João imediatamente
    │              + Hard stop do sistema
    │              + Log detalhado
    │
    ├─ HIGH → Notificar em 5 min se não resolver
    │         + Throttle automático
    │         + Iniciar investigação
    │
    ├─ MEDIUM → Log + notificar no próximo heartbeat
    │           + Agendar investigação
    │
    └─ LOW → Apenas log
             + Review no daily summary
```

---

## 5. Logs & Transcripts

### Formato JSONL

```jsonl
{"ts":"2026-02-08T10:15:00Z","agent":"zoro","model":"sonnet","tokens_in":1234,"tokens_out":567,"cost":0.004,"action":"implement_feature","status":"complete","latency_ms":320}
{"ts":"2026-02-08T10:16:00Z","agent":"zoro","model":"haiku","tokens_in":89,"tokens_out":34,"cost":0.00002,"action":"git_commit","status":"complete","latency_ms":95}
{"ts":"2026-02-08T10:17:00Z","agent":"usopp","model":"sonnet","tokens_in":2341,"tokens_out":1200,"cost":0.007,"action":"write_tests","status":"complete","latency_ms":450}
```

### Campos Registrados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ts` | ISO-8601 | Timestamp |
| `agent` | string | Nome do agente |
| `model` | string | Modelo usado |
| `tokens_in` | int | Tokens de input |
| `tokens_out` | int | Tokens de output |
| `cost` | float | Custo em $ |
| `action` | string | Ação executada |
| `status` | string | complete/error/timeout |
| `latency_ms` | int | Latência em ms |
| `error` | string? | Mensagem de erro |

### Retenção

| Tipo | Retenção | Formato |
|------|----------|---------|
| Transcripts | 90 dias | JSONL |
| Memory diária | 30 dias local, depois archive | Markdown |
| Métricas agregadas | 1 ano | JSONL |
| Alertas | 1 ano | JSONL |

---

## 6. Health Checks

### Heartbeat (a cada 15 min)

```yaml
heartbeat:
  model: haiku
  cost: ~$0.0001
  timeout: 5s
  
  checks:
    - api_key_valid
    - budget_remaining
    - no_runaway_loops
    - memory_usage < 256MB
    
  responses:
    HEALTHY: "Tudo normal"
    DEGRADED: "Funcionando com ressalvas"
    CRITICAL: "Problema sério, parar"
```

### System Health

```bash
# Check completo
openclaw health --full

# Check rápido
openclaw health

# Check de um agente específico
openclaw health --agent zoro

# Check de conectividade
openclaw health --provider antigravity
```

---

## 7. Dashboards Recomendados

### Daily Ops Dashboard

Mostrar:
- Status de todos os agentes (healthy/busy/error)
- Custo acumulado vs budget
- Latência p95 (gráfico últimas 24h)
- Taxa de erro (gráfico últimas 24h)
- Tarefas completadas vs falhadas
- Alertas ativos

### Cost Analytics Dashboard

Mostrar:
- Custo por modelo (pie chart)
- Custo por agente (bar chart)
- Custo por hora (line chart)
- Forecast para fim do dia/mês
- Cache hit rate (gauge)
- Custo vs valor entregue

### Performance Dashboard

Mostrar:
- Latência p50/p95/p99 (line charts)
- Throughput tasks/min (line chart)
- Error rate (line chart)
- Queue depth (se aplicável)
- Agent utilization (bar chart)

---

## 8. Troubleshooting Guide

### Latência Alta (>1s)

1. Verificar qual modelo está lento
2. Checar se API provider está degradado
3. Verificar tamanho do contexto (deve ser <8KB)
4. Checar rate limiting (muitos requests?)

### Custo Alto Inesperado

1. Verificar modelo routing (deve ser 80% Haiku)
2. Procurar loops infinitos nos logs
3. Checar se cache está funcionando
4. Verificar tamanho de batch

### Agent Não Responde

1. Checar último heartbeat
2. Verificar logs do agente
3. Checar se budget não estourou
4. Restart se necessário

### Cache Miss Alto (>15%)

1. Verificar se arquivos estáveis mudaram
2. Checar TTL do cache
3. Verificar se está carregando arquivos dinâmicos no cache
4. Review cache strategy

---

## 9. Runbooks

### Runbook: Cost Spike

```markdown
## Trigger: cost_rate > $0.50/min

### Immediate Actions (< 1 min)
1. [ ] Pausar agentes não-críticos
2. [ ] Identificar agente causador
3. [ ] Verificar modelo em uso

### Investigation (< 5 min)
4. [ ] Grep logs por repetições
5. [ ] Verificar task em execução
6. [ ] Checar se é loop infinito

### Resolution
7. [ ] Se loop: matar processo
8. [ ] Se modelo errado: corrigir routing
9. [ ] Se task legítima: aprovar ou cancelar

### Post-Incident
10. [ ] Documentar causa
11. [ ] Adicionar prevenção
12. [ ] Atualizar alertas se necessário
```

### Runbook: Agent Down

```markdown
## Trigger: no_heartbeat > 30min

### Immediate Actions
1. [ ] Verificar status do agente
2. [ ] Checar logs recentes
3. [ ] Verificar conectividade API

### Resolution
4. [ ] Se API down: aguardar provider
5. [ ] Se budget: reallocar ou pausar
6. [ ] Se bug: investigar e reiniciar

### Recovery
7. [ ] Restart agente
8. [ ] Verificar heartbeat voltou
9. [ ] Validar tarefas pendentes
```

---

## 10. Integrations

### Notificações

| Canal | Quando | Como |
|-------|--------|------|
| Telegram | Alertas HIGH/CRITICAL | Bot message |
| Logs | Tudo | JSONL append |
| Memory | Decisões importantes | Markdown |

### Export de Dados

```bash
# Export custos (CSV)
openclaw costs --export csv --date 2026-02-08

# Export métricas (JSON)
openclaw metrics --export json --period week

# Export logs (JSONL)
openclaw logs --export jsonl --last 24h
```

---

_Última atualização: 2026-02-08_
_Owner: Imu 🌀_
