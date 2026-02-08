/**
 * Mission Control X - Backend Server
 * Following backend-patterns skill best practices
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ===== Configuration =====
const PORT = process.env.PORT || 18950;
const OPENCLAW_SESSIONS = path.join(process.env.HOME, '.openclaw', 'agents', 'main', 'sessions');
const STATS_FILE = path.join(__dirname, 'data', 'session-stats.json');
const STATIC_DIR = __dirname;
const CACHE_TTL = 10000; // 10 seconds

// ===== Cache Layer =====
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

// ===== Error Handling =====
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(error, res) {
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';
  
  if (!error.isOperational) {
    console.error('[ERROR]', error);
  }
  
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: message }));
}

// ===== Data Repository =====
class SessionRepository {
  constructor(sessionsDir, statsFile) {
    this.sessionsDir = sessionsDir;
    this.statsFile = statsFile;
  }

  async findAll() {
    const cached = getCached('sessions:all');
    if (cached) return cached;

    try {
      // Try stats file first (pre-computed)
      if (fs.existsSync(this.statsFile)) {
        const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        const sessions = (data.sessions || []).map(s => ({
          key: `session:${s.id}`,
          sessionId: s.id,
          label: s.label || 'agent',
          kind: s.label === 'main' ? 'main' : 'agent',
          channel: 'telegram',
          model: 'claude-opus-4-5-thinking',
          inputTokens: s.tokensIn || 0,
          outputTokens: s.tokensOut || 0,
          totalTokens: (s.tokensIn || 0) + (s.tokensOut || 0),
          cost: s.costUSD || 0,
          messageCount: s.messageCount || 0,
          toolCalls: s.toolCalls || 0,
          updatedAt: s.lastActivity
        }));
        setCache('sessions:all', sessions);
        return sessions;
      }

      // Fallback: read from transcripts
      if (!fs.existsSync(this.sessionsDir)) return [];
      
      const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.jsonl'));
      const sessions = [];

      for (const file of files) {
        try {
          const session = this.parseTranscript(file);
          if (session) sessions.push(session);
        } catch (e) {
          // Skip invalid files
        }
      }

      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setCache('sessions:all', sessions);
      return sessions;
    } catch (e) {
      console.error('Session read error:', e);
      throw new ApiError(500, 'Failed to read sessions');
    }
  }

  parseTranscript(file) {
    const filePath = path.join(this.sessionsDir, file);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    
    let totalIn = 0, totalOut = 0, messageCount = 0, toolCalls = 0;
    let lastTimestamp = null;
    let label = 'agent';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.usage) {
          totalIn += entry.usage.inputTokens || 0;
          totalOut += entry.usage.outputTokens || 0;
        }
        if (entry.role === 'user' || entry.role === 'assistant') messageCount++;
        if (entry.role === 'tool_calls') toolCalls += (entry.content?.length || 1);
        if (entry.timestamp) lastTimestamp = entry.timestamp;
        if (entry.label) label = entry.label;
      } catch (e) {}
    }

    const inputCost = (totalIn / 1000) * 0.015;
    const outputCost = (totalOut / 1000) * 0.075;

    return {
      key: `session:${file.replace('.jsonl', '')}`,
      sessionId: file.replace('.jsonl', ''),
      label,
      kind: label === 'main' ? 'main' : 'agent',
      channel: 'telegram',
      model: 'claude-opus-4-5-thinking',
      inputTokens: totalIn,
      outputTokens: totalOut,
      totalTokens: totalIn + totalOut,
      cost: inputCost + outputCost,
      messageCount,
      toolCalls,
      updatedAt: lastTimestamp
    };
  }
}

class ActivityRepository {
  constructor(sessionsDir) {
    this.sessionsDir = sessionsDir;
  }

  async findRecent(limit = 50) {
    const cacheKey = `activities:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      if (!fs.existsSync(this.sessionsDir)) return [];

      const files = fs.readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('deleted'))
        .slice(0, 10);

      const activities = [];

      for (const file of files) {
        const lines = fs.readFileSync(path.join(this.sessionsDir, file), 'utf8')
          .split('\n')
          .filter(Boolean)
          .slice(-50);

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            activities.push(this.mapActivity(entry, file));
          } catch (e) {}
        }
      }

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const result = activities.slice(0, limit);
      setCache(cacheKey, result);
      return result;
    } catch (e) {
      console.error('Activity read error:', e);
      throw new ApiError(500, 'Failed to read activities');
    }
  }

  mapActivity(entry, file) {
    const sessionName = file.replace('.jsonl', '').split(':').pop();
    const type = entry.role || 'system';
    const timestamp = entry.timestamp || new Date().toISOString();

    // Calculate cost from usage
    const usage = entry.usage || {};
    const inputCost = ((usage.inputTokens || 0) / 1000) * 0.015;
    const outputCost = ((usage.outputTokens || 0) / 1000) * 0.075;

    return {
      id: this.hash(JSON.stringify(entry) + timestamp),
      type: type === 'tool_calls' ? 'tool' : type,
      icon: this.getIcon(type),
      title: this.getTitle(entry),
      description: this.getDescription(entry),
      timestamp,
      session: sessionName,
      tokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      cost: inputCost + outputCost,
      tags: this.getTags(entry)
    };
  }

  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }

  getIcon(type) {
    const icons = { user: '👤', assistant: '🤖', tool_calls: '🔧', tool: '🔧', system: '⚙️' };
    return icons[type] || '📌';
  }

  getTitle(entry) {
    if (entry.role === 'user') return 'User Message';
    if (entry.role === 'assistant') return 'Assistant';
    if (entry.role === 'tool_calls') {
      const toolName = entry.content?.[0]?.function?.name || 'tool';
      return `Tool: ${toolName}`;
    }
    return 'Activity';
  }

  getDescription(entry) {
    if (typeof entry.content === 'string') {
      return entry.content.slice(0, 150);
    }
    if (entry.role === 'tool_calls' && Array.isArray(entry.content)) {
      return `Executing ${entry.content.length} tool(s)...`;
    }
    return '';
  }

  getTags(entry) {
    const tags = [];
    if (entry.role === 'tool_calls' && Array.isArray(entry.content)) {
      tags.push('tool');
      entry.content.forEach(c => {
        if (c.function?.name) tags.push(c.function.name);
      });
    }
    return tags;
  }
}

// ===== Service Layer =====
class StatsService {
  constructor(sessionRepo, activityRepo) {
    this.sessionRepo = sessionRepo;
    this.activityRepo = activityRepo;
  }

  async getStats() {
    const cached = getCached('stats:all');
    if (cached) return cached;

    const sessions = await this.sessionRepo.findAll();
    const activities = await this.activityRepo.findRecent(100);

    const stats = {
      totalTokens: sessions.reduce((sum, s) => sum + s.totalTokens, 0),
      totalCost: sessions.reduce((sum, s) => sum + s.cost, 0),
      sessionCount: sessions.length,
      totalMessages: {
        user: activities.filter(a => a.type === 'user').length,
        assistant: activities.filter(a => a.type === 'assistant').length,
        tool: activities.filter(a => a.type === 'tool').length
      },
      totalToolCalls: activities.filter(a => a.type === 'tool').length,
      modelUsage: this.countModels(sessions),
      agentUsage: this.countAgents(sessions),
      budget: {
        daily: 15,
        used: sessions.reduce((sum, s) => sum + s.cost, 0),
        remaining: Math.max(0, 15 - sessions.reduce((sum, s) => sum + s.cost, 0))
      }
    };

    setCache('stats:all', stats);
    return stats;
  }

  countModels(sessions) {
    const counts = {};
    sessions.forEach(s => {
      const model = s.model || 'unknown';
      counts[model] = (counts[model] || 0) + 1;
    });
    return counts;
  }

  countAgents(sessions) {
    const counts = {};
    sessions.forEach(s => {
      const label = s.label || 'unknown';
      counts[label] = (counts[label] || 0) + s.totalTokens;
    });
    return counts;
  }
}

// ===== Initialize Repositories =====
const sessionRepo = new SessionRepository(OPENCLAW_SESSIONS, STATS_FILE);
const activityRepo = new ActivityRepository(OPENCLAW_SESSIONS);
const statsService = new StatsService(sessionRepo, activityRepo);

// ===== MIME Types =====
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ===== API Routes =====
const routes = {
  'GET /api/stats': async (req, res) => {
    const stats = await statsService.getStats();
    return { success: true, ...stats };
  },

  'GET /api/sessions': async (req, res) => {
    const sessions = await sessionRepo.findAll();
    return sessions;
  },

  'GET /api/activities': async (req, res, query) => {
    const limit = parseInt(query.limit) || 50;
    const activities = await activityRepo.findRecent(limit);
    return activities;
  },

  'GET /api/health': async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
};

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const routeKey = `${method} ${pathname.split('?')[0]}`;
    const handler = routes[routeKey];

    if (handler) {
      try {
        const result = await handler(req, res, parsedUrl.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        errorHandler(error, res);
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
    return;
  }

  // Static file serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(STATIC_DIR, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (e) {
    // Fallback to index.html for SPA routing
    try {
      const indexData = fs.readFileSync(path.join(STATIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexData);
    } catch (e2) {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

// ===== Start Server =====
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║       🌀 Mission Control X v2.1           ║
╠═══════════════════════════════════════════╣
║  URL:   http://0.0.0.0:${PORT}              ║
║  API:   /api/stats, /api/sessions         ║
║        /api/activities, /api/health       ║
║  Data:  Real-time OpenClaw sessions       ║
╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
