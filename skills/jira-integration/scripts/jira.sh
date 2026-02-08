#!/bin/bash
# Jira CLI - Wrapper for Jira REST API v3
# Usage: ./jira.sh <command> [args]

set -e

# Load credentials
if [ -f "$HOME/.openclaw/workspace/.env" ]; then
    source "$HOME/.openclaw/workspace/.env"
fi

# Required variables
JIRA_URL="${JIRA_URL:-}"
JIRA_USER="${JIRA_USER:-}"
JIRA_TOKEN="${JIRA_TOKEN:-}"
JIRA_PROJECT="${JIRA_PROJECT:-SCRUM}"

if [ -z "$JIRA_URL" ] || [ -z "$JIRA_USER" ] || [ -z "$JIRA_TOKEN" ]; then
    echo "Error: Missing Jira credentials in ~/.openclaw/workspace/.env"
    exit 1
fi

AUTH="$JIRA_USER:$JIRA_TOKEN"
API="$JIRA_URL/rest/api/3"
WIKI="$JIRA_URL/wiki/rest/api"

# Helper functions
jira_get() {
    curl -s -u "$AUTH" -H "Accept: application/json" "$API$1"
}

jira_post() {
    curl -s -X POST -u "$AUTH" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        "$API$1" -d "$2"
}

jira_search() {
    local JQL="$1"
    local MAX="${2:-50}"
    curl -s -X POST -u "$AUTH" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        "$API/search/jql" \
        -d "{\"jql\":\"$JQL\",\"maxResults\":$MAX,\"fields\":[\"summary\",\"status\",\"priority\",\"assignee\",\"key\"]}"
}

wiki_get() {
    curl -s -u "$AUTH" -H "Accept: application/json" "$WIKI$1"
}

# Commands
case "$1" in
    me|myself)
        jira_get "/myself" | jq '{displayName, emailAddress, accountId}'
        ;;
    
    query|search|jql)
        JQL="${2:-project=$JIRA_PROJECT ORDER BY created DESC}"
        jira_search "$JQL" 50 | \
            jq -r '.issues[] | "[\(.key)] \(.fields.status.name): \(.fields.summary)"'
        ;;
    
    my-tickets|mine)
        jira_search "assignee=currentUser() AND status!=Done ORDER BY updated DESC" 20 | \
            jq -r '.issues[] | "[\(.key)] \(.fields.status.name): \(.fields.summary)"'
        ;;
    
    backlog)
        jira_search "project=$JIRA_PROJECT AND status=Backlog ORDER BY created DESC" 20 | \
            jq -r '.issues[] | "[\(.key)] \(.fields.summary)"'
        ;;
    
    in-progress)
        jira_search "project=$JIRA_PROJECT AND status=\"In Progress\" ORDER BY updated DESC" 20 | \
            jq -r '.issues[] | "[\(.key)] \(.fields.assignee.displayName // "Unassigned"): \(.fields.summary)"'
        ;;
    
    sprint)
        jira_search "project=$JIRA_PROJECT AND sprint in openSprints() ORDER BY rank" 100 | \
            jq -r '.issues[] | "[\(.key)] \(.fields.status.name) | \(.fields.assignee.displayName // "-"): \(.fields.summary)"'
        ;;
    
    issue|get)
        ISSUE="$2"
        jira_get "/issue/$ISSUE" | \
            jq '{key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName, priority: .fields.priority.name, created: .fields.created, updated: .fields.updated}'
        ;;
    
    comment)
        ISSUE="$2"
        TEXT="$3"
        BODY=$(jq -n --arg text "$TEXT" '{
            body: {
                type: "doc",
                version: 1,
                content: [{
                    type: "paragraph",
                    content: [{type: "text", text: $text}]
                }]
            }
        }')
        jira_post "/issue/$ISSUE/comment" "$BODY" | jq '{id, created}'
        echo "✓ Comentário adicionado em $ISSUE"
        ;;
    
    assign)
        ISSUE="$2"
        EMAIL="$3"
        ACCOUNT_ID=$(jira_get "/user/search?query=$EMAIL" | jq -r '.[0].accountId')
        if [ "$ACCOUNT_ID" != "null" ] && [ -n "$ACCOUNT_ID" ]; then
            curl -s -X PUT -u "$AUTH" -H "Content-Type: application/json" \
                "$API/issue/$ISSUE/assignee" -d "{\"accountId\":\"$ACCOUNT_ID\"}" > /dev/null
            echo "✓ $ISSUE atribuído para $EMAIL"
        else
            echo "✗ Usuário não encontrado: $EMAIL"
        fi
        ;;
    
    transition|move)
        ISSUE="$2"
        STATUS="$3"
        TRANSITIONS=$(jira_get "/issue/$ISSUE/transitions")
        TRANSITION_ID=$(echo "$TRANSITIONS" | jq -r ".transitions[] | select(.name | test(\"$STATUS\"; \"i\")) | .id" | head -1)
        if [ -n "$TRANSITION_ID" ] && [ "$TRANSITION_ID" != "null" ]; then
            jira_post "/issue/$ISSUE/transitions" "{\"transition\":{\"id\":\"$TRANSITION_ID\"}}" > /dev/null
            echo "✓ $ISSUE movido para $STATUS"
        else
            echo "Transições disponíveis:"
            echo "$TRANSITIONS" | jq -r '.transitions[] | "  - \(.name)"'
        fi
        ;;
    
    create-bug|bug)
        SUMMARY="$2"
        DESC="${3:-}"
        BODY=$(jq -n --arg sum "$SUMMARY" --arg desc "$DESC" --arg proj "$JIRA_PROJECT" '{
            fields: {
                project: {key: $proj},
                summary: $sum,
                description: {
                    type: "doc",
                    version: 1,
                    content: [{type: "paragraph", content: [{type: "text", text: $desc}]}]
                },
                issuetype: {name: "Bug"}
            }
        }')
        RESULT=$(jira_post "/issue" "$BODY")
        echo "$RESULT" | jq -r '"✓ Criado: \(.key)"'
        ;;
    
    create-story|story)
        SUMMARY="$2"
        DESC="${3:-}"
        BODY=$(jq -n --arg sum "$SUMMARY" --arg desc "$DESC" --arg proj "$JIRA_PROJECT" '{
            fields: {
                project: {key: $proj},
                summary: $sum,
                description: {
                    type: "doc",
                    version: 1,
                    content: [{type: "paragraph", content: [{type: "text", text: $desc}]}]
                },
                issuetype: {name: "Story"}
            }
        }')
        RESULT=$(jira_post "/issue" "$BODY")
        echo "$RESULT" | jq -r '"✓ Criado: \(.key)"'
        ;;
    
    count-bugs)
        jira_search "project=$JIRA_PROJECT AND type=Bug AND status!=Done" 0 | jq '.total // 0'
        ;;
    
    projects)
        jira_get "/project" | jq '.[] | {key, name}'
        ;;
    
    # Confluence commands
    spaces)
        wiki_get "/space" | jq '.results[] | {key, name}'
        ;;
    
    pages)
        SPACE="${2:-VR}"
        wiki_get "/content?spaceKey=$SPACE&limit=20" | jq '.results[] | {id, title}'
        ;;
    
    page)
        PAGE_ID="$2"
        wiki_get "/content/$PAGE_ID?expand=body.storage" | jq '{id, title, body: .body.storage.value}'
        ;;
    
    search-wiki)
        QUERY=$(echo "$2" | jq -Rr @uri)
        wiki_get "/content/search?cql=text~%22$QUERY%22&limit=10" | jq '.results[] | {id, title}'
        ;;
    
    *)
        echo "Jira/Confluence CLI - Commands:"
        echo ""
        echo "JIRA:"
        echo "  me              - Show current user"
        echo "  my-tickets      - List my open tickets"
        echo "  query 'JQL'     - Run JQL query"
        echo "  backlog         - Show backlog items"
        echo "  in-progress     - Show in-progress items"
        echo "  sprint          - Current sprint issues"
        echo "  issue KEY       - Get issue details"
        echo "  comment KEY 'text' - Add comment"
        echo "  assign KEY email   - Assign issue"
        echo "  transition KEY status - Move issue"
        echo "  create-bug 'title' ['desc'] - Create bug"
        echo "  create-story 'title' ['desc'] - Create story"
        echo "  count-bugs      - Count open bugs"
        echo "  projects        - List projects"
        echo ""
        echo "CONFLUENCE:"
        echo "  spaces          - List spaces"
        echo "  pages [SPACE]   - List pages in space"
        echo "  page ID         - Get page content"
        echo "  search-wiki 'text' - Search wiki"
        ;;
esac
