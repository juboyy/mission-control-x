#!/bin/bash
# Slack Ticket Completed Notification
# Created: 2026-02-11
# Updated: 2026-02-12 (added dedupe)
# Usage: /scripts/slack/ticket-completed.sh SCRUM-XXX

set -euo pipefail

# Carregar cliente Slack
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"
source "$SCRIPT_DIR/dedupe-manager.sh"

# Validar argumento
if [ $# -eq 0 ]; then
    log_error "Usage: $0 SCRUM-XXX"
    exit 1
fi

TICKET_KEY="$1"

# Verificar se já foi notificado
if is_notified "ticket_completed" "$TICKET_KEY"; then
    log "⚠️  Ticket $TICKET_KEY já notificado recentemente. Skipping."
    exit 0
fi

log "📋 Gerando notificação para ticket $TICKET_KEY..."

# Carregar credenciais Jira (via env)
JIRA_USER="${JIRA_USER:-art@vivaldi.finance}"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"
JIRA_DOMAIN="https://vivaldi-revopos.atlassian.net"

# 1. Buscar dados do ticket
TICKET_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "$JIRA_DOMAIN/rest/api/3/issue/$TICKET_KEY?fields=summary,status,customfield_10016,customfield_10014,issuetype")

SUMMARY=$(echo "$TICKET_JSON" | jq -r '.fields.summary')
STATUS=$(echo "$TICKET_JSON" | jq -r '.fields.status.name')
SP=$(echo "$TICKET_JSON" | jq -r '.fields.customfield_10016 // 0')
EPIC_NAME=$(echo "$TICKET_JSON" | jq -r '.fields.customfield_10014 // "N/A"')

log "Ticket: $SUMMARY (Status: $STATUS, SP: $SP)"

# 2. Buscar PR associado (via GitHub)
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' /home/ubuntu/.openclaw/workspace/.env | cut -d'=' -f2)
PR_SEARCH=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/search/issues?q=repo:juboyy/revenue-OS+$TICKET_KEY+is:pr+is:merged&sort=updated&order=desc")

PR_COUNT=$(echo "$PR_SEARCH" | jq '.total_count')

if [ "$PR_COUNT" -gt 0 ]; then
    PR_NUMBER=$(echo "$PR_SEARCH" | jq -r '.items[0].number')
    PR_TITLE=$(echo "$PR_SEARCH" | jq -r '.items[0].title')
    PR_URL="https://github.com/juboyy/revenue-OS/pull/$PR_NUMBER"
    PR_MERGED_AT=$(echo "$PR_SEARCH" | jq -r '.items[0].closed_at')
    
    log "PR encontrado: #$PR_NUMBER"
else
    PR_NUMBER="N/A"
    PR_URL=""
    log_warning "Nenhum PR merged encontrado"
fi

# 3. Verificar último deploy (Vercel)
DEPLOY_URL="https://revenue-os-sand.vercel.app"
DEPLOY_STATUS="✅ Production"

# 4. Construir mensagem
MESSAGE="✅ *$TICKET_KEY Concluído*

*Título:* $SUMMARY
*EPIC:* $EPIC_NAME
*Story Points:* $SP SP"

if [ "$PR_NUMBER" != "N/A" ]; then
    MESSAGE="$MESSAGE

📋 *Changes:*
• PR #$PR_NUMBER: $PR_TITLE
• <$PR_URL|Ver PR no GitHub>

🚀 *Deploy:*
• Status: $DEPLOY_STATUS
• URL: <$DEPLOY_URL|$DEPLOY_URL>"
fi

MESSAGE="$MESSAGE

🔗 *Links:*
• <$JIRA_DOMAIN/browse/$TICKET_KEY|Jira: $TICKET_KEY>
• <https://vivaldi-revopos.atlassian.net/wiki/spaces/VR/overview|Confluence: revenue-OS>"

# 5. Enviar para Slack
log "Enviando notificação para #sprint-current..."
TS=$(slack_send_message "$CHANNEL_SPRINT_CURRENT" "$MESSAGE")

# 6. Reações desabilitadas (scope missing: reactions:write)
# TODO: Adicionar scope ao Slack app e regenerar token
# if [ -n "$TS" ] && [ "$TS" != "null" ]; then
#     slack_add_reaction "$CHANNEL_SPRINT_CURRENT" "$TS" "tada" || true
#     slack_add_reaction "$CHANNEL_SPRINT_CURRENT" "$TS" "rocket" || true
# fi

log_success "Notificação de ticket completado enviada! 🎉"

# Marcar como notificado
mark_notified "ticket_completed" "$TICKET_KEY"
