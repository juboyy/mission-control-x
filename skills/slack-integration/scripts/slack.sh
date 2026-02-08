#!/bin/bash
# Slack CLI - Wrapper for Slack API
# Usage: ./slack.sh <command> [args]

set -e

# Load credentials
if [ -f "$HOME/.openclaw/workspace/.env" ]; then
    source "$HOME/.openclaw/workspace/.env"
fi

SLACK_TOKEN="${SLACK_BOT_TOKEN:-}"
API="https://slack.com/api"

if [ -z "$SLACK_TOKEN" ]; then
    echo "Error: SLACK_BOT_TOKEN not set in ~/.openclaw/workspace/.env"
    exit 1
fi

# Helper functions
slack_get() {
    curl -s -H "Authorization: Bearer $SLACK_TOKEN" "$API$1"
}

slack_post() {
    curl -s -X POST -H "Authorization: Bearer $SLACK_TOKEN" \
        -H "Content-Type: application/json" \
        "$API$1" -d "$2"
}

# Commands
case "$1" in
    test|auth)
        slack_get "/auth.test" | jq '{ok, team, user, url}'
        ;;
    
    channels|list)
        slack_get "/conversations.list?types=public_channel,private_channel&limit=100" | \
            jq -r '.channels[] | "[\(if .is_private then "🔒" else "#" end)\(.name)] \(.num_members) members"'
        ;;
    
    create)
        NAME="${2#\#}"  # Remove # if present
        slack_post "/conversations.create" "{\"name\":\"$NAME\"}" | \
            jq '{ok, channel: .channel.name, id: .channel.id}'
        ;;
    
    archive)
        CHANNEL="${2#\#}"
        # Get channel ID
        CHANNEL_ID=$(slack_get "/conversations.list?types=public_channel,private_channel" | \
            jq -r ".channels[] | select(.name == \"$CHANNEL\") | .id")
        if [ -n "$CHANNEL_ID" ]; then
            slack_post "/conversations.archive" "{\"channel\":\"$CHANNEL_ID\"}" | jq '.ok'
            echo "✓ Archived #$CHANNEL"
        else
            echo "✗ Channel not found: $CHANNEL"
        fi
        ;;
    
    send|post)
        CHANNEL="$2"
        TEXT="$3"
        slack_post "/chat.postMessage" "{\"channel\":\"$CHANNEL\",\"text\":\"$TEXT\"}" | \
            jq '{ok, ts: .ts, channel: .channel}'
        ;;
    
    send-blocks)
        CHANNEL="$2"
        BLOCKS="$3"
        slack_post "/chat.postMessage" "{\"channel\":\"$CHANNEL\",\"blocks\":$BLOCKS}" | \
            jq '{ok, ts: .ts}'
        ;;
    
    invite)
        CHANNEL="${2#\#}"
        USER="$3"
        CHANNEL_ID=$(slack_get "/conversations.list" | jq -r ".channels[] | select(.name == \"$CHANNEL\") | .id")
        USER_ID=$(slack_get "/users.list" | jq -r ".members[] | select(.name == \"$USER\" or .profile.email == \"$USER\") | .id")
        if [ -n "$CHANNEL_ID" ] && [ -n "$USER_ID" ]; then
            slack_post "/conversations.invite" "{\"channel\":\"$CHANNEL_ID\",\"users\":\"$USER_ID\"}" | jq '.ok'
        fi
        ;;
    
    users)
        slack_get "/users.list" | jq -r '.members[] | select(.deleted == false) | "[@\(.name)] \(.profile.real_name // .name)"'
        ;;
    
    setup-mcx)
        echo "🌀 Creating Mission Control X channel structure..."
        
        # Core
        ./slack.sh create "mission-control" 2>/dev/null || true
        ./slack.sh create "announcements" 2>/dev/null || true
        ./slack.sh create "standup" 2>/dev/null || true
        
        # Crew
        ./slack.sh create "crew-dev" 2>/dev/null || true
        ./slack.sh create "crew-product" 2>/dev/null || true
        ./slack.sh create "crew-research" 2>/dev/null || true
        ./slack.sh create "crew-qa" 2>/dev/null || true
        
        # Jira
        ./slack.sh create "jira-updates" 2>/dev/null || true
        ./slack.sh create "jira-blockers" 2>/dev/null || true
        ./slack.sh create "sprint-current" 2>/dev/null || true
        
        # AI
        ./slack.sh create "agent-logs" 2>/dev/null || true
        ./slack.sh create "agent-alerts" 2>/dev/null || true
        
        # revenue-OS
        ./slack.sh create "revenueos-general" 2>/dev/null || true
        ./slack.sh create "revenueos-api" 2>/dev/null || true
        ./slack.sh create "revenueos-frontend" 2>/dev/null || true
        ./slack.sh create "revenueos-infra" 2>/dev/null || true
        
        echo "✓ Channel structure created!"
        ./slack.sh channels
        ;;
    
    post-standup)
        # Get Jira data and post standup
        source "$HOME/.openclaw/workspace/.env"
        
        IN_PROGRESS=$(curl -s -X POST -u "$JIRA_USER:$JIRA_TOKEN" \
            -H "Content-Type: application/json" \
            "$JIRA_URL/rest/api/3/search/jql" \
            -d '{"jql":"project=SCRUM AND status=\"EM ANDAMENTO\"","maxResults":10,"fields":["summary","assignee","key"]}' | \
            jq -r '.issues[] | "• [\(.key)] \(.fields.summary) (@\(.fields.assignee.displayName // "unassigned"))"')
        
        BLOCKED=$(curl -s -X POST -u "$JIRA_USER:$JIRA_TOKEN" \
            -H "Content-Type: application/json" \
            "$JIRA_URL/rest/api/3/search/jql" \
            -d '{"jql":"project=SCRUM AND status=Blocked","maxResults":10,"fields":["summary","key"]}' | \
            jq -r '.issues[] | "🚫 [\(.key)] \(.fields.summary)"')
        
        MSG="*🌅 Daily Standup - $(date '+%d/%m/%Y')*\n\n"
        MSG+="*Em Andamento:*\n${IN_PROGRESS:-Nenhum}\n\n"
        MSG+="*Bloqueados:*\n${BLOCKED:-Nenhum}"
        
        ./slack.sh send "#standup" "$MSG"
        ;;
    
    *)
        echo "Slack CLI - Commands:"
        echo ""
        echo "  test            - Test authentication"
        echo "  channels        - List all channels"
        echo "  create #name    - Create channel"
        echo "  archive #name   - Archive channel"
        echo "  send #ch 'msg'  - Send message"
        echo "  invite #ch user - Invite user to channel"
        echo "  users           - List users"
        echo ""
        echo "  setup-mcx       - Create Mission Control structure"
        echo "  post-standup    - Post daily standup to #standup"
        ;;
esac
