#!/bin/bash
# Slack Client - Funções Reutilizáveis
# Created: 2026-02-11
# Usage: source /scripts/slack/slack-client.sh

set -euo pipefail

# Configuração
# Carregar token do Slack (via env ou arquivo)
SLACK_TOKEN="${SLACK_BOT_TOKEN:-${SLACK_TOKEN:-$(grep '^SLACK_BOT_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}}"
SLACK_API="https://slack.com/api"
TIMEZONE="America/Sao_Paulo"  # BRT (UTC-3)

# Canais (Channel IDs)
CHANNEL_SPRINT_CURRENT="C0AD8798FL7"
CHANNEL_ANNOUNCEMENTS="C0ADH906PFD"
CHANNEL_MISSION_CONTROL="C0AE2J7HW9F"

# Cores para logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função: Log com timestamp (BRT)
log() {
    echo -e "${BLUE}[$(TZ=$TIMEZONE date +'%Y-%m-%d %H:%M:%S BRT')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(TZ=$TIMEZONE date +'%Y-%m-%d %H:%M:%S BRT')] ✅${NC} $1"
}

log_error() {
    echo -e "${RED}[$(TZ=$TIMEZONE date +'%Y-%m-%d %H:%M:%S BRT')] ❌${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(TZ=$TIMEZONE date +'%Y-%m-%d %H:%M:%S BRT')] ⚠️${NC} $1"
}

# Função: Enviar mensagem para canal
# Usage: slack_send_message "channel_id" "message_text"
slack_send_message() {
    local channel="$1"
    local text="$2"
    
    log "Enviando mensagem para canal $channel..."
    
    local response=$(curl -s -X POST "${SLACK_API}/chat.postMessage" \
        -H "Authorization: Bearer ${SLACK_TOKEN}" \
        -H "Content-Type: application/json; charset=utf-8" \
        -d "{
            \"channel\": \"$channel\",
            \"text\": \"$text\",
            \"mrkdwn\": true
        }")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        local ts=$(echo "$response" | jq -r '.ts')
        log_success "Mensagem enviada (ts: $ts)"
        echo "$ts"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error')
        log_error "Falha ao enviar: $error"
        return 1
    fi
}

# Função: Enviar mensagem com blocos (rich formatting)
# Usage: slack_send_blocks "channel_id" "blocks_json_string"
slack_send_blocks() {
    local channel="$1"
    local blocks="$2"
    
    log "Enviando mensagem com blocos para canal $channel..."
    
    local response=$(curl -s -X POST "${SLACK_API}/chat.postMessage" \
        -H "Authorization: Bearer ${SLACK_TOKEN}" \
        -H "Content-Type: application/json; charset=utf-8" \
        -d "{
            \"channel\": \"$channel\",
            \"blocks\": $blocks
        }")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        local ts=$(echo "$response" | jq -r '.ts')
        log_success "Mensagem enviada (ts: $ts)"
        echo "$ts"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error')
        log_error "Falha ao enviar: $error"
        echo "$response" | jq '.'
        return 1
    fi
}

# Função: Adicionar reação a mensagem
# Usage: slack_add_reaction "channel_id" "timestamp" "emoji_name"
slack_add_reaction() {
    local channel="$1"
    local timestamp="$2"
    local emoji="$3"
    
    log "Adicionando reação :$emoji: à mensagem..."
    
    local response=$(curl -s -X POST "${SLACK_API}/reactions.add" \
        -H "Authorization: Bearer ${SLACK_TOKEN}" \
        -H "Content-Type: application/json; charset=utf-8" \
        -d "{
            \"channel\": \"$channel\",
            \"timestamp\": \"$timestamp\",
            \"name\": \"$emoji\"
        }")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        log_success "Reação adicionada"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error')
        log_warning "Falha ao adicionar reação: $error"
        return 1
    fi
}

# Função: Atualizar mensagem existente
# Usage: slack_update_message "channel_id" "timestamp" "new_text"
slack_update_message() {
    local channel="$1"
    local timestamp="$2"
    local text="$3"
    
    log "Atualizando mensagem (ts: $timestamp)..."
    
    local response=$(curl -s -X POST "${SLACK_API}/chat.update" \
        -H "Authorization: Bearer ${SLACK_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"channel\": \"$channel\",
            \"ts\": \"$timestamp\",
            \"text\": \"$text\"
        }")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        log_success "Mensagem atualizada"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error')
        log_error "Falha ao atualizar: $error"
        return 1
    fi
}

# Função: Testar conexão Slack
slack_test() {
    log "Testando conexão com Slack API..."
    
    local response=$(curl -s -X POST "${SLACK_API}/auth.test" \
        -H "Authorization: Bearer ${SLACK_TOKEN}")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        local user=$(echo "$response" | jq -r '.user')
        local team=$(echo "$response" | jq -r '.team')
        log_success "Conectado como $user no workspace $team"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error')
        log_error "Falha na conexão: $error"
        return 1
    fi
}

# Exportar funções
export -f slack_send_message
export -f slack_send_blocks
export -f slack_add_reaction
export -f slack_update_message
export -f slack_test
export -f log
export -f log_success
export -f log_error
export -f log_warning
