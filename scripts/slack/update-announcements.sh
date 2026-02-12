#!/bin/bash
# Slack Milestone Announcement
# Created: 2026-02-11
# Usage: /scripts/slack/update-announcements.sh "EPIC-XX" "Título" "Descrição"

set -euo pipefail

# Carregar cliente Slack
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"

# Validar argumentos
if [ $# -lt 3 ]; then
    log_error "Usage: $0 \"EPIC-XX\" \"Título\" \"Descrição\""
    exit 1
fi

EPIC="$1"
TITLE="$2"
DESCRIPTION="$3"

log "🎉 Gerando Milestone Announcement para $EPIC..."

# Data atual
DATA=$(TZ=America/Sao_Paulo date +'%d/%m/%Y %H:%M BRT')

# Construir mensagem com blocos
BLOCKS="[
    {
        \"type\": \"header\",
        \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"🎉 MILESTONE ALCANÇADO\",
            \"emoji\": true
        }
    },
    {
        \"type\": \"section\",
        \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*$EPIC: $TITLE*\"
        }
    },
    {
        \"type\": \"section\",
        \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"$DESCRIPTION\"
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
                \"text\": \"*Status:*\n✅ 100% COMPLETO\"
            },
            {
                \"type\": \"mrkdwn\",
                \"text\": \"*Deploy:*\n🚀 Production LIVE\"
            }
        ]
    },
    {
        \"type\": \"section\",
        \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*Links:*\n• <https://revenue-os-sand.vercel.app|Production Dashboard>\n• <https://vivaldi-revopos.atlassian.net/jira/software/c/projects/SCRUM/boards/1|Jira Board>\n• <https://vivaldi-revopos.atlassian.net/wiki/spaces/VR/overview|Confluence Docs>\"
        }
    },
    {
        \"type\": \"context\",
        \"elements\": [
            {
                \"type\": \"mrkdwn\",
                \"text\": \"📅 $DATA | 🌀 Powered by OpenClaw Multi-Agent System\"
            }
        ]
    }
]"

# Enviar para #announcements
log "Enviando para #announcements..."
TS=$(slack_send_blocks "$CHANNEL_ANNOUNCEMENTS" "$BLOCKS")

# Adicionar reações
if [ -n "$TS" ]; then
    slack_add_reaction "$CHANNEL_ANNOUNCEMENTS" "$TS" "tada"
    slack_add_reaction "$CHANNEL_ANNOUNCEMENTS" "$TS" "rocket"
    slack_add_reaction "$CHANNEL_ANNOUNCEMENTS" "$TS" "party_parrot"
fi

log_success "Milestone Announcement enviado! 🎉"
