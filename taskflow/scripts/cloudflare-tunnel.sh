#!/bin/bash
# =====================================================
# 🔧 Cloudflare Tunnel Auto-Reconnect
# Mantém o túnel ativo com reconexão automática
# =====================================================

TUNNEL_PORT="${TUNNEL_PORT:-18950}"
TUNNEL_LOG="/tmp/cloudflare-tunnel.log"
TUNNEL_URL_FILE="/tmp/cloudflare-tunnel-url.txt"
RECONNECT_DELAY=5
MAX_RETRIES=0  # 0 = infinito

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TUNNEL_LOG"
}

cleanup() {
    log "🛑 Shutting down tunnel..."
    pkill -f "cloudflared.*--url.*:${TUNNEL_PORT}" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

start_tunnel() {
    log "🚀 Starting Cloudflare tunnel on port $TUNNEL_PORT..."
    
    # Kill any existing tunnel on this port
    pkill -f "cloudflared.*--url.*:${TUNNEL_PORT}" 2>/dev/null
    sleep 1
    
    # Start cloudflared and capture URL
    cloudflared tunnel --url "http://localhost:${TUNNEL_PORT}" 2>&1 | while read -r line; do
        echo "$line" >> "$TUNNEL_LOG"
        
        # Extract and save the tunnel URL
        if echo "$line" | grep -qE 'https://.*\.trycloudflare\.com'; then
            url=$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com')
            if [ -n "$url" ]; then
                echo "$url" > "$TUNNEL_URL_FILE"
                log "✅ Tunnel URL: $url"
            fi
        fi
        
        # Check for errors
        if echo "$line" | grep -qi "error\|failed\|connection refused"; then
            log "⚠️  Error detected: $line"
        fi
    done
}

main() {
    log "=========================================="
    log "🔧 Cloudflare Tunnel Manager Started"
    log "   Port: $TUNNEL_PORT"
    log "   Log:  $TUNNEL_LOG"
    log "=========================================="
    
    retries=0
    
    while true; do
        start_tunnel
        exit_code=$?
        
        retries=$((retries + 1))
        
        if [ "$MAX_RETRIES" -gt 0 ] && [ "$retries" -ge "$MAX_RETRIES" ]; then
            log "❌ Max retries ($MAX_RETRIES) reached. Exiting."
            exit 1
        fi
        
        log "🔄 Tunnel disconnected. Reconnecting in ${RECONNECT_DELAY}s... (attempt $retries)"
        sleep "$RECONNECT_DELAY"
    done
}

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    log "❌ cloudflared not found. Install with:"
    log "   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared"
    log "   chmod +x /usr/local/bin/cloudflared"
    exit 1
fi

main
