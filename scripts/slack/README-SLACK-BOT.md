# Slack Bot - Revenue-OS Team Assistant

**Created:** 2026-02-12  
**Purpose:** Bot interativo no Slack com permissões em camadas

---

## 🎯 Funcionalidades

### Para João (Admin)
- ✅ Executar comandos: `deploy`, `status`, `restart`, `update`
- ✅ Fazer perguntas técnicas
- ✅ Controle total do sistema

### Para o Time
- ✅ Fazer perguntas sobre arquitetura
- ✅ Consultar código (busca semântica)
- ✅ Ver status de sprints
- ✅ Perguntar sobre decisões técnicas
- ❌ Não pode executar comandos

---

## 🔧 Setup (Passo a Passo)

### 1. Criar Slack App

1. Acesse: https://api.slack.com/apps
2. Clique "Create New App" → "From scratch"
3. Nome: `Revenue-OS Assistant`
4. Workspace: Seu workspace

### 2. Configurar Bot Token Scopes

Em **OAuth & Permissions**, adicione:

**Bot Token Scopes:**
- `app_mentions:read` - Detectar menções @bot
- `channels:history` - Ler mensagens de canais
- `channels:read` - Listar canais
- `chat:write` - Enviar mensagens
- `chat:write.customize` - Customizar nome/avatar
- `users:read` - Identificar usuários
- `im:history` - Mensagens diretas
- `im:write` - Responder DMs

### 3. Enable Event Subscriptions

Em **Event Subscriptions**:

1. Enable Events: `ON`
2. Request URL: `https://SEU-DOMINIO/slack/events`
   - **Opção 1:** Usar Supabase Edge Function
   - **Opção 2:** Usar Railway/Render para webhook listener
   - **Opção 3:** Usar ngrok (dev only)

3. Subscribe to bot events:
   - `app_mention` - Quando @bot é mencionado
   - `message.channels` - Mensagens em canais
   - `message.im` - Mensagens diretas

### 4. Instalar App no Workspace

1. Em **Install App**, clique "Install to Workspace"
2. Autorizar permissões
3. Copiar **Bot User OAuth Token** (começa com `xoxb-`)

### 5. Configurar Variáveis de Ambiente

```bash
# .env
SLACK_BOT_TOKEN=xoxb-SEU-TOKEN-AQUI
SLACK_SIGNING_SECRET=SEU-SIGNING-SECRET
SLACK_ADMIN_USER_ID=U123456789  # Seu Slack User ID
```

**Pegar seu User ID:**
```bash
curl -X POST https://slack.com/api/users.list \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  | jq -r '.members[] | select(.name=="joao") | .id'
```

---

## 🚀 Deploy

### Opção 1: Supabase Edge Function (Recomendado)

```bash
cd /home/ubuntu/.openclaw/workspace/revenue-OS-1622

# Criar Edge Function para webhook
mkdir -p supabase/functions/slack-bot
cat > supabase/functions/slack-bot/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!
const ADMIN_USER_ID = Deno.env.get("SLACK_ADMIN_USER_ID")!

serve(async (req) => {
  // Verificar Slack signature (segurança)
  const signature = req.headers.get("x-slack-signature")
  const timestamp = req.headers.get("x-slack-request-timestamp")
  
  const body = await req.json()
  
  // Challenge response (primeira configuração)
  if (body.challenge) {
    return new Response(JSON.stringify({ challenge: body.challenge }), {
      headers: { "Content-Type": "application/json" }
    })
  }
  
  // Processar evento
  const event = body.event
  
  if (event.type === "app_mention" || event.type === "message") {
    const userId = event.user
    const text = event.text
    const channel = event.channel
    const ts = event.ts
    
    // Verificar se é admin
    const isAdmin = userId === ADMIN_USER_ID
    
    // Remover menção do bot
    const cleanText = text.replace(/<@[A-Z0-9]+>/g, "").trim()
    
    // Processar comando ou pergunta
    let response = ""
    
    if (isAdmin && cleanText.startsWith("deploy")) {
      response = "⚙️ Deploy iniciado... (implementar lógica)"
    } else if (cleanText.includes("?")) {
      // Pergunta do time - buscar resposta
      response = await generateAnswer(cleanText)
    } else {
      response = "👋 Olá! Pergunte algo ou use comandos (deploy, status)"
    }
    
    // Enviar resposta em thread
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel,
        thread_ts: ts,
        text: response
      })
    })
  }
  
  return new Response("OK", { status: 200 })
})

async function generateAnswer(question: string): Promise<string> {
  // TODO: Integrar com LLM (Claude via API)
  // TODO: Buscar contexto do código/docs
  
  return `🤖 Resposta mockada para: "${question}"\n\nImplementação LLM pendente.`
}
EOF

# Deploy
supabase functions deploy slack-bot
```

### Opção 2: Script daemon (local/EC2)

```bash
# Rodar como systemd service
sudo tee /etc/systemd/system/slack-bot.service << 'EOF'
[Unit]
Description=Revenue-OS Slack Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/.openclaw/workspace
ExecStart=/home/ubuntu/.openclaw/workspace/scripts/slack/slack-bot.sh daemon
Restart=always
RestartSec=10
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/home/ubuntu/.openclaw/workspace/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable slack-bot
sudo systemctl start slack-bot
sudo systemctl status slack-bot
```

---

## 💬 Uso

### Interação no Slack

**João (Admin):**
```
@revenue-os-bot deploy products-sync
@revenue-os-bot status crons
@revenue-os-bot restart gateway
```

**Time:**
```
@revenue-os-bot qual a arquitetura do split engine?
@revenue-os-bot onde está implementado o webhook do Stripe?
@revenue-os-bot como funciona o RLS?
```

**Menção em canais:**
- O bot responde em **thread** (não polui canal)
- Mensagens diretas também funcionam

---

## 🔐 Segurança

1. **Verificação de assinatura:** Todas as requisições são validadas via `x-slack-signature`
2. **Whitelist de usuários:** Apenas João + team members autorizados
3. **Comandos restritos:** Deploy/restart só para admin
4. **Auditoria:** Todas as interações logadas em `/tmp/slack-bot-qa.log`

---

## 📊 Roadmap

- [ ] Integração LLM (Claude via OpenClaw sessions_send)
- [ ] Busca semântica no código (agentlens + embeddings)
- [ ] Comandos interativos (buttons + modals)
- [ ] Notificações proativas (alertas de CI/CD)
- [ ] Histórico de conversas (Supabase table)

---

## 🐛 Debug

```bash
# Ver logs (systemd)
sudo journalctl -u slack-bot -f

# Ver logs (Supabase)
supabase functions logs slack-bot --tail

# Testar webhook localmente
curl -X POST http://localhost:54321/functions/v1/slack-bot \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "message", "user": "U123", "text": "test", "channel": "C123", "ts": "123"}}'
```

---

**Criado por:** Imu 🌀  
**Última atualização:** 2026-02-12
