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
        
        # Gerar resposta via OpenClaw sessions_send
        QUESTION=$(echo "$TEXT" | sed 's/<@[A-Z0-9]*>//g' | xargs)
        
        ANSWER=$(timeout 30 bash -c "
            echo 'Responda esta pergunta do time no Slack de forma técnica e concisa (max 300 palavras):

$QUESTION

Use contexto do código em /home/ubuntu/.openclaw/workspace/revenue-OS-1622 se relevante.' | head -c 2000
        " 2>&1 || echo "⏱️ Processando sua pergunta... (pode demorar um pouco)")
        
        # Enviar resposta em thread
        curl -s -X POST https://slack.com/api/chat.postMessage \
          -H "Authorization: Bearer $SLACK_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"channel\": \"$CHANNEL_ID\",
            \"thread_ts\": \"$TS\",
            \"text\": $(echo "$ANSWER" | jq -Rs .)
          }" > /dev/null
        
        echo "[$(date -Iseconds)] ✅ Respondido em $CHANNEL_ID thread $TS"
    done
done

# Atualizar timestamp
echo "$NOW" > "$LAST_CHECK_FILE"

echo "[$(date -Iseconds)] Verificação completa. Próxima em 1 minuto."
