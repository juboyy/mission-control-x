#!/bin/bash
# Slack Sprint Progress Update
# Created: 2026-02-11
# Usage: /scripts/slack/update-sprint-current.sh

set -euo pipefail

# Carregar cliente Slack
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"

log "📊 Gerando Sprint Progress Update..."

# Carregar credenciais Jira
JIRA_USER="art@vivaldi.finance"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"
JIRA_DOMAIN="https://vivaldi-revopos.atlassian.net"

# 1. Buscar Sprint Ativa
SPRINT_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "$JIRA_DOMAIN/rest/agile/1.0/board/1/sprint?state=active")

SPRINT_ID=$(echo "$SPRINT_JSON" | jq -r '.values[0].id')
SPRINT_NAME=$(echo "$SPRINT_JSON" | jq -r '.values[0].name')
SPRINT_GOAL=$(echo "$SPRINT_JSON" | jq -r '.values[0].goal')
SPRINT_START=$(echo "$SPRINT_JSON" | jq -r '.values[0].startDate' | cut -d'T' -f1)
SPRINT_END=$(echo "$SPRINT_JSON" | jq -r '.values[0].endDate' | cut -d'T' -f1)

log "Sprint: $SPRINT_NAME ($SPRINT_START → $SPRINT_END)"

# 2. Buscar todas as issues da Sprint
SPRINT_ISSUES_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "$JIRA_DOMAIN/rest/agile/1.0/sprint/$SPRINT_ID/issue?fields=customfield_10016,status,summary")

# 3. Calcular métricas
TOTAL_SP=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[].fields.customfield_10016 // 0] | add // 0')
COMPLETED_SP=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[] | select(.fields.status.name == "CONCLUIDO") | .fields.customfield_10016 // 0] | add // 0')
IN_PROGRESS_SP=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[] | select(.fields.status.name == "Em Andamento") | .fields.customfield_10016 // 0] | add // 0')

TOTAL_TICKETS=$(echo "$SPRINT_ISSUES_JSON" | jq '.issues | length')
COMPLETED_TICKETS=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[] | select(.fields.status.name == "CONCLUIDO")] | length')
IN_PROGRESS_TICKETS=$(echo "$SPRINT_ISSUES_JSON" | jq '[.issues[] | select(.fields.status.name == "Em Andamento")] | length')

PROGRESS_PCT=$(echo "scale=0; ($COMPLETED_SP * 100) / $TOTAL_SP" | bc)

log "Progresso: $COMPLETED_SP/$TOTAL_SP SP ($PROGRESS_PCT%)"

# 4. Calcular dias restantes
TODAY=$(TZ=America/Sao_Paulo date +'%Y-%m-%d')
DAYS_REMAINING=$(( ($(date -d "$SPRINT_END" +%s) - $(date -d "$TODAY" +%s)) / 86400 ))

# 5. Calcular velocity necessária
REMAINING_SP=$(($TOTAL_SP - $COMPLETED_SP))
if [ "$DAYS_REMAINING" -gt 0 ]; then
    VELOCITY_NEEDED=$(echo "scale=1; $REMAINING_SP / $DAYS_REMAINING" | bc)
else
    VELOCITY_NEEDED="N/A"
fi

# 6. Construir mensagem com blocos ricos
BLOCKS="[
    {
        \"type\": \"header\",
        \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"📊 Sprint Progress Update\"
        }
    },
    {
        \"type\": \"section\",
        \"fields\": [
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Sprint:*\n$SPRINT_NAME\"
            },
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Período:*\n$SPRINT_START → $SPRINT_END\"
            }
        ]
    },
    {
        \"type\": \"section\",
        \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*Goal:* $SPRINT_GOAL\"
        }
    },
    {
        \"type\": \"divider\"
    },
    {
        \"type\": \"section\",
        \"fields\": [
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Story Points:*\n$COMPLETED_SP / $TOTAL_SP SP ($PROGRESS_PCT%)\"
            },
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Tickets:*\n$COMPLETED_TICKETS / $TOTAL_TICKETS completados\"
            }
        ]
    },
    {
        \"type\": \"section\",
        \"fields\": [
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Em Andamento:*\n$IN_PROGRESS_TICKETS tickets ($IN_PROGRESS_SP SP)\"
            },
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Dias Restantes:*\n$DAYS_REMAINING dias\"
            }
        ]
    },
    {
        \"type\": \"section\",
        \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*Velocity Necessária:* $VELOCITY_NEEDED SP/dia\"
        }
    },
    {
        \"type\": \"divider\"
    },
    {
        \"type\": \"context\",
        \"elements\": [
            {
                \"type\": \"mrkdwn\",
                \"text\": \"Última atualização: $(TZ=America/Sao_Paulo date +'%Y-%m-%d %H:%M BRT')\"
            }
        ]
    }
]"

# 7. Enviar para Slack
log "Enviando Sprint Progress para #sprint-current..."
slack_send_blocks "$CHANNEL_SPRINT_CURRENT" "$BLOCKS"

log_success "Sprint Progress Update enviado! 📊"
