# 🏗️ MCX Infrastructure

Documentação da infraestrutura do Mission Control X.

## 📁 Arquivos

```
taskflow/
├── server.js              # Backend principal (porta 18950)
├── index.html             # Frontend
├── data/
│   └── session-stats.json # Stats computados (sync automático)
└── scripts/
    ├── mcx-services.sh    # Gerenciador de serviços
    ├── cloudflare-tunnel.sh # Túnel com auto-reconnect
    └── sync-stats.sh      # Sincronização de stats
```

## 🚀 Quick Start

```bash
# Iniciar todos os serviços
./scripts/mcx-services.sh start

# Ver status
./scripts/mcx-services.sh status

# Parar tudo
./scripts/mcx-services.sh stop
```

## 🔧 Scripts

### `mcx-services.sh` - Gerenciador Principal

Controla todos os serviços do MCX.

| Comando | Descrição |
|---------|-----------|
| `start` | Inicia server + tunnel + sync |
| `stop` | Para todos os serviços |
| `restart` | Reinicia tudo |
| `status` | Mostra status e tunnel URL |
| `logs [service]` | Tail de logs (server/tunnel/sync) |
| `tunnel-url` | Mostra URL atual do túnel |

**Logs:** `/tmp/mcx/`  
**PIDs:** `/tmp/mcx/pids/`

---

### `cloudflare-tunnel.sh` - Túnel Auto-Reconnect

Mantém o túnel Cloudflare ativo com reconexão automática.

**Features:**
- ✅ Reconexão automática ao desconectar
- ✅ Captura e salva URL do túnel
- ✅ Logging persistente
- ✅ Cleanup graceful (SIGTERM/SIGINT)

**Configuração:**
```bash
TUNNEL_PORT=18950          # Porta do server
TUNNEL_LOG=/tmp/cloudflare-tunnel.log
TUNNEL_URL_FILE=/tmp/cloudflare-tunnel-url.txt
RECONNECT_DELAY=5          # Segundos entre tentativas
```

**Uso direto:**
```bash
# Foreground (para debug)
./scripts/cloudflare-tunnel.sh

# Background via mcx-services
./scripts/mcx-services.sh start
```

---

### `sync-stats.sh` - Sincronização de Stats

Processa transcripts JSONL e atualiza `session-stats.json`.

**Modos:**
```bash
# Uma vez (cron-friendly)
./scripts/sync-stats.sh --once

# Daemon (loop contínuo)
./scripts/sync-stats.sh --daemon
```

**Configuração:**
```bash
SYNC_INTERVAL=60           # Segundos entre syncs (modo daemon)
```

**Output:** `data/session-stats.json`
```json
{
  "lastUpdated": "2026-02-08T05:00:00.000Z",
  "sessions": [...],
  "totals": {
    "messages": 405,
    "toolCalls": 324,
    "tokens": 1637414,
    "costUSD": 27.03
  }
}
```

---

## 🔄 Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    Internet                          │
│                        │                             │
│              ┌─────────▼─────────┐                  │
│              │ Cloudflare Tunnel │                  │
│              │  (*.trycloudflare)│                  │
│              └─────────┬─────────┘                  │
│                        │                             │
│              ┌─────────▼─────────┐                  │
│              │   MCX Server      │                  │
│              │   (port 18950)    │                  │
│              └─────────┬─────────┘                  │
│                        │                             │
│         ┌──────────────┼──────────────┐             │
│         ▼              ▼              ▼             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ /api/    │  │ /api/    │  │ Static   │         │
│   │ stats    │  │ sessions │  │ Files    │         │
│   └────┬─────┘  └────┬─────┘  └──────────┘         │
│        │             │                              │
│        └──────┬──────┘                              │
│               ▼                                     │
│    ┌──────────────────┐     ┌──────────────────┐   │
│    │ session-stats.json│◄────│ sync-stats.sh   │   │
│    └──────────────────┘     │  (daemon)        │   │
│               ▲             └────────┬─────────┘   │
│               │                      │             │
│               │             ┌────────▼─────────┐   │
│               │             │ ~/.openclaw/     │   │
│               └─────────────│ sessions/*.jsonl │   │
│                             └──────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:18950/api/health
```

### Verificar Tunnel
```bash
cat /tmp/cloudflare-tunnel-url.txt
```

### Logs em Tempo Real
```bash
./scripts/mcx-services.sh logs server
./scripts/mcx-services.sh logs tunnel
./scripts/mcx-services.sh logs sync
```

---

## 🔧 Troubleshooting

### Túnel não conecta
```bash
# Verificar se cloudflared está instalado
which cloudflared

# Verificar logs
tail -f /tmp/cloudflare-tunnel.log

# Reiniciar apenas o túnel
./scripts/mcx-services.sh stop
./scripts/mcx-services.sh start
```

### Stats não atualizam
```bash
# Executar sync manual
./scripts/sync-stats.sh --once

# Verificar sessões disponíveis
ls -la ~/.openclaw/agents/main/sessions/*.jsonl
```

### Server não inicia
```bash
# Verificar se porta está ocupada
lsof -i :18950

# Verificar logs
cat /tmp/mcx/server.log
```

---

## 📝 Notas

- O túnel Cloudflare gera uma URL nova a cada reinício
- Stats são sincronizados a cada 60 segundos por padrão
- O server usa cache de 10s para reduzir I/O
- Pricing: Claude Opus 4.5 ($0.015/1K input, $0.075/1K output)
