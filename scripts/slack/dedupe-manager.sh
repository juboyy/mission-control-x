#!/bin/bash
# Slack Notification Deduplicator
# Created: 2026-02-12
# Purpose: Central dedupe system para evitar mensagens redundantes

set -euo pipefail

CACHE_DIR="/tmp/slack-dedupe"
mkdir -p "$CACHE_DIR"

# Cache expira após 24h
CACHE_TTL=86400

# Função: Verificar se evento já foi notificado
is_notified() {
    local event_type="$1"  # ticket_completed, sprint_update, etc
    local event_id="$2"    # SCRUM-XXX, sprint-35, etc
    local cache_file="$CACHE_DIR/${event_type}_${event_id}.flag"
    
    if [ -f "$cache_file" ]; then
        # Verificar se não expirou
        local file_age=$(( $(date +%s) - $(stat -c %Y "$cache_file") ))
        if [ $file_age -lt $CACHE_TTL ]; then
            return 0  # Já notificado (recente)
        fi
    fi
    
    return 1  # Não notificado
}

# Função: Marcar evento como notificado
mark_notified() {
    local event_type="$1"
    local event_id="$2"
    local cache_file="$CACHE_DIR/${event_type}_${event_id}.flag"
    
    echo "$(date -Iseconds)" > "$cache_file"
}

# Função: Limpar cache expirado
cleanup_cache() {
    find "$CACHE_DIR" -type f -mtime +1 -delete
}

# Executar cleanup em background (não bloquear)
cleanup_cache &

# Export funções para uso em outros scripts
export -f is_notified
export -f mark_notified
