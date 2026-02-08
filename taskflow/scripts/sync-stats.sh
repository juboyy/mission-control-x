#!/bin/bash
# =====================================================
# 📊 Session Stats Sync Script
# Atualiza session-stats.json a partir dos transcripts
# =====================================================

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
STATS_FILE="$HOME/.openclaw/workspace/taskflow/data/session-stats.json"
SYNC_INTERVAL="${SYNC_INTERVAL:-60}"  # segundos
DAEMON_MODE="${1:-}"

# Token pricing (Claude Opus 4.5)
INPUT_COST_PER_1K=0.015
OUTPUT_COST_PER_1K=0.075

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

parse_session() {
    local file="$1"
    local session_id=$(basename "$file" .jsonl)
    
    # Skip deleted files
    [[ "$file" == *".deleted"* ]] && return
    
    # Parse JSONL and extract stats
    local stats=$(cat "$file" | python3 -c "
import sys
import json

tokens_in = 0
tokens_out = 0
message_count = 0
tool_calls = 0
label = 'agent'
last_ts = None

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        entry = json.loads(line)
        usage = entry.get('usage', {})
        # Handle nested message.usage structure too
        msg = entry.get('message', {})
        if not usage and msg:
            usage = msg.get('usage', {})
        # Handle both formats: 'input'/'output' and 'inputTokens'/'outputTokens'
        tokens_in += usage.get('input', 0) or usage.get('inputTokens', 0)
        tokens_out += usage.get('output', 0) or usage.get('outputTokens', 0)
        
        # Handle nested message structure
        msg = entry.get('message', {})
        role = msg.get('role', '') or entry.get('role', '')
        if role in ('user', 'assistant'):
            message_count += 1
        if role == 'tool_calls' or entry.get('type') == 'tool_calls':
            content = entry.get('content', [])
            tool_calls += len(content) if isinstance(content, list) else 1
        
        # Get label from session entry
        if entry.get('type') == 'session' and entry.get('label'):
            label = entry.get('label')
        elif entry.get('label'):
            label = entry.get('label')
        if entry.get('timestamp'):
            last_ts = entry.get('timestamp')
        
        # Also count tool use from message content
        if msg.get('role') == 'assistant':
            content = msg.get('content', [])
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get('type') == 'tool_use':
                        tool_calls += 1
    except:
        pass

cost = (tokens_in / 1000 * $INPUT_COST_PER_1K) + (tokens_out / 1000 * $OUTPUT_COST_PER_1K)

print(json.dumps({
    'id': '$session_id',
    'label': label,
    'messageCount': message_count,
    'toolCalls': tool_calls,
    'tokensIn': tokens_in,
    'tokensOut': tokens_out,
    'costUSD': round(cost, 4),
    'lastActivity': last_ts
}))
" 2>/dev/null)
    
    echo "$stats"
}

sync_stats() {
    log "📊 Syncing session stats..."
    
    if [ ! -d "$SESSIONS_DIR" ]; then
        log "⚠️  Sessions directory not found: $SESSIONS_DIR"
        return 1
    fi
    
    local sessions=()
    local total_messages=0
    local total_tool_calls=0
    local total_tokens=0
    local total_cost=0
    
    # Process each session file
    for file in "$SESSIONS_DIR"/*.jsonl; do
        [ -f "$file" ] || continue
        [[ "$file" == *".deleted"* ]] && continue
        
        local session_json=$(parse_session "$file")
        
        if [ -n "$session_json" ] && [ "$session_json" != "null" ]; then
            sessions+=("$session_json")
            
            # Extract totals
            local msgs=$(echo "$session_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('messageCount',0))" 2>/dev/null)
            local tools=$(echo "$session_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('toolCalls',0))" 2>/dev/null)
            local toks_in=$(echo "$session_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tokensIn',0))" 2>/dev/null)
            local toks_out=$(echo "$session_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tokensOut',0))" 2>/dev/null)
            local cost=$(echo "$session_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('costUSD',0))" 2>/dev/null)
            
            total_messages=$((total_messages + msgs))
            total_tool_calls=$((total_tool_calls + tools))
            total_tokens=$((total_tokens + toks_in + toks_out))
            total_cost=$(python3 -c "print(round($total_cost + $cost, 4))")
        fi
    done
    
    # Sort by cost (descending) and build JSON
    local sorted_sessions=$(printf '%s\n' "${sessions[@]}" | python3 -c "
import sys
import json

sessions = []
for line in sys.stdin:
    line = line.strip()
    if line:
        try:
            sessions.append(json.loads(line))
        except:
            pass

# Sort by cost descending
sessions.sort(key=lambda x: x.get('costUSD', 0), reverse=True)
print(json.dumps(sessions))
" 2>/dev/null)
    
    # Build final JSON
    local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%6NZ")
    
    cat > "$STATS_FILE" << EOF
{
  "lastUpdated": "$now",
  "sessions": $sorted_sessions,
  "totals": {
    "messages": $total_messages,
    "toolCalls": $total_tool_calls,
    "tokens": $total_tokens,
    "costUSD": $total_cost
  }
}
EOF
    
    log "✅ Stats synced: ${#sessions[@]} sessions, $total_tokens tokens, \$$total_cost"
}

daemon_mode() {
    log "🔁 Starting sync daemon (interval: ${SYNC_INTERVAL}s)"
    
    while true; do
        sync_stats
        sleep "$SYNC_INTERVAL"
    done
}

# Main
case "$DAEMON_MODE" in
    --daemon|-d)
        daemon_mode
        ;;
    --once|-o|"")
        sync_stats
        ;;
    --help|-h)
        echo "Usage: $0 [--daemon|-d] [--once|-o]"
        echo "  --daemon, -d  Run continuously with SYNC_INTERVAL"
        echo "  --once, -o    Run once and exit (default)"
        echo ""
        echo "Environment:"
        echo "  SYNC_INTERVAL  Seconds between syncs (default: 60)"
        ;;
    *)
        log "Unknown option: $DAEMON_MODE"
        exit 1
        ;;
esac
