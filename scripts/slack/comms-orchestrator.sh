#!/bin/bash
# Communications Orchestrator - Standalone Script
# Created: 2026-02-12 (replacement for buggy cron)
# Usage: /scripts/slack/comms-orchestrator.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"
source "$SCRIPT_DIR/channels-config.sh"

log "💬 COMMS-ORCHESTRATOR - Standalone Mode iniciando..."

# 1. DETECTAR MENSAGENS PREPARADAS (/tmp/slack-message-*.txt)
INBOX_DIR="/tmp"
MESSAGE_FILES=$(find "$INBOX_DIR" -name "slack-message-*.txt" -type f 2>/dev/null || true)

if [ -z "$MESSAGE_FILES" ]; then
    log "Nenhuma mensagem preparada encontrada em $INBOX_DIR"
    echo "COMMS_OK: No messages to send"
    exit 0
fi

log_success "Encontradas $(echo "$MESSAGE_FILES" | wc -l) mensagens preparadas"

# 2. PROCESSAR CADA MENSAGEM
echo "$MESSAGE_FILES" | while read -r msg_file; do
    if [ ! -f "$msg_file" ]; then
        continue
    fi
    
    log "Processando: $(basename "$msg_file")"
    
    # Ler metadados do arquivo
    CHANNEL=$(head -n1 "$msg_file" | grep -oP '(?<=CHANNEL=).*' || echo "sprint-current")
    MESSAGE=$(tail -n +2 "$msg_file")
    
    # Mapear nome do canal para ID
    case "$CHANNEL" in
        "sprint-current") CHANNEL_ID="$CHANNEL_SPRINT_CURRENT" ;;
        "announcements") CHANNEL_ID="$CHANNEL_ANNOUNCEMENTS" ;;
        "jira-updates") CHANNEL_ID="$CHANNEL_JIRA_UPDATES" ;;
        "jira-blockers") CHANNEL_ID="$CHANNEL_JIRA_BLOCKERS" ;;
        "mission-control") CHANNEL_ID="$CHANNEL_MISSION_CONTROL" ;;
        "agent-logs") CHANNEL_ID="$CHANNEL_AGENT_LOGS" ;;
        "agent-alerts") CHANNEL_ID="$CHANNEL_AGENT_ALERTS" ;;
        "crew-dev") CHANNEL_ID="$CHANNEL_CREW_DEV" ;;
        "crew-qa") CHANNEL_ID="$CHANNEL_CREW_QA" ;;
        *) 
            log_warning "Canal desconhecido: $CHANNEL (usando sprint-current)"
            CHANNEL_ID="$CHANNEL_SPRINT_CURRENT"
            ;;
    esac
    
    # Enviar mensagem
    log "Enviando para #$CHANNEL ($CHANNEL_ID)..."
    
    if slack_send_message "$CHANNEL_ID" "$MESSAGE"; then
        log_success "Mensagem enviada com sucesso"
        
        # Arquivar arquivo processado
        ARCHIVE_DIR="/home/ubuntu/.openclaw/workspace/slack-archive/processed"
        mkdir -p "$ARCHIVE_DIR"
        mv "$msg_file" "$ARCHIVE_DIR/$(basename "$msg_file").$(date +%s)"
        
        log "Arquivo arquivado em $ARCHIVE_DIR"
    else
        log_error "Falha ao enviar mensagem"
        
        # Mover para pasta de erro
        ERROR_DIR="/home/ubuntu/.openclaw/workspace/slack-archive/failed"
        mkdir -p "$ERROR_DIR"
        mv "$msg_file" "$ERROR_DIR/$(basename "$msg_file").$(date +%s)"
    fi
done

log_success "COMMS-ORCHESTRATOR concluído"
echo "COMMS_OK: All messages processed"
