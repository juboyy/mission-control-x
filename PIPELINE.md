# Pipeline Lean - Mission Control X

## Filosofia
**Menos crons, mais impacto.** Cada execução deve gerar valor real.

## Estrutura: 4 Crons Essenciais

### 1. 🌅 Morning Brief (08:30 SP / 11:30 UTC)
**Diário** - Prepara o dia

```
1. Clima Marília
2. Tech news (top 3)
3. Agenda do dia (calendário)
4. Tickets urgentes (Jira bloqueados/atrasados)
5. Status rápido de infra
```
Entrega: Telegram para João

---

### 2. ⚙️ Work Cycle (a cada 2h, horário comercial)
**Durante o dia** - Executa trabalho real

```
1. Verifica Jira (tickets prontos para dev)
2. Se há trabalho:
   → Delega para agente apropriado
   → Zoro (impl), Robin (doc), Franky (infra), Chopper (debug)
3. Monitora agentes ativos
4. Consolida resultados no #crew-dev
```
Entrega: Trabalho feito, não relatórios

---

### 3. 🌙 Evening Wrap (18:00 SP / 21:00 UTC)
**Fim do dia** - Consolida e documenta

```
1. Resumo do dia (commits, tickets)
2. Atualiza memory/YYYY-MM-DD.md
3. Identifica pendências
4. Prepara contexto para amanhã
```
Entrega: Telegram + #mission-control

---

### 4. 📊 Weekly Review (Domingo 20:00 SP / 23:00 UTC)
**Semanal** - Visão estratégica

```
1. Métricas da semana (Jira, GitHub, MCX)
2. Custo/valor gerado
3. Planejamento próxima semana
4. Atualiza MEMORY.md com insights
```
Entrega: Telegram + #mission-control

---

## Mapeamento de Agentes

| Tarefa | Agente | Trigger |
|--------|--------|---------|
| Implementar feature | ⚔️ Zoro | Ticket pronto no Jira |
| Documentar | 📚 Robin | Ticket de doc ou após impl |
| Infra/DevOps | 🔧 Franky | Problema de infra ou deploy |
| Debug/QA | 🩺 Chopper | Bug report ou review |
| UX/Produto | 🍊 Nami | Análise ou planning |
| Comunicação | 🎯 Usopp | Quando precisa notificar |
| APIs/Dados | 🍳 Sanji | Integração externa |

---

## O que foi removido e por quê

| Removido | Motivo |
|----------|--------|
| daily-standup | Absorvido pelo morning-brief |
| code-review | Absorvido pelo work-cycle |
| sla-alert | Absorvido pelo morning-brief |
| infra-check | Absorvido pelo morning-brief |
| doc-sync | Absorvido pelo evening-wrap |
| sprint-planning | Absorvido pelo weekly-review |
| sprint-report | Absorvido pelo weekly-review |
| week-preview | Absorvido pelo weekly-review |
| always-creating | Substituído pelo work-cycle (mais controlado) |

---

## Economia Estimada

- **Antes:** 11 crons × ~$2/execução = ~$100+/dia
- **Depois:** 4 crons × ~$3/execução = ~$25/dia
- **Economia:** ~75%
