# 🍊 UX Ideas - Mission Control X

> Analisado por Nami, navegadora e especialista em UX
> Data: 2026-02-08

## 📋 Estado Atual do Dashboard

O Mission Control X já tem uma base sólida:
- Design dark mode estilo Apple HIG ✓
- Tab bar com 4 views (Overview, Agents, Tools, Activity) ✓
- Hero card com custo total e progress bar ✓
- Stats grid com métricas principais ✓
- Modal sheet para detalhes de agentes ✓
- Pull-to-refresh e auto-update (10s) ✓

---

## 🎯 Ideias Extraídas das Skills de Referência

### Da Skill: Agent Doppelganger

A skill traz conceitos de **delegação com políticas** e **escalation**. Ideias para o dashboard:

#### 1. **Policy Gate Visual** 🛡️
```
┌─────────────────────────────────────┐
│ 🔒 Policy Gate              [ON]   │
├─────────────────────────────────────┤
│ ⛔ Blocked      │ 3 requests        │
│ ⏸️ Escalated    │ 7 drafts pending  │
│ ✅ Auto-handled │ 42 today          │
└─────────────────────────────────────┘
```
**UX Benefit:** Mostra quanto o sistema está operando autonomamente vs. precisando de intervenção humana.

#### 2. **Confidence Meter por Agente** 📊
Adicionar ao card de cada agente uma barra de "confiança" mostrando quão seguro o agente está em suas decisões:
- 🟢 Alta (80-100%) - agindo autonomamente
- 🟡 Média (50-79%) - algumas escalações
- 🔴 Baixa (<50%) - muitos bloqueios

#### 3. **Identity Fidelity Score** 🎭
No sheet de detalhes do agente, mostrar:
- Style match: 94%
- Heuristics applied: 12
- Constraints active: 5
- Violations: 0

#### 4. **Escalation Queue** 📨
Nova section no Overview ou view dedicada:
```
┌─────────────────────────────────────┐
│ 📨 AGUARDANDO SUA AÇÃO       (7)   │
├─────────────────────────────────────┤
│ 🍊 Nami - Draft email response      │
│     → cliente.importante@...   2min │
│ 📚 Robin - Needs approval           │
│     → Deletar arquivo X?       5min │
└─────────────────────────────────────┘
```

#### 5. **Forbidden Domains Badge** 🚫
Tag visual em mensagens/atividades que tocaram domínios sensíveis:
- `💰 Financial` `⚖️ Legal` `🏥 Medical` `🗳️ Political`

---

### Da Skill: Event Watcher

A skill foca em **eventos, filtros e wake conditions**. Ideias:

#### 1. **Event Stream Live Feed** 📡
Adicionar ao view Activity um modo "live" com eventos fluindo em tempo real:
```
┌─────────────────────────────────────┐
│ 📡 LIVE STREAM             ● ON    │
├─────────────────────────────────────┤
│ ↓ Novo evento a cada ~2s            │
│ 14:32:01 🔔 webhook:github          │
│ 14:32:03 💬 slack:DM                │
│ 14:32:05 📧 email:inbox             │
└─────────────────────────────────────┘
```

#### 2. **Filter Stats Dashboard** 🔍
Mostrar eficiência dos filtros:
```
┌─────────────────────────────────────┐
│ 📊 FILTER EFFICIENCY                │
├─────────────────────────────────────┤
│ Events received:    1,247           │
│ Events matched:       89  (7.1%)    │
│ Agent wakes:          23            │
│ Tokens saved:      ~847K 🎉         │
└─────────────────────────────────────┘
```
**UX Benefit:** Mostra economia real de tokens por NÃO acordar agentes.

#### 3. **Wake History Timeline** ⏰
Gráfico sparkline mostrando quando agentes foram "acordados":
```
Últimas 24h:
🤖 ▁▂▅▂▁▁▁▁▂▃▇▃▂▁▁▁▂▅▃▂▁▁▁
    00  04  08  12  16  20  24
```

#### 4. **Deduplication Counter** 🔄
Badge mostrando eventos duplicados filtrados:
```
🔄 Dedupe: 34 eventos idênticos ignorados hoje
   → Economizou ~$0.47 em tokens
```

#### 5. **Retry Queue** 🔁
Para entregas falhadas:
```
┌─────────────────────────────────────┐
│ 🔁 RETRY QUEUE              (2)    │
├─────────────────────────────────────┤
│ ❌ Slack #general - timeout (1/3)   │
│ ❌ Email delivery - rate limit (2/3)│
└─────────────────────────────────────┘
```

#### 6. **Source Health Indicators** 💚
Status de cada fonte de eventos:
```
Redis Stream    💚 Connected    12ms
Webhook Bridge  💚 Active       3 pending
Slack           💛 Rate limited 2min cooldown
Email IMAP      💚 Synced       30s ago
```

---

## 🆕 Novas Features Sugeridas

### 1. **Session Routing Map** 🗺️
Diagrama visual mostrando como mensagens fluem entre canais e agentes:
```
Telegram ──┬──→ 🌀 Main ──→ 🍊 Nami
Discord ───┘            └──→ 📚 Robin
Slack ─────────→ Cron ──────→ ⚡ Auto
```

### 2. **Cost Forecast** 📈
Projeção baseada no uso atual:
```
📈 Projeção para hoje: $8.42 (56% do budget)
   Ritmo atual: $0.35/hora
   Pico estimado: 18:00
```

### 3. **Notification Center** 🔔
Consolidar alertas importantes:
- Budget > 80%
- Agent error rate > 5%
- Escalation pending > 30min
- Source disconnected

### 4. **Quick Actions Drawer** ⚡
Swipe-up com ações rápidas:
- 🛑 Pause all agents
- 🔄 Force refresh
- 📊 Export report
- ⚙️ Settings

### 5. **Agent Comparison Mode** 🔬
Selecionar 2+ agentes para comparar:
```
         | Nami 🍊 | Robin 📚 | Franky 🔧
---------|---------|----------|----------
Custo    | $2.34   | $1.89    | $0.45
Tokens   | 145K    | 98K      | 23K
Erros    | 0       | 1        | 0
Tools    | 47      | 23       | 156
```

---

## 📱 Melhorias de UX Mobile

### 1. **Haptic Feedback**
- Vibração sutil ao pull-to-refresh
- Feedback tátil ao mudar de tab
- Haptic warning em erros

### 2. **3D Touch / Long Press**
- Preview de agente sem abrir sheet
- Quick stats em long press nos cards

### 3. **Gesture Navigation**
- Swipe horizontal entre views
- Swipe down para fechar sheets (já tem ✓)
- Double-tap no hero para refresh

### 4. **Widget Mode**
Mini dashboard para home screen iOS/Android:
```
┌──────────────┐
│ 🌀 MCX       │
│ $5.67 hoje   │
│ 🤖 4 ativos  │
└──────────────┘
```

---

## 🎨 Polish Visual

### 1. **Status Colors Semantics**
- 💚 Verde = Healthy/Active
- 💛 Amarelo = Warning/Degraded
- 🔴 Vermelho = Error/Blocked
- 🔵 Azul = Info/Pending

### 2. **Animated Transitions**
- Cards com spring animation ao carregar
- Números com animação de contagem
- Gráficos com draw animation

### 3. **Empty States Ilustrados**
Ao invés de só emoji, usar ilustrações SVG mínimas para estados vazios.

---

## 🏆 Prioridade de Implementação

| Prioridade | Feature | Esforço | Impacto |
|------------|---------|---------|---------|
| P0 | Escalation Queue | Médio | Alto |
| P0 | Source Health | Baixo | Alto |
| P1 | Cost Forecast | Médio | Alto |
| P1 | Filter Stats | Baixo | Médio |
| P1 | Notification Center | Alto | Alto |
| P2 | Live Event Stream | Médio | Médio |
| P2 | Wake Timeline | Baixo | Médio |
| P2 | Quick Actions | Baixo | Médio |
| P3 | Agent Comparison | Alto | Baixo |
| P3 | Session Routing Map | Alto | Baixo |

---

## 💡 Próximos Passos

1. **Validar com João** quais features fazem mais sentido para o fluxo dele
2. **Prototipar em texto** as top 3 features (P0)
3. **Implementar CSS** para os novos componentes
4. **Adicionar endpoints** no backend (se necessário)

---

*Documento gerado por Nami 🍊 - Navegadora do Thousand Sunny*
