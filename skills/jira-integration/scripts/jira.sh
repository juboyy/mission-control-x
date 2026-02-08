#!/bin/bash
# Jira CLI - Simple wrapper for Jira REST API
# Usage: ./jira.sh <command> [args]

set -e

# Load credentials from environment or .env
if [ -f "$HOME/.openclaw/workspace/.env" ]; then
    source "$HOME/.openclaw/workspace/.env"
fi

# Required variables
JIRA_URL="${JIRA_URL:-}"
JIRA_USER="${JIRA_USER:-}"
JIRA_TOKEN="${JIRA_TOKEN:-}"
JIRA_PROJECT="${JIRA_PROJECT:-}"

if [ -z "$JIRA_URL" ] || [ -z "$JIRA_USER" ] || [ -z "$JIRA_TOKEN" ]; then
    echo "Error: Missing Jira credentials"
    echo "Set JIRA_URL, JIRA_USER, and JIRA_TOKEN in ~/.openclaw/workspace/.env"
    exit 1
fi

AUTH="$JIRA_USER:$JIRA_TOKEN"
API="$JIRA_URL/rest/api/3"

# Helper function for API calls
jira_get() {
    curl -s -u "$AUTH" -H "Accept: application/json" "$API$1"
}

jira_post() {
    curl -s -X POST -u "$AUTH" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        "$API$1" -d "$2"
}

# Commands
case "$1" in
    me|myself)
        jira_get "/myself" | jq '{displayName, emailAddress, accountId}'
        ;;
    
    query|search|jql)
        JQL="${2:-assignee = currentUser() AND status != Done}"
        jira_get "/search?jql=$(echo "$JQL" | jq -Rr @uri)&maxResults=50" | \
            jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name, priority: .fields.priority.name}'
        ;;
    
    my-tickets|mine)
        jira_get "/search?jql=assignee=currentUser()+AND+status!=Done&maxResults=20" | \
            jq -r '.issues[] | "[\(.key)] \(.fields.status.name): \(.fields.summary)"'
        ;;
    
    sprint)
        # Get current sprint issues
        JQL="sprint in openSprints() AND project = $JIRA_PROJECT"
        jira_get "/search?jql=$(echo "$JQL" | jq -Rr @uri)&maxResults=100" | \
            jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName}'
        ;;
    
    issue|get)
        ISSUE="$2"
        jira_get "/issue/$ISSUE" | \
            jq '{key, summary: .fields.summary, description: .fields.description, status: .fields.status.name, assignee: .fields.assignee.displayName, priority: .fields.priority.name, created: .fields.created, updated: .fields.updated}'
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
        jira_post "/issue/$ISSUE/comment" "$BODY" | jq '{id, created, body: .body.content[0].content[0].text}'
        ;;
    
    assign)
        ISSUE="$2"
        EMAIL="$3"
        # Get accountId from email
        ACCOUNT_ID=$(jira_get "/user/search?query=$EMAIL" | jq -r '.[0].accountId')
        jira_post "/issue/$ISSUE/assignee" "{\"accountId\":\"$ACCOUNT_ID\"}"
        echo "Assigned $ISSUE to $EMAIL"
        ;;
    
    transition|move)
        ISSUE="$2"
        STATUS="$3"
        # Get available transitions
        TRANSITIONS=$(jira_get "/issue/$ISSUE/transitions")
        TRANSITION_ID=$(echo "$TRANSITIONS" | jq -r ".transitions[] | select(.name == \"$STATUS\") | .id")
        if [ -n "$TRANSITION_ID" ]; then
            jira_post "/issue/$ISSUE/transitions" "{\"transition\":{\"id\":\"$TRANSITION_ID\"}}"
            echo "Moved $ISSUE to $STATUS"
        else
            echo "Available transitions:"
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
        jira_post "/issue" "$BODY" | jq '{key, self}'
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
        jira_post "/issue" "$BODY" | jq '{key, self}'
        ;;
    
    count-bugs)
        JQL="project = $JIRA_PROJECT AND type = Bug AND status != Done"
        jira_get "/search?jql=$(echo "$JQL" | jq -Rr @uri)&maxResults=0" | jq '.total'
        ;;
    
    projects)
        jira_get "/project" | jq '.[] | {key, name}'
        ;;
    
    *)
        echo "Jira CLI - Commands:"
        echo "  me              - Show current user"
        echo "  my-tickets      - List my open tickets"
        echo "  query 'JQL'     - Run JQL query"
        echo "  sprint          - Current sprint issues"
        echo "  issue KEY       - Get issue details"
        echo "  comment KEY 'text' - Add comment"
        echo "  assign KEY email   - Assign issue"
        echo "  transition KEY status - Move issue"
        echo "  create-bug 'title' ['desc'] - Create bug"
        echo "  create-story 'title' ['desc'] - Create story"
        echo "  count-bugs      - Count open bugs"
        echo "  projects        - List projects"
        ;;
esac
