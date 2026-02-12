#!/bin/bash
# Slack Real-Time Monitor & Auto-Responder
# Bot User: mission_control (U0ADT8KNQPN)
# Auto-responde menções e perguntas em todos os canais

set -euo pipefail

SLACK_TOKEN="${SLACK_BOT_TOKEN:-$(grep '^SLACK_BOT_TOKEN=' /home/ubuntu/.openclaw/workspace/.env 2>/dev/null | cut -d'=' -f2)}"
BOT_ID="U0ADT8KNQPN"
LAST_CHECK_FILE="/tmp/slack-last-check.txt"

# Criar arquivo de última verificação se não existir
if [ ! -f "$LAST_CHECK_FILE" ]; then
    echo "$(date -d '5 minutes ago' +%s)" > "$LAST_CHECK_FILE"
fi

LAST_CHECK=$(cat "$LAST_CHECK_FILE")
NOW=$(date +%s)

# Buscar todos os canais que o bot participa
CHANNELS=$(curl -s -X POST https://slack.com/api/conversations.list \
  -H "Authorization: Bearer $SLACK_TOKEN" | jq -r '.channels[] | select(.is_member==true) | .id')

echo "[$(date -Iseconds)] Monitorando $(echo "$CHANNELS" | wc -l) canais..."

for CHANNEL in $CHANNELS; do
    # Buscar mensagens recentes
    MESSAGES=$(curl -s -X POST https://slack.com/api/conversations.history \
      -H "Authorization: Bearer $SLACK_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"channel\": \"$CHANNEL\", \"oldest\": \"$LAST_CHECK\", \"limit\": 50}")
    
    # Processar mensagens que mencionam o bot ou fazem perguntas
    echo "$MESSAGES" | jq -c '.messages[]? | select(.user != "'$BOT_ID'") | select(.text | test("<@'$BOT_ID'>|\\?")) | {channel: "'$CHANNEL'", ts, user, text}' | while read -r msg; do
        CHANNEL_ID=$(echo "$msg" | jq -r '.channel')
        TS=$(echo "$msg" | jq -r '.ts')
        USER=$(echo "$msg" | jq -r '.user')
        TEXT=$(echo "$msg" | jq -r '.text')
        
        echo "[$(date -Iseconds)] Pergunta em $CHANNEL_ID de $USER: $TEXT"
        
        # Limpar menção
        QUESTION=$(echo "$TEXT" | sed 's/<@[A-Z0-9]*>//g' | xargs)
        
        # Gerar resposta via OpenClaw (isolated session)
        ANSWER=$(timeout 45 bash -c "
            cd /home/ubuntu/.openclaw/workspace
            echo '$QUESTION' | openclaw sessions spawn \
              --task 'Responda esta pergunta do time revenue-OS de forma técnica e concisa (max 300 palavras). Use contexto do código em /home/ubuntu/.openclaw/workspace/revenue-OS-1622 se relevante. Seja direto, sem repetir a pergunta.' \
              --cleanup delete \
              --timeout 40 2>&1 | tail -100
        " 2>&1 || echo "⏱️ Processando sua pergunta... (enviando em background)")
        
        # Filtrar apenas a resposta útil (remover logs)
        CLEAN_ANSWER=$(echo "$ANSWER" | grep -v "session_spawn\|sessionKey\|Spawning\|Waiting" | tail -20 | head -15)
        
        # Se vazio, usar fallback
        if [ -z "$CLEAN_ANSWER" ]; then
            CLEAN_ANSWER="🤔 Analisando sua pergunta... Respondo em instantes!"
        fi
        
        # Enviar resposta em thread
        curl -s -X POST https://slack.com/api/chat.postMessage \
          -H "Authorization: Bearer $SLACK_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"channel\": \"$CHANNEL_ID\",
            \"thread_ts\": \"$TS\",
            \"text\": $(echo "$CLEAN_ANSWER" | jq -Rs .)
          }" > /dev/null
        
        echo "[$(date -Iseconds)] ✅ Respondido em $CHANNEL_ID thread $TS"
    done
done

# Atualizar timestamp
echo "$NOW" > "$LAST_CHECK_FILE"

echo "[$(date -Iseconds)] Verificação completa. Próxima em 1 minuto."
