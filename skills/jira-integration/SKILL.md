---
name: jira-integration
description: Jira & Confluence integration for project management. Use for creating/updating tickets, querying issues, managing sprints, and syncing with Confluence docs.
---

# Jira & Confluence Integration

## Setup

Store credentials in `TOOLS.md`:

```markdown
### Jira
- URL: https://your-domain.atlassian.net
- Username: your.email@company.com
- API Token: (stored securely)
```

Create API token: https://id.atlassian.com/manage-profile/security/api-tokens

## Commands

### Query Issues

```bash
# Get my open issues
./scripts/jira.sh query "assignee = currentUser() AND status != Done"

# Get sprint issues
./scripts/jira.sh sprint

# Search by text
./scripts/jira.sh search "autenticação"
```

### Create/Update Issues

```bash
# Create bug
./scripts/jira.sh create-bug "Login fails on mobile" "Steps to reproduce..."

# Create story
./scripts/jira.sh create-story "User authentication" "As a user..."

# Update status
./scripts/jira.sh transition PROJ-123 "Done"

# Add comment
./scripts/jira.sh comment PROJ-123 "Tested and working"

# Assign
./scripts/jira.sh assign PROJ-456 "maria@empresa.com"
```

### Reports

```bash
# Sprint metrics
./scripts/jira.sh sprint-report

# My work summary
./scripts/jira.sh my-work

# Backlog bugs count
./scripts/jira.sh count-bugs
```

## API Reference

Base URL: `https://{domain}.atlassian.net/rest/api/3/`

### Authentication
```bash
curl -u "$JIRA_USER:$JIRA_TOKEN" \
  "$JIRA_URL/rest/api/3/myself"
```

### Search Issues (JQL)
```bash
curl -u "$JIRA_USER:$JIRA_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=assignee=currentUser()"
```

### Create Issue
```bash
curl -X POST -u "$JIRA_USER:$JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue" \
  -d '{"fields":{"project":{"key":"PROJ"},"summary":"Title","issuetype":{"name":"Bug"}}}'
```

### Transition Issue
```bash
# Get available transitions
curl -u "$JIRA_USER:$JIRA_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/PROJ-123/transitions"

# Do transition
curl -X POST -u "$JIRA_USER:$JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue/PROJ-123/transitions" \
  -d '{"transition":{"id":"31"}}'
```

### Add Comment
```bash
curl -X POST -u "$JIRA_USER:$JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue/PROJ-123/comment" \
  -d '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}}'
```

## Confluence API

Base URL: `https://{domain}.atlassian.net/wiki/rest/api/`

### Search Pages
```bash
curl -u "$JIRA_USER:$JIRA_TOKEN" \
  "$JIRA_URL/wiki/rest/api/content/search?cql=text~'keyword'"
```

### Get Page Content
```bash
curl -u "$JIRA_USER:$JIRA_TOKEN" \
  "$JIRA_URL/wiki/rest/api/content/{pageId}?expand=body.storage"
```

## Cron Automations

### Daily Standup (9h São Paulo)
```yaml
schedule:
  kind: cron
  expr: "0 12 * * 1-5"  # 9h SP = 12h UTC
  tz: America/Sao_Paulo
payload:
  kind: agentTurn
  message: |
    Run standup report:
    1. Query my in-progress tickets
    2. Query blocked tickets
    3. Query completed yesterday
    4. Format and send summary
```

### SLA Alert (every 4h)
```yaml
schedule:
  kind: every
  everyMs: 14400000  # 4 hours
payload:
  kind: agentTurn
  message: |
    Check high-priority tickets without updates in 24h.
    Alert if any found.
```

### Sprint Report (Friday 5pm)
```yaml
schedule:
  kind: cron
  expr: "0 20 * * 5"  # 17h SP = 20h UTC
payload:
  kind: agentTurn
  message: |
    Compile sprint metrics:
    - Story points completed vs planned
    - Tickets that overflowed
    - Top contributors
```
