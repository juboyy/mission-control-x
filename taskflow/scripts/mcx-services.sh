#!/bin/bash
# =====================================================
# 🚀 MCX Services Manager
# Gerencia todos os serviços do Mission Control X
# =====================================================

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKFLOW_DIR="$(dirname "$SCRIPTS_DIR")"
LOG_DIR="/tmp/mcx"
PID_DIR="/tmp/mcx/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

status_service() {
    local name="$1"
    local pid_file="$PID_DIR/$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "✅ $name (PID: $pid)"
            return 0
        else
            echo "❌ $name (stale PID: $pid)"
            rm -f "$pid_file"
            return 1
        fi
    else
        echo "⏹️  $name (not running)"
        return 1
    fi
}

start_server() {
    local pid_file="$PID_DIR/server.pid"
    
    if [ -f "$pid_file" ] && ps -p "$(cat "$pid_file")" > /dev/null 2>&1; then
        log "⚠️  Server already running"
        return 0
    fi
    
    log "🚀 Starting MCX server..."
    cd "$TASKFLOW_DIR"
    nohup node server.js > "$LOG_DIR/server.log" 2>&1 &
    echo $! > "$pid_file"
    log "✅ Server started (PID: $!)"
}

start_tunnel() {
    local pid_file="$PID_DIR/tunnel.pid"
    
    if [ -f "$pid_file" ] && ps -p "$(cat "$pid_file")" > /dev/null 2>&1; then
        log "⚠️  Tunnel already running"
        return 0
    fi
    
    log "🌐 Starting Cloudflare tunnel..."
    nohup bash "$SCRIPTS_DIR/cloudflare-tunnel.sh" > "$LOG_DIR/tunnel.log" 2>&1 &
    echo $! > "$pid_file"
    log "✅ Tunnel started (PID: $!)"
}

start_sync() {
    local pid_file="$PID_DIR/sync.pid"
    
    if [ -f "$pid_file" ] && ps -p "$(cat "$pid_file")" > /dev/null 2>&1; then
        log "⚠️  Sync daemon already running"
        return 0
    fi
    
    log "📊 Starting stats sync daemon..."
    nohup bash "$SCRIPTS_DIR/sync-stats.sh" --daemon > "$LOG_DIR/sync.log" 2>&1 &
    echo $! > "$pid_file"
    log "✅ Sync daemon started (PID: $!)"
}

stop_service() {
    local name="$1"
    local pid_file="$PID_DIR/$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null
            log "⏹️  Stopped $name (PID: $pid)"
        fi
        rm -f "$pid_file"
    else
        log "⚠️  $name not running"
    fi
}

case "$1" in
    start)
        log "=========================================="
        log "🚀 Starting MCX Services"
        log "=========================================="
        start_server
        sleep 2
        start_tunnel
        start_sync
        log ""
        log "🎯 All services started!"
        log "   Tunnel URL: $(cat /tmp/cloudflare-tunnel-url.txt 2>/dev/null || echo 'pending...')"
        ;;
    
    stop)
        log "=========================================="
        log "⏹️  Stopping MCX Services"
        log "=========================================="
        stop_service "sync"
        stop_service "tunnel"
        stop_service "server"
        ;;
    
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    
    status)
        echo "=========================================="
        echo "📊 MCX Services Status"
        echo "=========================================="
        status_service "server"
        status_service "tunnel"
        status_service "sync"
        echo ""
        echo "Tunnel URL: $(cat /tmp/cloudflare-tunnel-url.txt 2>/dev/null || echo 'N/A')"
        echo "Logs: $LOG_DIR/"
        ;;
    
    logs)
        local service="${2:-server}"
        tail -f "$LOG_DIR/$service.log"
        ;;
    
    tunnel-url)
        cat /tmp/cloudflare-tunnel-url.txt 2>/dev/null || echo "Tunnel not active"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [service]|tunnel-url}"
        echo ""
        echo "Commands:"
        echo "  start       Start all MCX services"
        echo "  stop        Stop all MCX services"
        echo "  restart     Restart all services"
        echo "  status      Show service status"
        echo "  logs [svc]  Tail logs (server|tunnel|sync)"
        echo "  tunnel-url  Show current tunnel URL"
        exit 1
        ;;
esac
