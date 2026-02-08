---
name: slack-integration
description: Slack integration for team communication. Create channels, send messages, organize workspace, and automate notifications from Jira/MCX.
---

# Slack Integration

## Setup

1. Create Slack App: https://api.slack.com/apps
2. Add Bot Token Scopes:
   - `channels:read`, `channels:write`, `channels:manage`
   - `chat:write`, `chat:write.public`
   - `users:read`, `groups:read`, `groups:write`
3. Install to workspace
4. Copy Bot Token to `.env`:

```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_WORKSPACE=your-workspace.slack.com
```

## Commands

### Channels
```bash
./slack.sh channels           # List channels
./slack.sh create "#name"     # Create channel
./slack.sh archive "#name"    # Archive channel
./slack.sh invite "#channel" "@user"
```

### Messages
```bash
./slack.sh send "#channel" "message"
./slack.sh thread "#channel" "ts" "reply"
```

### Organization
```bash
./slack.sh setup-mcx          # Create Mission Control structure
./slack.sh sync-jira          # Post Jira updates
```

## API Reference

Base URL: `https://slack.com/api/`

### Post Message
```bash
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"#general","text":"Hello!"}'
```

### Create Channel
```bash
curl -X POST https://slack.com/api/conversations.create \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"new-channel"}'
```

### List Channels
```bash
curl https://slack.com/api/conversations.list \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN"
```

## Automations

See CHANNELS.md for proposed channel structure and automation flows.
