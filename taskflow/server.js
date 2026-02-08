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
const LABELS_FILE = path.join(__dirname, 'data', 'session-labels.json');
const STATIC_DIR = __dirname;
const CACHE_TTL = 10000; // 10 seconds

// Load session labels mapping
let sessionLabels = {};
try {
  if (fs.existsSync(LABELS_FILE)) {
    sessionLabels = JSON.parse(fs.readFileSync(LABELS_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load session labels:', e.message);
}

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
      // Always read from transcripts for accurate data
      if (!fs.existsSync(this.sessionsDir)) return [];
      
      const files = fs.readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('deleted'));
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
    let label = null;
    let kind = 'agent';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        // Extract label from session metadata
        if (entry.type === 'session' && entry.label) {
          label = entry.label;
        }
        if (entry.type === 'session' && entry.kind) {
          kind = entry.kind;
        }
        
        // Count messages from message entries
        if (entry.type === 'message' && entry.message) {
          const msg = entry.message;
          if (msg.role === 'user' || msg.role === 'assistant') {
            messageCount++;
          }
          
          // Count toolCalls inside content array
          if (Array.isArray(msg.content)) {
            for (const item of msg.content) {
              if (item.type === 'toolCall') {
                toolCalls++;
              }
            }
          }
          
          // Extract usage from message
          if (msg.usage) {
            totalIn += msg.usage.input || msg.usage.inputTokens || 0;
            totalOut += msg.usage.output || msg.usage.outputTokens || 0;
          }
        }
        
        // Also check usage at entry level
        if (entry.usage) {
          totalIn += entry.usage.input || entry.usage.inputTokens || 0;
          totalOut += entry.usage.output || entry.usage.outputTokens || 0;
        }
        
        if (entry.timestamp) lastTimestamp = entry.timestamp;
      } catch (e) {}
    }

    // Fallback label - use mapping or short ID
    if (!label) {
      const sessionId = file.replace('.jsonl', '');
      const mapped = sessionLabels[sessionId];
      if (mapped) {
        label = mapped.label;
        kind = mapped.kind || kind;
      } else {
        label = 'session-' + sessionId.slice(0, 8);
      }
    }

    const inputCost = (totalIn / 1000) * 0.015;
    const outputCost = (totalOut / 1000) * 0.075;

    return {
      key: `session:${file.replace('.jsonl', '')}`,
      sessionId: file.replace('.jsonl', ''),
      label,
      kind,
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
      // Extrair mais texto - limpar markdown e truncar
      const cleaned = entry.content
        .replace(/```[\s\S]*?```/g, '[code]')  // Remover blocos de código
        .replace(/`[^`]+`/g, '[code]')          // Remover inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links -> texto
        .replace(/[#*_~]/g, '')                  // Remover markdown
        .replace(/\s+/g, ' ')                    // Normalizar espaços
        .trim();
      return cleaned.slice(0, 250);
    }
    if (entry.role === 'tool_calls' && Array.isArray(entry.content)) {
      const tools = entry.content
        .map(c => c.function?.name || 'tool')
        .join(', ');
      return `Executando: ${tools}`;
    }
    if (entry.role === 'tool_result' && entry.content) {
      const text = typeof entry.content === 'string' 
        ? entry.content 
        : JSON.stringify(entry.content);
      return text.slice(0, 200);
    }
    return '';
  }

  // Buscar atividades por sessão
  async findBySession(sessionId, limit = 100) {
    const cacheKey = `activities:session:${sessionId}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      // Procurar arquivo da sessão
      const files = fs.readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.jsonl') && f.includes(sessionId));
      
      if (files.length === 0) {
        return [];
      }

      const activities = [];
      for (const file of files) {
        const lines = fs.readFileSync(path.join(this.sessionsDir, file), 'utf8')
          .split('\n')
          .filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
          try {
            const entry = JSON.parse(lines[i]);
            const activity = this.mapActivity(entry, file);
            activity.index = i;
            activity.sessionId = sessionId;
            activities.push(activity);
          } catch (e) {}
        }
      }

      const result = activities.slice(-limit);
      setCache(cacheKey, result, CACHE_TTL / 2); // Cache mais curto
      return result;
    } catch (e) {
      console.error('Session activities read error:', e);
      throw new ApiError(500, 'Failed to read session activities');
    }
  }

  // Buscar atividade por ID
  async findById(activityId) {
    const cacheKey = `activity:${activityId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      // Buscar em todos os arquivos recentes
      const files = fs.readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('deleted'))
        .slice(0, 20);

      for (const file of files) {
        const lines = fs.readFileSync(path.join(this.sessionsDir, file), 'utf8')
          .split('\n')
          .filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
          try {
            const entry = JSON.parse(lines[i]);
            const activity = this.mapActivity(entry, file);
            
            if (activity.id === activityId) {
              // Adicionar dados completos
              activity.rawContent = entry.content;
              activity.usage = entry.usage || null;
              activity.index = i;
              activity.sessionFile = file;
              activity.sessionId = file.replace('.jsonl', '');
              
              setCache(cacheKey, activity, CACHE_TTL);
              return activity;
            }
          } catch (e) {}
        }
      }

      return null;
    } catch (e) {
      console.error('Activity find error:', e);
      throw new ApiError(500, 'Failed to find activity');
    }
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

    // Calculate totals from sessions (more accurate)
    const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
    const totalToolCalls = sessions.reduce((sum, s) => sum + (s.toolCalls || 0), 0);

    const stats = {
      totalTokens: sessions.reduce((sum, s) => sum + s.totalTokens, 0),
      totalCost: sessions.reduce((sum, s) => sum + s.cost, 0),
      sessionCount: sessions.length,
      totalMessages: {
        user: Math.floor(totalMessages / 2),
        assistant: Math.ceil(totalMessages / 2),
        tool: totalToolCalls
      },
      totalToolCalls,
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
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 500);
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

// ===== Dynamic Route Matching =====
function matchRoute(method, pathname) {
  // Exact match first
  const exactKey = `${method} ${pathname}`;
  if (routes[exactKey]) {
    return { handler: routes[exactKey], params: {} };
  }

  // Pattern matching for :id params
  const patterns = {
    'GET /api/sessions/:id/activities': /^\/api\/sessions\/([^/]+)\/activities$/,
    'GET /api/activities/:id': /^\/api\/activities\/([^/]+)$/
  };

  for (const [routeKey, regex] of Object.entries(patterns)) {
    const match = pathname.match(regex);
    if (match && routeKey.startsWith(method)) {
      return { 
        handler: dynamicRoutes[routeKey], 
        params: { id: decodeURIComponent(match[1]) }
      };
    }
  }

  return null;
}

// ===== Dynamic Routes (with :id params) =====
const dynamicRoutes = {
  'GET /api/sessions/:id/activities': async (req, res, query, params) => {
    const sessionId = params.id;
    const limit = Math.min(Math.max(parseInt(query.limit) || 100, 1), 500);
    const activities = await activityRepo.findBySession(sessionId, limit);
    
    return {
      sessionId,
      count: activities.length,
      activities
    };
  },

  'GET /api/activities/:id': async (req, res, query, params) => {
    const activityId = params.id;
    const activity = await activityRepo.findById(activityId);
    
    if (!activity) {
      throw new ApiError(404, 'Activity not found');
    }
    
    return activity;
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
    const route = matchRoute(method, pathname);

    if (route) {
      try {
        const result = await route.handler(req, res, parsedUrl.query, route.params);
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
║       🌀 Mission Control X v2.2           ║
╠═══════════════════════════════════════════╣
║  URL:   http://0.0.0.0:${PORT}              ║
║  API:   /api/stats, /api/sessions         ║
║         /api/sessions/:id/activities      ║
║         /api/activities, /api/activities/:id ║
║         /api/health                       ║
║  Data:  Real-time OpenClaw sessions       ║
╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
