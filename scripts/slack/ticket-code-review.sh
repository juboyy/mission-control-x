#!/bin/bash
# ticket-code-review.sh - Notifica Code Review no Slack
set -e

TICKET_KEY=${1:-}
TITLE=${2:-}
COMMIT_URL=${3:-}

if [[ -z "$TICKET_KEY" ]]; then
  echo "Usage: $0 TICKET_KEY [TITLE] [COMMIT_URL]"
  exit 1
fi

source "$(dirname "$0")/channels-config.sh"

JIRA_URL="https://vivaldi-revopos.atlassian.net/browse/${TICKET_KEY}"

MESSAGE="🔍 *Code Review Needed*

📋 Ticket: <${JIRA_URL}|${TICKET_KEY}>
📝 Título: ${TITLE:-N/A}
🔗 Commit: ${COMMIT_URL:-N/A}

Status: Aguardando revisão"

curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer ${SLACK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"${CHANNEL_SPRINT_CURRENT}\",
    \"text\": \"Code Review: ${TICKET_KEY}\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"${MESSAGE}\"
        }
      }
    ]
  }" > /dev/null

echo "✅ Notificação enviada para #sprint-current"
