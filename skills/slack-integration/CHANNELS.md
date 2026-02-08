# Slack Channel Structure - Mission Control X

## Estrutura Proposta

Baseada na hierarquia Chapéus de Palha + revenue-OS:

### 🌀 Core (Orquestração)
- `#mission-control` - Dashboard principal, alertas do sistema
- `#announcements` - Comunicados importantes
- `#standup` - Daily standups automáticos

### 👒 Crew Channels (Por Função)
- `#crew-dev` - Desenvolvedores (Zoro, Franky)
- `#crew-product` - Product/UX (Nami)
- `#crew-research` - Pesquisa/Docs (Robin)
- `#crew-qa` - Testes/Debug (Chopper)
- `#crew-data` - APIs/Integrações (Sanji)

### 🎫 Jira Integration
- `#jira-updates` - Notificações automáticas de tickets
- `#jira-blockers` - Tickets bloqueados (alerta)
- `#sprint-current` - Sprint ativo

### 📚 Confluence
- `#docs-updates` - Atualizações de documentação
- `#architecture` - Discussões de arquitetura

### 🤖 AI Agents
- `#agent-logs` - Logs dos agentes OpenClaw
- `#agent-alerts` - Alertas de erros/falhas

### 💬 Projeto revenue-OS
- `#revenueos-general` - Discussões gerais
- `#revenueos-api` - API e integrações
- `#revenueos-frontend` - Frontend/UI
- `#revenueos-infra` - Infraestrutura

## Automações

### Standup Diário (9h)
Bot posta em #standup:
- Tickets em progresso por dev
- Bloqueios
- Concluídos ontem

### Sprint Report (Sexta 17h)
Bot posta em #mission-control:
- Story points concluídos
- Burndown
- Top contributors

### Alertas
- Ticket high priority sem update 24h → #jira-blockers
- Deploy falhou → #agent-alerts
- Nova doc criada → #docs-updates
