#!/bin/bash
# Slack Autonomous Monitor
# Created: 2026-02-12
# Agent: Usopp 🎯 (Frontend + Communication)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"
source "$SCRIPT_DIR/dedupe-manager.sh"

# Carregar credenciais Jira
JIRA_USER="art@vivaldi.finance"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"
JIRA_DOMAIN="https://vivaldi-revopos.atlassian.net"

log "🎯 USOPP - Slack Autonomous Monitor iniciando..."

# Carregar estado anterior
STATE_FILE="/tmp/slack-monitor-state.json"
if [ ! -f "$STATE_FILE" ]; then
    echo '{"last_check": 0, "channels_monitored": []}' > "$STATE_FILE"
fi

LAST_CHECK=$(jq -r '.last_check' "$STATE_FILE")
NOW=$(date +%s)

log "Última verificação: $(date -d @$LAST_CHECK +'%H:%M BRT')"

# 1. MONITORAR NOVOS TICKETS CONCLUÍDOS (via Jira API)
log "Verificando tickets concluídos recentemente..."

JIRA_USER="${JIRA_USER:-art@vivaldi.finance}"
JIRA_TOKEN="${JIRA_TOKEN:-$(grep '^JIRA_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"

# Buscar tickets que transitaram para CONCLUIDO nas últimas 10min
COMPLETED_JSON=$(curl -s -X POST \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "https://vivaldi-revopos.atlassian.net/rest/api/3/search/jql" \
    -d "{
        \"jql\": \"project=SCRUM AND status=CONCLUIDO AND updated >= -10m ORDER BY updated DESC\",
        \"maxResults\": 5,
        \"fields\": [\"key\", \"summary\"]
    }")

COMPLETED_COUNT=$(echo "$COMPLETED_JSON" | jq '.issues | length')

if [ "$COMPLETED_COUNT" -gt 0 ]; then
    log_success "Encontrados $COMPLETED_COUNT tickets concluídos recentemente"
    
    echo "$COMPLETED_JSON" | jq -r '.issues[].key' | while read TICKET_KEY; do
        # Verificar se já foi notificado (usando dedupe-manager)
        if ! is_notified "ticket_completed" "$TICKET_KEY"; then
            log "Notificando ticket concluído: $TICKET_KEY"
            /home/ubuntu/.openclaw/workspace/scripts/slack/ticket-completed.sh "$TICKET_KEY"
            
            # Marcar como notificado (usando dedupe-manager)
            mark_notified "ticket_completed" "$TICKET_KEY"
        else
            log "Ticket $TICKET_KEY já notificado (skip)"
        fi
    done
else
    log "Nenhum ticket concluído recentemente"
fi

# 2. MONITORAR ALERTAS DE SPRINT (velocity baixa)
log "Verificando velocity da Sprint..."

SPRINT_JSON=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "https://vivaldi-revopos.atlassian.net/rest/agile/1.0/board/1/sprint?state=active")

SPRINT_ID=$(echo "$SPRINT_JSON" | jq -r '.values[0].id')
SPRINT_END=$(echo "$SPRINT_JSON" | jq -r '.values[0].endDate' | cut -d'T' -f1)

SPRINT_ISSUES=$(curl -s -X GET \
    -u "$JIRA_USER:$JIRA_TOKEN" \
    "https://vivaldi-revopos.atlassian.net/rest/agile/1.0/sprint/$SPRINT_ID/issue?fields=customfield_10016,status")

TOTAL_SP=$(echo "$SPRINT_ISSUES" | jq '[.issues[].fields.customfield_10016 // 0] | add // 0')
COMPLETED_SP=$(echo "$SPRINT_ISSUES" | jq '[.issues[] | select(.fields.status.name == "CONCLUIDO") | .fields.customfield_10016 // 0] | add // 0')

TODAY=$(TZ=America/Sao_Paulo date +'%Y-%m-%d')
DAYS_REMAINING=$(( ($(date -d "$SPRINT_END" +%s) - $(date -d "$TODAY" +%s)) / 86400 ))

# Convert floats to integers for bash arithmetic
TOTAL_SP_INT=$(echo "$TOTAL_SP" | awk '{printf "%.0f", $1}')
COMPLETED_SP_INT=$(echo "$COMPLETED_SP" | awk '{printf "%.0f", $1}')
REMAINING_SP=$(($TOTAL_SP_INT - $COMPLETED_SP_INT))

if [ "$DAYS_REMAINING" -gt 0 ]; then
    VELOCITY_NEEDED=$(echo "scale=1; $REMAINING_SP / $DAYS_REMAINING" | bc)
    
    # Se velocity > 10 SP/dia = ALERTA
    if [ $(echo "$VELOCITY_NEEDED > 10" | bc) -eq 1 ]; then
        log_warning "Velocity necessária muito alta: $VELOCITY_NEEDED SP/dia"
        
        # Enviar alerta para #sprint-current
        ALERT_MESSAGE="⚠️ *ALERTA DE VELOCITY* ($(TZ=America/Sao_Paulo date +'%d/%m %H:%M BRT'))

Sprint está atrás do esperado:
• *Velocity necessária:* $VELOCITY_NEEDED SP/dia
• *Restam:* $REMAINING_SP SP em $DAYS_REMAINING dias
• *Progresso atual:* $COMPLETED_SP/$TOTAL_SP SP

*Recomendações:*
1. Aumentar paralelização (mais agentes simultâneos)
2. Reduzir escopo (mover tickets complexos para próxima Sprint)
3. Simplificar implementações (MVP approach)

@channel - Atenção necessária"

        slack_send_message "$CHANNEL_SPRINT_CURRENT" "$ALERT_MESSAGE"
    fi
fi

# 3. LIMPAR MENSAGENS ANTIGAS (> 30 dias)
log "Verificando mensagens antigas para arquivo..."

# Buscar mensagens > 30 dias
THIRTY_DAYS_AGO=$((NOW - 2592000))

OLD_MESSAGES=$(curl -s -X GET \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    "https://slack.com/api/conversations.history?channel=$CHANNEL_SPRINT_CURRENT&oldest=0&latest=$THIRTY_DAYS_AGO&limit=100")

OLD_COUNT=$(echo "$OLD_MESSAGES" | jq '.messages | length')

if [ "$OLD_COUNT" -gt 0 ]; then
    log "Encontradas $OLD_COUNT mensagens antigas (arquivando metadados)"
    
    # Salvar metadados para histórico
    ARCHIVE_FILE="/home/ubuntu/.openclaw/workspace/slack-archive/$(date +'%Y-%m').json"
    mkdir -p "$(dirname "$ARCHIVE_FILE")"
    echo "$OLD_MESSAGES" >> "$ARCHIVE_FILE"
    
    log_success "Metadados arquivados em $ARCHIVE_FILE"
fi

# 4. ATUALIZAR ESTADO
jq --arg ts "$NOW" '.last_check = ($ts | tonumber)' "$STATE_FILE" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"

log_success "Monitor concluído. Próxima verificação em 10 minutos."

# 5. PROCESSAR MENSAGENS PREPARADAS (comms-orchestrator replacement)
log "Verificando mensagens preparadas para envio..."

COMMS_SCRIPT="$SCRIPT_DIR/comms-orchestrator.sh"
if [ -f "$COMMS_SCRIPT" ]; then
    bash "$COMMS_SCRIPT"
else
    log_warning "comms-orchestrator.sh não encontrado (skip)"
fi
