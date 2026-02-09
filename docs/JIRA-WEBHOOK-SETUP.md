# Configuração de Webhook Jira → Mission Control X

## Endpoint

```
POST https://ricky-arrested-arrested-aids.trycloudflare.com/api/webhooks/jira
```

## Passos para Configurar no Jira Cloud

### 1. Acessar Automação

1. Vá para **Project Settings** → **Automation**
2. Ou acesse: https://vivaldi-revopos.atlassian.net/jira/settings/projects/SCRUM/automation

### 2. Criar Nova Regra

1. Clique em **Create rule**
2. Selecione o trigger **Issue transitioned** (ou outro evento desejado)

### 3. Configurar Trigger

Escolha os eventos:
- ✅ Issue created
- ✅ Issue updated
- ✅ Issue transitioned
- ✅ Comment added

### 4. Adicionar Ação: Send web request

1. Clique **Add component** → **Send web request**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Web request URL** | `https://ricky-arrested-arrested-aids.trycloudflare.com/api/webhooks/jira` |
| **HTTP method** | POST |
| **Web request body** | Custom data |

### 5. Body do Request (JSON)

```json
{
  "webhookEvent": "{{triggerType}}",
  "issue": {
    "key": "{{issue.key}}",
    "fields": {
      "summary": "{{issue.summary}}",
      "status": {
        "name": "{{issue.status.name}}"
      },
      "priority": {
        "name": "{{issue.priority.name}}"
      },
      "assignee": {
        "displayName": "{{issue.assignee.displayName}}"
      }
    }
  },
  "changelog": {
    "items": []
  },
  "user": {
    "displayName": "{{initiator.displayName}}"
  }
}
```

### 6. Headers

```
Content-Type: application/json
```

### 7. Ativar Regra

1. Dê um nome: "MCX Webhook - Sync"
2. Clique **Turn it on**

## Eventos Capturados

O MCX armazena todos os eventos em `/api/webhooks/jira/events`:

```bash
curl https://ricky-arrested-arrested-aids.trycloudflare.com/api/webhooks/jira/events?limit=10
```

## Processamento dos Eventos

Os eventos são armazenados em `taskflow/data/jira-events.jsonl` para processamento pelo agente.

### Cron de Processamento (Opcional)

Você pode criar um cron para processar eventos:

```
Schedule: */15 * * * * (a cada 15 min)
Ação: Ler eventos não processados e tomar ações
```

## Troubleshooting

### Testar Webhook Manualmente

```bash
curl -X POST https://ricky-arrested-arrested-aids.trycloudflare.com/api/webhooks/jira \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent": "test", "issue": {"key": "TEST-1"}}'
```

### Ver Logs

```bash
cat /home/ubuntu/.openclaw/workspace/taskflow/data/jira-events.jsonl
```

## Nota sobre URL

A URL do Cloudflare Tunnel é **temporária**. Se o servidor reiniciar, uma nova URL será gerada. 

Para URL permanente, considere:
1. Cloudflare Tunnel com domínio próprio
2. ngrok com domínio fixo
3. Servidor público com domínio
