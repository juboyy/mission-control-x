#!/usr/bin/env python3
"""Extract session statistics from OpenClaw transcript JSONL files."""

import json
from datetime import datetime, timezone
from pathlib import Path

SESSIONS_DIR = Path("/home/ubuntu/.openclaw/agents/main/sessions")
OUTPUT_FILE = Path("/home/ubuntu/.openclaw/workspace/taskflow/data/session-stats.json")

def process_jsonl(filepath):
    """Process a single JSONL file and extract stats."""
    stats = {
        "id": filepath.stem,
        "label": "main",
        "messageCount": 0,
        "toolCalls": 0,
        "tokensIn": 0,
        "tokensOut": 0,
        "costUSD": 0.0,
        "lastActivity": None
    }
    
    user_messages = 0
    assistant_messages = 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                
                # Track timestamp
                if 'timestamp' in entry:
                    stats['lastActivity'] = entry['timestamp']
                
                # Count messages by role
                if entry.get('type') == 'message':
                    msg = entry.get('message', {})
                    role = msg.get('role')
                    if role == 'user':
                        user_messages += 1
                    elif role == 'assistant':
                        assistant_messages += 1
                        # Count tool calls in assistant messages
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and item.get('type') in ('tool_use', 'toolCall'):
                                    stats['toolCalls'] += 1
                        
                        # Extract token usage from message.usage
                        usage = msg.get('usage', {})
                        if usage:
                            stats['tokensIn'] += usage.get('input', 0)
                            stats['tokensOut'] += usage.get('output', 0)
                            # Also get cost if available
                            cost = usage.get('cost', {})
                            if cost:
                                stats['costUSD'] += cost.get('total', 0)
                        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
    
    stats['messageCount'] = user_messages + assistant_messages
    stats['costUSD'] = round(stats['costUSD'], 4)
    
    return stats

def main():
    sessions = []
    totals = {
        "messages": 0,
        "toolCalls": 0,
        "tokens": 0,
        "costUSD": 0.0
    }
    
    # Find all JSONL files, sorted by size descending
    jsonl_files = sorted(SESSIONS_DIR.glob("*.jsonl"), key=lambda p: p.stat().st_size, reverse=True)
    
    for filepath in jsonl_files:
        stats = process_jsonl(filepath)
        sessions.append(stats)
        
        totals['messages'] += stats['messageCount']
        totals['toolCalls'] += stats['toolCalls']
        totals['tokens'] += stats['tokensIn'] + stats['tokensOut']
        totals['costUSD'] += stats['costUSD']
    
    totals['costUSD'] = round(totals['costUSD'], 4)
    
    # Determine session labels from sessions.json
    sessions_json_path = SESSIONS_DIR / "sessions.json"
    if sessions_json_path.exists():
        try:
            with open(sessions_json_path, 'r') as f:
                sessions_meta = json.load(f)
            for sess in sessions:
                for key, meta in sessions_meta.items():
                    if isinstance(meta, dict) and meta.get('sessionId') == sess['id']:
                        parts = key.split(':')
                        if 'subagent' in parts:
                            sess['label'] = 'subagent'
                        else:
                            sess['label'] = parts[-1] if parts else 'main'
                        break
        except Exception as e:
            print(f"Error reading sessions.json: {e}")
    
    output = {
        "lastUpdated": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "sessions": sessions,
        "totals": totals
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
