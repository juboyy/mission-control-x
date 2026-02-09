# Sistema de Crons - revenue-OS

## 🎯 Filosofia

**Automação inteligente com governança humana:**
- Crons executam trabalho alinhado ao roadmap
- Nada é implementado sem estar em Sprint ativa
- Documentação sempre sincronizada
- João audita antes de ações externas

---

## 📋 Crons Propostos (Refinados)

### 1. 🌅 MORNING BRIEF (08:30 SP)
**Mantém:** tech-news-daily
**Refina:** Adicionar status da Sprint

```
- Clima Marília
- Top 3 notícias tech
- Status Sprint: X/Y tickets, Z% progresso
- Tickets bloqueados (se houver)
- Agenda do dia (se integrar calendário)
```

---

### 2. 📋 SLACK DIGEST (4h)
**Mantém:** Como está
**Adiciona:** Correlação com tickets existentes

```
- Sintetiza solicitações
- Sugere ticket relacionado se existir
- Prioriza por impacto
- Só para João auditar
```

---

### 3. ⚙️ WORK CYCLE (2h, horário comercial)
**Substitui:** always-creating
**Refina:** Só trabalha em tickets da Sprint ATIVA

```
REGRAS:
1. SÓ pega tickets da Sprint ativa (state=active)
2. Respeita prioridade do Jira
3. Máximo 2 agentes paralelos
4. Atualiza ticket com progresso
5. NÃO cria tickets novos
6. NÃO mexe em backlog
```

---

### 4. 🔍 PR REVIEW (12h)
**Substitui:** code-review diário
**Refina:** Review profundo, não só listagem

```
- Analisa PRs abertos
- Sugere aprovação ou mudanças
- Comenta no GitHub
- Notifica autor se necessário
```

---

### 5. 📚 DOC SYNC (após cada PR merged)
**Substitui:** doc-sync a cada 12h
**Refina:** Event-driven, não time-based

```
Trigger: PR merged no main
Ações:
1. Atualiza CHANGELOG
2. Sincroniza Confluence se EPIC afetada
3. Atualiza README se API mudou
4. Notifica #mission-control
```

---

### 6. 🎯 SPRINT GUARDIAN (diário 07:00 SP)
**NOVO:** Garante alinhamento Sprint ↔ Roadmap

```
1. Verifica se Sprint está no prazo
2. Calcula velocidade vs meta
3. Identifica riscos de atraso
4. Sugere rebalanceamento se necessário
5. Atualiza Confluence com status
```

---

### 7. 🗺️ ROADMAP SYNC (semanal, Seg 08:00)
**NOVO:** Sincroniza roadmap com realidade

```
1. Compara roadmap planejado vs executado
2. Ajusta datas se necessário
3. Atualiza Confluence com progresso
4. Alerta sobre desvios > 20%
```

---

### 8. 💰 COST MONITOR (diário 23:00)
**NOVO:** Monitora custos de API

```
1. Calcula custo do dia
2. Compara com budget ($15/dia)
3. Alerta se > 80% do limite
4. Sugere otimizações
```

---

### 9. 🧹 CLEANUP (semanal, Dom 03:00)
**NOVO:** Manutenção automática

```
1. Arquiva sessões antigas (> 7 dias)
2. Limpa logs grandes
3. Remove branches merged
4. Atualiza dependências (npm audit)
```

---

## 📊 Matriz de Crons Refinada

| Cron | Frequência | Trigger | Owner | Destino |
|------|------------|---------|-------|---------|
| morning-brief | 08:30 SP | Cron | Sanji | Telegram |
| slack-digest | 4h | Cron | Nami | Telegram (João) |
| work-cycle | 2h (09-18h) | Cron | Imu | Jira/GitHub |
| pr-review | 12h | Cron | Zoro | GitHub |
| doc-sync | PR merged | Event | Robin | Confluence |
| sprint-guardian | 07:00 SP | Cron | Nami | Telegram + Slack |
| roadmap-sync | Seg 08:00 | Cron | Robin | Confluence |
| daily-wrap | 18:00 SP | Cron | Robin | Slack |
| week-preview | Dom 20:00 | Cron | Imu | Telegram |
| sprint-planning | Seg 09:00 | Cron | Nami | Slack |
| sprint-report | Sex 17:00 | Cron | Nami | Slack |
| cost-monitor | 23:00 SP | Cron | Franky | Telegram |
| infra-check | 6h | Cron | Franky | Slack |
| cleanup | Dom 03:00 | Cron | Franky | Logs |

---

## 🚫 Remover/Desabilitar

| Cron | Motivo |
|------|--------|
| always-creating | Substituído por work-cycle (mais controlado) |
| code-review diário | Substituído por pr-review (mais profundo) |
| sla-alert | Absorvido pelo sprint-guardian |
| daily-standup | Redundante com morning-brief |

---

## 🔗 Alinhamento com Governança

```
ROADMAP (Confluence)
    ↓
SPRINT (Jira)
    ↓
work-cycle (só Sprint ativa)
    ↓
PR → doc-sync (atualiza docs)
    ↓
sprint-guardian (monitora progresso)
    ↓
João audita (slack-digest)
```

**Nada sai do ciclo sem estar no roadmap → sprint → ticket.**
