#!/bin/bash
# Slack Analytics & Weekly Report
# Created: 2026-02-12
# Usage: /scripts/slack/slack-analytics.sh [week|month]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"

PERIOD="${1:-week}"  # week ou month

log "📊 Gerando Slack Analytics ($PERIOD)..."

# Carregar credenciais
JIRA_USER="art@vivaldi.finance"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"

# Calcular datas
if [ "$PERIOD" = "week" ]; then
    START_DATE=$(TZ=America/Sao_Paulo date -d '7 days ago' +'%Y-%m-%d')
    TITLE="Relatório Semanal"
else
    START_DATE=$(TZ=America/Sao_Paulo date -d '30 days ago' +'%Y-%m-%d')
    TITLE="Relatório Mensal"
fi

TODAY=$(TZ=America/Sao_Paulo date +'%Y-%m-%d')

log "Período: $START_DATE → $TODAY"

# 1. MÉTRICAS DE TICKETS
TICKETS_COMPLETED=$(curl -s -X POST \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "https://vivaldi-revopos.atlassian.net/rest/api/3/search/jql" \
    -d "{
        \"jql\": \"project=SCRUM AND status=CONCLUIDO AND updated >= '$START_DATE' AND updated <= '$TODAY'\",
        \"maxResults\": 100,
        \"fields\": [\"key\", \"customfield_10016\"]
    }")

TICKET_COUNT=$(echo "$TICKETS_COMPLETED" | jq '.issues | length')
TOTAL_SP=$(echo "$TICKETS_COMPLETED" | jq '[.issues[].fields.customfield_10016 // 0] | add // 0')

# 2. VELOCITY MÉDIA
if [ "$PERIOD" = "week" ]; then
    DAYS=7
else
    DAYS=30
fi

AVG_VELOCITY=$(echo "scale=1; $TOTAL_SP / $DAYS" | bc)

# 3. MENSAGENS SLACK (atividade)
MESSAGES_JSON=$(curl -s -X GET \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    "https://slack.com/api/conversations.history?channel=$CHANNEL_SPRINT_CURRENT&oldest=$(date -d "$START_DATE" +%s)&limit=1000")

MESSAGE_COUNT=$(echo "$MESSAGES_JSON" | jq '.messages | length')

# 4. TOP 3 TICKETS (maior SP)
TOP_TICKETS=$(echo "$TICKETS_COMPLETED" | jq -r '.issues | sort_by(-.fields.customfield_10016) | .[0:3] | .[] | "• \(.key): \(.fields.customfield_10016) SP"')

# 5. CONSTRUIR RELATÓRIO
REPORT="📊 *$TITLE - revenue-OS*
_Período: $(TZ=America/Sao_Paulo date -d "$START_DATE" +'%d/%m') - $(TZ=America/Sao_Paulo date +'%d/%m/%Y')_

---

📈 *MÉTRICAS DE DESENVOLVIMENTO*

• *Tickets Concluídos:* $TICKET_COUNT
• *Story Points:* $TOTAL_SP SP
• *Velocity Média:* $AVG_VELOCITY SP/dia
• *Mensagens Slack:* $MESSAGE_COUNT

---

🏆 *TOP 3 TICKETS*

$TOP_TICKETS

---

💬 *ATIVIDADE SLACK*

• Canal #sprint-current: $MESSAGE_COUNT mensagens
• Média: $(echo "scale=0; $MESSAGE_COUNT / $DAYS" | bc) msgs/dia

---

🎯 *PRÓXIMOS PASSOS*

• Manter velocity atual ($AVG_VELOCITY SP/dia)
• Continuar Sprint 2 (EPIC-02)
• Factory-cycle rodando a cada 10min

_Relatório gerado automaticamente por Usopp 🎯_"

# 6. ENVIAR PARA #ANNOUNCEMENTS
log "Enviando relatório para #announcements..."
slack_send_message "$CHANNEL_ANNOUNCEMENTS" "$REPORT"

log_success "Analytics report enviado! 📊"
