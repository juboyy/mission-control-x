#!/bin/bash
# Slack Daily Summary - Morning Briefing
# Created: 2026-02-11
# Usage: /scripts/slack/daily-summary.sh

set -euo pipefail

# Carregar cliente Slack
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"

# Carregar credenciais Jira
JIRA_USER="art@vivaldi.finance"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"
JIRA_DOMAIN="https://vivaldi-revopos.atlassian.net"

log "🌅 Gerando Daily Summary..."

# 1. Buscar Sprint Ativa
SPRINT_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "$JIRA_DOMAIN/rest/agile/1.0/board/1/sprint?state=active")

SPRINT_ID=$(echo "$SPRINT_JSON" | jq -r '.values[0].id')
SPRINT_NAME=$(echo "$SPRINT_JSON" | jq -r '.values[0].name')

log "Sprint ativa: $SPRINT_NAME (ID: $SPRINT_ID)"

# 2. Buscar tickets completados ontem (últimas 24h)
YESTERDAY=$(date -u -d '1 day ago' +'%Y-%m-%d')
COMPLETED_JSON=$(curl -s -X POST \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "$JIRA_DOMAIN/rest/api/3/search/jql" \
    -d "{
        \"jql\": \"project=SCRUM AND status=CONCLUIDO AND updated >= '$YESTERDAY' ORDER BY updated DESC\",
        \"maxResults\": 10,
        \"fields\": [\"key\", \"summary\"]
    }")

COMPLETED_COUNT=$(echo "$COMPLETED_JSON" | jq '.issues | length')
log "Tickets completados ontem: $COMPLETED_COUNT"

# 3. Buscar tickets em andamento
IN_PROGRESS_JSON=$(curl -s -X POST \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "$JIRA_DOMAIN/rest/api/3/search/jql" \
    -d "{
        \"jql\": \"project=SCRUM AND status='Em Andamento' ORDER BY priority DESC\",
        \"maxResults\": 5,
        \"fields\": [\"key\", \"summary\"]
    }")

IN_PROGRESS_COUNT=$(echo "$IN_PROGRESS_JSON" | jq '.issues | length')
log "Tickets em andamento: $IN_PROGRESS_COUNT"

# 4. Buscar próximo ticket prioritário
NEXT_JSON=$(curl -s -X POST \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "$JIRA_DOMAIN/rest/api/3/search/jql" \
    -d "{
        \"jql\": \"project=SCRUM AND status IN ('Design', 'Backlog') AND sprint=$SPRINT_ID ORDER BY priority DESC, created ASC\",
        \"maxResults\": 1,
        \"fields\": [\"key\", \"summary\"]
    }")

NEXT_TICKET=$(echo "$NEXT_JSON" | jq -r '.issues[0].key // "Nenhum"')
NEXT_SUMMARY=$(echo "$NEXT_JSON" | jq -r '.issues[0].fields.summary // ""')

# 5. Buscar progresso da Sprint
SPRINT_ISSUES_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "$JIRA_DOMAIN/rest/agile/1.0/sprint/$SPRINT_ID/issue?fields=customfield_10016,status")

TOTAL_SP=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[].fields.customfield_10016 // 0] | add')
COMPLETED_SP=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[] | select(.fields.status.name == "CONCLUIDO") | .fields.customfield_10016 // 0] | add')

PROGRESS_PCT=$(echo "scale=0; ($COMPLETED_SP * 100) / $TOTAL_SP" | bc)

log "Progresso: $COMPLETED_SP/$TOTAL_SP SP ($PROGRESS_PCT%)"

# 6. Construir mensagem
DATA=$(TZ=America/Sao_Paulo date +'%d/%m/%Y')

MESSAGE="🌅 *Bom dia! Status de Hoje ($DATA)*

✅ *Completados ontem:*"

if [ "$COMPLETED_COUNT" -gt 0 ]; then
    COMPLETED_LIST=$(echo "$COMPLETED_JSON" | jq -r '.issues[] | "• \(.key): \(.fields.summary)"' | head -3)
    MESSAGE="$MESSAGE
$COMPLETED_LIST"
else
    MESSAGE="$MESSAGE
• Nenhum ticket completado"
fi

MESSAGE="$MESSAGE

🔄 *Em andamento:*"

if [ "$IN_PROGRESS_COUNT" -gt 0 ]; then
    IN_PROGRESS_LIST=$(echo "$IN_PROGRESS_JSON" | jq -r '.issues[] | "• \(.key): \(.fields.summary)"' | head -3)
    MESSAGE="$MESSAGE
$IN_PROGRESS_LIST"
else
    MESSAGE="$MESSAGE
• Nenhum ticket em andamento"
fi

MESSAGE="$MESSAGE

🎯 *Prioridade hoje:*"

if [ "$NEXT_TICKET" != "Nenhum" ]; then
    MESSAGE="$MESSAGE
• $NEXT_TICKET: $NEXT_SUMMARY (Design → Em Andamento)"
else
    MESSAGE="$MESSAGE
• Backlog vazio ou Sprint completa"
fi

MESSAGE="$MESSAGE

📊 *Sprint Progress:* $COMPLETED_SP/$TOTAL_SP SP ($PROGRESS_PCT%)"

# 7. Enviar para Slack
log "Enviando summary para #sprint-current..."
slack_send_message "$CHANNEL_SPRINT_CURRENT" "$MESSAGE"

log_success "Daily Summary enviado com sucesso! 🌅"
