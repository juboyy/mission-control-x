# COST_STRATEGY.md - Estratégia de Custos

_Como gastar pouco e entregar muito_

---

## 1. Filosofia de Custos

### Princípio Central

> **Opus por padrão (80%). Haiku/Sonnet para tarefas triviais.**

Com budget de $15/dia, podemos usar Opus para a maioria das tarefas, garantindo qualidade máxima. Modelos mais leves apenas quando a tarefa é genuinamente simples.

### Economia Esperada

| Abordagem | Custo Mensal | Resultado |
|-----------|--------------|-----------|
| Opus pra tudo | $450 | Qualidade máxima |
| Mix inteligente | ~$300 | Opus 80%, resto quando trivial |
| Budget disponível | $450/mês | $15/dia |

---

## 2. Hierarquia de Modelos

### Custo por 1K Tokens de Input

| Modelo | Custo | Uso | % do Budget |
|--------|-------|-----|-------------|
| Opus | $0.006 | Padrão, maioria das tarefas | 80% |
| Sonnet | $0.003 | Dev rápido, debug simples | 10% |
| Haiku | $0.00025 | Status, comandos triviais | 8% |
| Thinking | $0.008 | Design crítico, novel | 2% |

### Quando Escalar

```
START: Haiku (sempre)
    │
    ├─ Funciona? → DONE
    │
    └─ Não funciona?
         │
         ├─ É código/debug? → Sonnet
         │       │
         │       └─ Funciona? → DONE
         │
         └─ É arquitetura? → Opus
                 │
                 └─ É design crítico? → Thinking (com aprovação)
```

---

## 3. Prompt Caching

### O que Cachear (Estável)

- `SOUL.md` - Princípios operacionais
- `USER.md` - Contexto de missão
- `IDENTITY.md` - Perfil do agente
- Documentação de API
- Specs de arquitetura

### O que Não Cachear (Dinâmico)

- `memory/YYYY-MM-DD.md` - Muda todo dia
- Input do usuário
- Dados em tempo real
- Logs recentes

### Economia com Cache

```
Sem cache:
  50KB contexto × $0.003/1K × 100 requests/dia = $15/dia

Com cache (85% hit rate):
  7.5KB efetivo × $0.003/1K × 100 requests/dia = $2.25/dia

Economia: 85% ($12.75/dia)
```

---

## 4. Orçamento

### Limites Diários

| Threshold | Valor | Ação |
|-----------|-------|------|
| Normal | < $11.25 | Continuar normalmente |
| Alerta 75% | $11.25 | Log warning |
| Alerta 90% | $13.50 | Throttle agressivo |
| Hard Stop | $15.00 | Parar todas as tarefas |

### Limites Mensais

| Categoria | Limite |
|-----------|--------|
| Total | $450.00 |
| Thinking model | $90.00 (cap especial) |

### Orçamento por Agente

| Agente | Budget/Dia | Modelo Principal |
|--------|------------|------------------|
| Luffy | $2.00 | Opus |
| Zoro | $1.50 | Sonnet |
| Sanji | $1.00 | Sonnet |
| Robin | $0.80 | Opus |
| Usopp | $0.60 | Sonnet |
| Nami | $0.50 | Sonnet |
| Chopper | $0.40 | Sonnet |
| Brook | $0.40 | Sonnet |
| **Total** | **$7.20** | - |

> Nota: Total > $5 porque nem todos os agentes rodam todo dia. Budget diário coletivo é $5.

---

## 5. Métricas de Custo

### KPIs

| Métrica | Target | Bom | Ótimo |
|---------|--------|-----|-------|
| Custo/tarefa | < $0.05 | < $0.03 | < $0.01 |
| Cache hit rate | > 85% | > 90% | > 95% |
| Haiku % | > 80% | > 85% | > 90% |
| Thinking % | < 1% | < 0.5% | < 0.2% |

### Tracking

```bash
# Custo hoje
openclaw costs --today

# Custo por agente
openclaw costs --by-agent

# Custo por modelo
openclaw costs --by-model

# Forecast
openclaw costs --forecast --days 7

# Eficiência de cache
openclaw cache --efficiency
```

---

## 6. Otimizações

### Rate Limiting (Previne Spikes)

```yaml
api_calls:
  min_interval: 5 seconds  # Máx 12 calls/min
  
web_searches:
  min_interval: 10 seconds
  max_per_batch: 5
  batch_break: 2 minutes
```

### Batching (Reduz Overhead)

Agrupar tarefas similares:
```
Ruim:  3 calls separados = 3× overhead
Bom:   1 call com 3 tarefas = 1× overhead
```

### Context Pruning (Reduz Tokens)

- Carregar só 8KB por sessão
- Nunca carregar histórico completo
- Buscar memória sob demanda

### Early Exit (Evita Desperdício)

```
if task.estimated_cost > remaining_budget:
    skip_task()  # Não começar o que não pode terminar
```

---

## 7. Alertas de Custo

### Condições de Alerta

| Condição | Severidade | Ação |
|----------|------------|------|
| > $0.50/min | 🔴 Crítico | Hard stop + investigar |
| > $4.50/dia (90%) | 🟡 Alto | Throttle + alertar |
| > $3.75/dia (75%) | 🟠 Médio | Warning |
| Modelo errado | 🟢 Baixo | Log + corrigir |

### Detecção de Anomalias

```
Normal: $0.05/hora
Anômalo: $0.50/hora (10x)

Ação automática:
1. Pausar agente
2. Verificar loops
3. Alertar operador
4. Aguardar clearance
```

---

## 8. Relatórios

### Daily Summary

```markdown
# Cost Report - 2026-02-08

## Resumo
- Total gasto: $3.47
- Budget restante: $1.53
- Tarefas: 42 completadas

## Por Modelo
| Modelo | Custo | % |
|--------|-------|---|
| Haiku | $0.81 | 23% |
| Sonnet | $1.82 | 52% |
| Opus | $0.84 | 24% |
| Thinking | $0.00 | 0% |

## Por Agente
| Agente | Custo | Tarefas |
|--------|-------|---------|
| Luffy | $1.23 | 3 |
| Zoro | $0.67 | 12 |
| Sanji | $0.43 | 8 |
| ... | ... | ... |

## Eficiência
- Cache hit rate: 87%
- Custo médio/tarefa: $0.08
- Haiku usage: 78%
```

### Monthly Trend

```
Week 1: $28.50 (avg $4.07/day)
Week 2: $31.20 (avg $4.46/day)
Week 3: $26.80 (avg $3.83/day)
Week 4: $29.00 (avg $4.14/day)
─────────────────────────────
Total:  $115.50 (57.8% of $200 budget)
Forecast: $165 by month end ✓
```

---

## 9. Procedimentos de Emergência

### Se Custo Dispara (>$10/dia)

1. **PARAR** todas as tarefas não-críticas
2. **VERIFICAR** roteamento de modelo
   - Deve ser 80% Haiku
   - Se não, tem algo errado
3. **CHECAR** rate limits
   - Mínimo 5s entre calls
4. **PROCURAR** loops infinitos
   - Grep logs por repetições
5. **REDUZIR** batch sizes
6. **ALERTAR** João

### Se Thinking Explode (>$20/mês)

1. Revisar quais tarefas estão usando Thinking
2. Questionar: precisa mesmo de Thinking?
3. Considerar: Opus resolve?
4. Se necessário: aumentar cap com aprovação

---

## 10. ROI

### Custo vs Valor

```
Custo mensal do sistema: ~$150
Horas humanas equivalentes: ~200h/mês
Custo hora humano médio: $50/h
Valor humano equivalente: $10,000/mês

ROI: 66x
```

### Onde o Dinheiro Vai

```
80% → Haiku (tarefas rotineiras)
     = $0.20 × 100 tarefas = $20
     
15% → Sonnet (desenvolvimento)
     = $0.60 × 30 tarefas = $18
     
4%  → Opus (arquitetura)
     = $1.50 × 10 tarefas = $15
     
1%  → Thinking (crítico)
     = $3.00 × 3 tarefas = $9
     
─────────────────────────────
Estimativa mensal: $62 (31% do budget)
```

---

_Última atualização: 2026-02-08_
_Owner: Imu 🌀_
