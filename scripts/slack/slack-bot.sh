#!/bin/bash
# Slack Bot - Revenue-OS Team Assistant
# Created: 2026-02-12
# Purpose: Responder perguntas do time, executar apenas comandos do João

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/slack-client.sh"

# ==========================================
# CONFIGURAÇÃO DE PERMISSÕES
# ==========================================

# João's Slack User ID (ADMIN - controle total)
ADMIN_USER_ID="U123456789"  # TODO: Pegar do Slack API

# Time IDs (READ-ONLY - podem fazer perguntas)
declare -A TEAM_MEMBERS=(
    ["U987654321"]="Rodrigo"
    ["U111222333"]="Ana"
    # Adicionar outros membros
)

# Canais monitorados
MONITORED_CHANNELS=(
    "C07TM123456"  # #tech-discussion
    "C07TM789012"  # #sprint-current
    # Adicionar outros
)

# ==========================================
# VERIFICAR PERMISSÃO
# ==========================================

is_admin() {
    local user_id="$1"
    [ "$user_id" = "$ADMIN_USER_ID" ]
}

is_team_member() {
    local user_id="$1"
    [[ -v TEAM_MEMBERS[$user_id] ]]
}

get_user_name() {
    local user_id="$1"
    echo "${TEAM_MEMBERS[$user_id]:-Unknown}"
}

# ==========================================
# PROCESSAR MENSAGEM
# ==========================================

process_message() {
    local channel="$1"
    local user_id="$2"
    local text="$3"
    local ts="$4"
    
    # Ignorar mensagens de bots
    if [[ "$text" == *"bot_id"* ]]; then
        return
    fi
    
    # Detectar menção ao bot (@revenue-os-bot ou keyword)
    if [[ ! "$text" =~ (@revenue-os-bot|^bot[,:]|^imu[,:]) ]]; then
        return  # Não foi mencionado
    fi
    
    log "📨 Mensagem recebida de user $user_id: $text"
    
    # Remover menção
    text=$(echo "$text" | sed 's/@revenue-os-bot//g; s/^bot[,:]//g; s/^imu[,:]//g' | xargs)
    
    # ==========================================
    # COMANDOS ADMINISTRATIVOS (JOÃO ONLY)
    # ==========================================
    
    if is_admin "$user_id"; then
        case "$text" in
            deploy*|stop*|restart*|update*)
                handle_admin_command "$channel" "$user_id" "$text" "$ts"
                return
                ;;
        esac
    fi
    
    # ==========================================
    # PERGUNTAS DO TIME (TODOS)
    # ==========================================
    
    if is_team_member "$user_id" || is_admin "$user_id"; then
        handle_team_question "$channel" "$user_id" "$text" "$ts"
        return
    fi
    
    # Usuário não autorizado
    log_warn "❌ Usuário $user_id não autorizado"
    slack_send_thread "$channel" "$ts" "⚠️ Você não tem permissão para interagir comigo. Fale com João."
}

# ==========================================
# HANDLER: COMANDOS ADMIN
# ==========================================

handle_admin_command() {
    local channel="$1"
    local user_id="$2"
    local text="$3"
    local ts="$4"
    
    log "🔐 Comando admin de João: $text"
    
    # Enviar ACK imediato
    slack_send_thread "$channel" "$ts" "⚙️ Executando comando..."
    
    case "$text" in
        deploy*)
            # Exemplo: deploy edge functions
            result=$(cd /home/ubuntu/.openclaw/workspace/revenue-OS-1622 && supabase functions deploy 2>&1)
            slack_send_thread "$channel" "$ts" "✅ Deploy concluído:\n\`\`\`$result\`\`\`"
            ;;
        
        status*)
            # Status do sistema
            result=$(systemctl status openclaw --no-pager 2>&1 | head -20)
            slack_send_thread "$channel" "$ts" "📊 Status:\n\`\`\`$result\`\`\`"
            ;;
        
        *)
            slack_send_thread "$channel" "$ts" "❓ Comando desconhecido. Comandos disponíveis: deploy, status, restart, update"
            ;;
    esac
}

# ==========================================
# HANDLER: PERGUNTAS DO TIME
# ==========================================

handle_team_question() {
    local channel="$1"
    local user_id="$2"
    local question="$3"
    local ts="$4"
    
    local user_name=$(get_user_name "$user_id")
    log "💬 Pergunta de $user_name: $question"
    
    # Enviar ACK imediato
    slack_send_thread "$channel" "$ts" "🤔 Pesquisando..."
    
    # ==========================================
    # BUSCAR RESPOSTA (usando RAG + Memory)
    # ==========================================
    
    # 1. Buscar no código (agentlens)
    code_context=$(find_in_codebase "$question" 2>/dev/null || echo "")
    
    # 2. Buscar na memória (memory_search)
    memory_context=$(search_memory "$question" 2>/dev/null || echo "")
    
    # 3. Buscar na documentação
    docs_context=$(search_docs "$question" 2>/dev/null || echo "")
    
    # 4. Gerar resposta com LLM (Claude via OpenClaw sessions_send)
    answer=$(generate_answer "$question" "$code_context" "$memory_context" "$docs_context")
    
    # Enviar resposta em thread
    slack_send_thread "$channel" "$ts" "$answer"
    
    # Log para auditoria
    echo "$(date -Iseconds) | $user_name | $question | $answer" >> /tmp/slack-bot-qa.log
}

# ==========================================
# HELPER: BUSCAR NO CODEBASE
# ==========================================

find_in_codebase() {
    local query="$1"
    
    # Usar agentlens para buscar código relevante
    cd /home/ubuntu/.openclaw/workspace/revenue-OS-1622
    
    # Exemplo: buscar arquivos TypeScript relacionados
    rg --type ts --ignore-case "$query" src/ 2>/dev/null | head -10 || echo ""
}

# ==========================================
# HELPER: BUSCAR NA MEMÓRIA
# ==========================================

search_memory() {
    local query="$1"
    
    # Usar memory_search do OpenClaw
    # TODO: Implementar via openclaw CLI ou sessions_send
    grep -ri "$query" /home/ubuntu/.openclaw/workspace/memory/ 2>/dev/null | head -5 || echo ""
}

# ==========================================
# HELPER: BUSCAR NA DOCUMENTAÇÃO
# ==========================================

search_docs() {
    local query="$1"
    
    grep -ri "$query" /home/ubuntu/.openclaw/workspace/docs/ 2>/dev/null | head -5 || echo ""
}

# ==========================================
# HELPER: GERAR RESPOSTA COM LLM
# ==========================================

generate_answer() {
    local question="$1"
    local code_context="$2"
    local memory_context="$3"
    local docs_context="$4"
    
    # Construir prompt
    local prompt="Você é Imu 🌀, Symbiotic Architect do revenue-OS.

**Pergunta do time:** $question

**Contexto do código:**
$code_context

**Contexto da memória:**
$memory_context

**Contexto da documentação:**
$docs_context

**Instruções:**
- Responda de forma clara e técnica
- Use código/exemplos quando útil
- Se não souber, diga 'Não tenho certeza, mas posso investigar'
- Seja conciso (max 300 palavras)
- Use Markdown para formatação

**Resposta:**"

    # Chamar LLM via OpenClaw sessions_send
    # TODO: Implementar via openclaw CLI
    
    # Placeholder: resposta mock
    echo "🤖 Resposta mockada (integração LLM pendente)

**Sobre:** $question

Baseado no código e documentação, aqui está o que encontrei:

$code_context

Para mais detalhes, confira: https://github.com/juboyy/revenue-OS"
}

# ==========================================
# SLACK HELPER: ENVIAR EM THREAD
# ==========================================

slack_send_thread() {
    local channel="$1"
    local parent_ts="$2"
    local message="$3"
    
    curl -s -X POST https://slack.com/api/chat.postMessage \
        -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"channel\": \"$channel\",
            \"thread_ts\": \"$parent_ts\",
            \"text\": $(echo "$message" | jq -Rs .)
        }" > /dev/null
}

# ==========================================
# MAIN: PROCESSAR EVENTOS DO SLACK
# ==========================================

process_slack_events() {
    log "🎧 Slack Bot iniciado. Monitorando canais..."
    
    # Usar Slack Events API (webhook) ou RTM
    # TODO: Configurar webhook listener
    
    # Placeholder: processar eventos mock
    while true; do
        # Fetch new messages via Slack API
        # process_message "$channel" "$user_id" "$text" "$ts"
        
        sleep 5
    done
}

# ==========================================
# ENTRYPOINT
# ==========================================

if [ "${1:-}" = "daemon" ]; then
    process_slack_events
else
    # Modo de teste
    echo "Usage: $0 daemon"
    echo "Ou chame process_message diretamente para debug"
fi
