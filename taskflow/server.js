/**
 * Mission Control X - Backend Server v2.10.0
 * Last updated: 2026-02-08
 * Following backend-patterns skill best practices
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const zlib = require('zlib');
const os = require('os');
const crypto = require('crypto');

// ===== Configuration =====
const VERSION = '2.13.0';
const PORT = process.env.PORT || 18950;
const OPENCLAW_SESSIONS = path.join(process.env.HOME, '.openclaw', 'agents', 'main', 'sessions');
const STATS_FILE = path.join(__dirname, 'data', 'session-stats.json');
const LABELS_FILE = path.join(__dirname, 'data', 'session-labels.json');
const USER_DATA_FILE = path.join(__dirname, 'data', 'user-data.json');
const STATIC_DIR = __dirname;
const CACHE_TTL = 10000; // 10 seconds

// CORS configuration
const CORS_CONFIG = {
  allowedOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['*'],
  allowedMethods: 'GET, POST, PATCH, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Request-ID'
};

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100
};

// ===== Structured Logger =====
const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLogLevel = LogLevel[process.env.LOG_LEVEL?.toUpperCase()] ?? LogLevel.INFO;

function log(level, message, meta = {}) {
  if (LogLevel[level] < currentLogLevel) return;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  console.log(JSON.stringify(entry));
}

const logger = {
  debug: (msg, meta) => log('DEBUG', msg, meta),
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta)
};

// ===== Metrics Collector =====
const metrics = {
  startTime: Date.now(),
  requests: { total: 0, byMethod: {}, byRoute: {}, byStatus: {} },
  cache: { hits: 0, misses: 0 },
  errors: { total: 0, byType: {} },
  
  recordRequest(method, route, statusCode, durationMs) {
    this.requests.total++;
    this.requests.byMethod[method] = (this.requests.byMethod[method] || 0) + 1;
    this.requests.byRoute[route] = (this.requests.byRoute[route] || 0) + 1;
    this.requests.byStatus[statusCode] = (this.requests.byStatus[statusCode] || 0) + 1;
  },
  
  recordCacheHit() { this.cache.hits++; },
  recordCacheMiss() { this.cache.misses++; },
  
  recordError(type) {
    this.errors.total++;
    this.errors.byType[type] = (this.errors.byType[type] || 0) + 1;
  },
  
  getSnapshot() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      uptime,
      uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
      requests: this.requests,
      cache: {
        ...this.cache,
        hitRate: this.cache.hits + this.cache.misses > 0 
          ? ((this.cache.hits / (this.cache.hits + this.cache.misses)) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      errors: this.errors,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
  }
};

// ===== Rate Limiter =====
const rateLimitStore = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  // Clean old entries
  let entry = rateLimitStore.get(ip);
  if (!entry || entry.windowStart < windowStart) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(ip, entry);
  }
  
  entry.count++;
  
  if (entry.count > RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + RATE_LIMIT.windowMs
    };
  }
  
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - entry.count,
    resetAt: entry.windowStart + RATE_LIMIT.windowMs
  };
}

// Clean rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < now - RATE_LIMIT.windowMs) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000);

// ===== Compression Helper =====
function shouldCompress(data, req) {
  if (data.length < 1024) return false;
  const acceptEncoding = req.headers['accept-encoding'] || '';
  return acceptEncoding.includes('gzip');
}

function compressResponse(data, callback) {
  zlib.gzip(data, callback);
}

// ===== ETag Generator =====
function generateETag(content) {
  return '"' + crypto.createHash('md5').update(content).digest('hex').slice(0, 16) + '"';
}

// Load session labels mapping
let sessionLabels = {};
try {
  if (fs.existsSync(LABELS_FILE)) {
    sessionLabels = JSON.parse(fs.readFileSync(LABELS_FILE, 'utf8'));
  }
} catch (e) {
  logger.warn('Could not load session labels', { error: e.message });
}

// Load OpenClaw sessions.json for label mapping
const OPENCLAW_SESSIONS_FILE = path.join(os.homedir(), '.openclaw/agents/main/sessions/sessions.json');
let openclawSessions = {};
function loadOpenclawSessions() {
  try {
    if (fs.existsSync(OPENCLAW_SESSIONS_FILE)) {
      openclawSessions = JSON.parse(fs.readFileSync(OPENCLAW_SESSIONS_FILE, 'utf8'));
    }
  } catch (e) {
    logger.warn('Could not load openclaw sessions', { error: e.message });
  }
}
loadOpenclawSessions();
// Refresh every 30s
setInterval(loadOpenclawSessions, 30000);

// Get label from OpenClaw sessions
function getLabelFromOpenclaw(sessionId) {
  for (const [key, value] of Object.entries(openclawSessions)) {
    if (value.sessionId === sessionId && value.label) {
      return value.label;
    }
  }
  return null;
}

// ===== User Data Repository =====
class UserDataRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {
      logger.warn('Could not load user data', { error: e.message });
    }
    return { notes: {}, statuses: {}, bookmarks: [] };
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // Notes
  addNote(activityId, note) {
    if (!this.data.notes[activityId]) {
      this.data.notes[activityId] = [];
    }
    const noteEntry = {
      id: Date.now().toString(36),
      text: note,
      createdAt: new Date().toISOString()
    };
    this.data.notes[activityId].push(noteEntry);
    this.save();
    return noteEntry;
  }

  getNotes(activityId) {
    return this.data.notes[activityId] || [];
  }

  // Statuses
  setStatus(activityId, status) {
    this.data.statuses[activityId] = {
      status,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.statuses[activityId];
  }

  getStatus(activityId) {
    return this.data.statuses[activityId] || null;
  }

  // Bookmarks
  addBookmark(bookmark) {
    const existing = this.data.bookmarks.find(b => b.activityId === bookmark.activityId);
    if (existing) return existing;

    const entry = {
      id: Date.now().toString(36),
      activityId: bookmark.activityId,
      title: bookmark.title || 'Untitled',
      reason: bookmark.reason || 'manual',
      createdAt: new Date().toISOString()
    };
    this.data.bookmarks.push(entry);
    this.save();
    return entry;
  }

  getBookmarks() {
    return this.data.bookmarks;
  }

  removeBookmark(id) {
    const index = this.data.bookmarks.findIndex(b => b.id === id);
    if (index === -1) return false;
    this.data.bookmarks.splice(index, 1);
    this.save();
    return true;
  }

  // Inteligência: detectar atividades importantes
  analyzeActivity(activity) {
    const importance = { score: 0, reasons: [] };

    // Alto custo (> $0.10)
    if (activity.cost > 0.10) {
      importance.score += 3;
      importance.reasons.push('high-cost');
    }

    // Muitos tokens (> 10k)
    if (activity.tokens > 10000) {
      importance.score += 2;
      importance.reasons.push('high-tokens');
    }

    // Erro detectado
    if (activity.description?.toLowerCase().includes('error') ||
        activity.description?.toLowerCase().includes('failed') ||
        activity.description?.toLowerCase().includes('exception')) {
      importance.score += 3;
      importance.reasons.push('error-detected');
    }

    // Tool call importante
    const importantTools = ['browser', 'exec', 'message', 'nodes'];
    if (activity.tags?.some(t => importantTools.includes(t))) {
      importance.score += 1;
      importance.reasons.push('important-tool');
    }

    return {
      ...importance,
      shouldAutoBookmark: importance.score >= 3
    };
  }

  // Sugerir bookmarks automáticos
  getSuggestedBookmarks(activities) {
    return activities
      .map(a => ({ activity: a, analysis: this.analyzeActivity(a) }))
      .filter(({ analysis }) => analysis.shouldAutoBookmark)
      .map(({ activity, analysis }) => ({
        activityId: activity.id,
        title: activity.title,
        description: activity.description?.slice(0, 100),
        reasons: analysis.reasons,
        score: analysis.score
      }));
  }
}

const userDataRepo = new UserDataRepository(USER_DATA_FILE);

// ===== Cache Layer =====
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) {
    metrics.recordCacheMiss();
    return null;
  }
  if (Date.now() > entry.expires) {
    cache.delete(key);
    metrics.recordCacheMiss();
    return null;
  }
  metrics.recordCacheHit();
  return entry.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

// ===== Error Handling =====
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.code = this.getErrorCode(statusCode);
  }
  
  getErrorCode(statusCode) {
    const codes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR'
    };
    return codes[statusCode] || 'UNKNOWN_ERROR';
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        statusCode: this.statusCode
      }
    };
  }
}

function errorHandler(error, res, req) {
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;
  
  // Log error
  if (!isOperational) {
    logger.error('Unhandled error', { 
      error: error.message, 
      stack: error.stack,
      path: req?.url,
      method: req?.method
    });
    metrics.recordError('unhandled');
  } else {
    logger.warn('API error', { 
      code: error.code,
      message: error.message,
      path: req?.url 
    });
    metrics.recordError(error.code || 'operational');
  }
  
  const response = error instanceof ApiError 
    ? error.toJSON()
    : {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500
        }
      };
  
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
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
      logger.error('Session read error', { error: e.message });
      throw new ApiError(500, 'Failed to read sessions', { cause: e.message });
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

    // Fallback label - use OpenClaw sessions.json, then local mapping, then short ID
    if (!label) {
      const sessionId = file.replace('.jsonl', '');
      
      // Try OpenClaw sessions.json first
      const openclawLabel = getLabelFromOpenclaw(sessionId);
      if (openclawLabel) {
        label = openclawLabel;
      } else {
        // Try local mapping
        const mapped = sessionLabels[sessionId];
        if (mapped) {
          label = mapped.label;
          kind = mapped.kind || kind;
        } else {
          label = 'session-' + sessionId.slice(0, 8);
        }
      }
    }

    // Calculate activity status
    const now = Date.now();
    const lastActive = lastTimestamp ? new Date(lastTimestamp).getTime() : 0;
    const minutesSinceActive = (now - lastActive) / 60000;
    
    let status = 'inactive';
    if (minutesSinceActive < 1) status = 'active';
    else if (minutesSinceActive < 5) status = 'recent';
    else if (minutesSinceActive < 30) status = 'idle';
    else status = 'inactive';

    const inputCost = (totalIn / 1000) * 0.015;
    const outputCost = (totalOut / 1000) * 0.075;

    // Determine parent crew member based on label
    const labelLower = (label || '').toLowerCase();
    let parentCrew = null;
    if (labelLower.includes('zoro') || labelLower.includes('impl')) parentCrew = 'zoro';
    else if (labelLower.includes('robin') || labelLower.includes('research') || labelLower.includes('doc')) parentCrew = 'robin';
    else if (labelLower.includes('franky') || labelLower.includes('infra')) parentCrew = 'franky';
    else if (labelLower.includes('chopper') || labelLower.includes('debug') || labelLower.includes('qa')) parentCrew = 'chopper';
    else if (labelLower.includes('nami') || labelLower.includes('ux') || labelLower.includes('product')) parentCrew = 'nami';
    else if (labelLower.includes('usopp') || labelLower.includes('comm') || labelLower.includes('slack')) parentCrew = 'usopp';
    else if (labelLower.includes('sanji') || labelLower.includes('api') || labelLower.includes('data')) parentCrew = 'sanji';
    else if (labelLower.includes('cron')) parentCrew = 'cron';
    else if (labelLower === 'main') parentCrew = 'main';

    return {
      key: `session:${file.replace('.jsonl', '')}`,
      sessionId: file.replace('.jsonl', ''),
      label,
      kind,
      status,
      parentCrew,
      minutesSinceActive: Math.round(minutesSinceActive),
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
      logger.error('Activity read error', { error: e.message });
      throw new ApiError(500, 'Failed to read activities', { cause: e.message });
    }
  }

  mapActivity(entry, file) {
    const sessionId = file.replace('.jsonl', '');
    // Use label mapping
    const mapped = sessionLabels[sessionId];
    const sessionLabel = mapped ? mapped.label : 'session-' + sessionId.slice(0, 8);
    
    // Determine type from entry structure
    let type = 'system';
    let role = null;
    
    if (entry.type === 'message' && entry.message) {
      role = entry.message.role;
      type = role;
      
      // Check if it's a tool call
      if (Array.isArray(entry.message.content)) {
        for (const item of entry.message.content) {
          if (item.type === 'toolCall') {
            type = 'tool';
            break;
          }
        }
      }
    }
    
    const timestamp = entry.timestamp || new Date().toISOString();

    // Calculate cost from usage
    const usage = entry.message?.usage || entry.usage || {};
    const inputTokens = usage.input || usage.inputTokens || 0;
    const outputTokens = usage.output || usage.outputTokens || 0;
    const inputCost = (inputTokens / 1000) * 0.015;
    const outputCost = (outputTokens / 1000) * 0.075;

    return {
      id: this.hash(sessionId + entry.id + timestamp),
      type,
      icon: this.getIcon(type),
      title: this.getTitle(entry),
      description: this.getDescription(entry),
      timestamp,
      session: sessionLabel,
      sessionId,
      tokens: inputTokens + outputTokens,
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
    const icons = { user: '👤', assistant: '🤖', tool: '🔧', system: '⚙️' };
    return icons[type] || '📌';
  }

  getTitle(entry) {
    // Handle new format with entry.message
    if (entry.type === 'message' && entry.message) {
      const msg = entry.message;
      if (msg.role === 'user') return 'Mensagem do Usuário';
      if (msg.role === 'assistant') {
        // Check for tool calls
        if (Array.isArray(msg.content)) {
          for (const item of msg.content) {
            if (item.type === 'toolCall') {
              return `Tool: ${item.name || 'unknown'}`;
            }
          }
        }
        return 'Resposta do Assistente';
      }
    }
    
    // Legacy format
    if (entry.role === 'user') return 'Mensagem do Usuário';
    if (entry.role === 'assistant') return 'Resposta do Assistente';
    if (entry.role === 'tool_calls') {
      const toolName = entry.content?.[0]?.function?.name || 'tool';
      return `Tool: ${toolName}`;
    }
    
    // Session info
    if (entry.type === 'session') return 'Início da Sessão';
    if (entry.type === 'model') return 'Configuração do Modelo';
    
    return 'Atividade';
  }

  getDescription(entry) {
    // Handle new format
    if (entry.type === 'message' && entry.message) {
      const msg = entry.message;
      if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'text' && item.text) {
            return this.cleanText(item.text).slice(0, 200);
          }
          if (item.type === 'toolCall') {
            const args = item.arguments || {};
            // Show relevant arg preview
            const preview = args.command || args.query || args.message || args.task || '';
            return preview ? this.cleanText(preview).slice(0, 150) : `Executando ${item.name}...`;
          }
        }
      }
    }
    
    // Legacy format
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

  cleanText(text) {
    return (text || '')
      .replace(/```[\s\S]*?```/g, '[code]')
      .replace(/`[^`]+`/g, '[code]')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
      logger.error('Session activities read error', { error: e.message, sessionId });
      throw new ApiError(500, 'Failed to read session activities', { cause: e.message });
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
      logger.error('Activity find error', { error: e.message, activityId });
      throw new ApiError(500, 'Failed to find activity', { cause: e.message });
    }
  }

  getTags(entry) {
    const tags = [];
    
    // New format
    if (entry.type === 'message' && entry.message && Array.isArray(entry.message.content)) {
      for (const item of entry.message.content) {
        if (item.type === 'toolCall') {
          tags.push('tool');
          if (item.name) tags.push(item.name);
        }
      }
    }
    
    // Legacy format
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

// Static file ETags cache
const staticEtags = new Map();

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
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node: process.version
    };
  },

  'GET /api/metrics': async () => {
    return {
      success: true,
      version: VERSION,
      ...metrics.getSnapshot()
    };
  },

  // ===== User Data APIs (CRUD) =====
  
  // POST /api/notes - Adicionar nota a uma atividade
  'POST /api/notes': async (req, res) => {
    const body = await parseBody(req);
    if (!body.activityId || !body.text) {
      throw new ApiError(400, 'activityId and text are required', {
        missing: [!body.activityId && 'activityId', !body.text && 'text'].filter(Boolean)
      });
    }
    const note = userDataRepo.addNote(body.activityId, body.text);
    return { success: true, note, activityId: body.activityId };
  },

  // GET /api/notes/:activityId - Listar notas de uma atividade
  'GET /api/notes/:activityId': async (req, res, query, params) => {
    const notes = userDataRepo.getNotes(params.activityId);
    return { success: true, notes, activityId: params.activityId };
  },

  // GET /api/bookmarks - Listar favoritos
  'GET /api/bookmarks': async () => {
    const bookmarks = userDataRepo.getBookmarks();
    return { success: true, bookmarks, count: bookmarks.length };
  },

  // POST /api/bookmarks - Adicionar favorito
  'POST /api/bookmarks': async (req, res) => {
    const body = await parseBody(req);
    if (!body.activityId) {
      throw new ApiError(400, 'activityId is required', { missing: ['activityId'] });
    }
    const bookmark = userDataRepo.addBookmark(body);
    return { success: true, bookmark };
  },

  // GET /api/bookmarks/suggestions - Sugestões inteligentes
  'GET /api/bookmarks/suggestions': async () => {
    const activities = await activityRepo.findRecent(100);
    const suggestions = userDataRepo.getSuggestedBookmarks(activities);
    return { success: true, suggestions, count: suggestions.length };
  },

  // New endpoints v2.7.0
  'GET /api/summary': async () => {
    const [stats, sessions, activities] = await Promise.all([
      statsService.getStats(),
      sessionRepo.findAll(),
      activityRepo.findRecent(5)
    ]);

    const activeAgents = sessions.filter(s => s.status === 'active').length;
    const topAgents = [...sessions]
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 3)
      .map(s => ({ label: s.label, cost: s.cost }));

    return {
      success: true,
      summary: {
        totalCost: stats.totalCost,
        totalTokens: stats.totalTokens,
        activeAgents,
        totalAgents: sessions.length,
        topAgents,
        recentActivities: activities.map(a => ({
          type: a.type,
          tool: a.tool,
          status: a.status,
          time: a.timestamp
        }))
      }
    };
  },

  'GET /api/crew': async () => {
    const sessions = await sessionRepo.findAll();
    const CORE_CREW = ['main', 'robin', 'franky', 'zoro', 'sanji', 'chopper', 'nami', 'usopp', 'brook', 'jinbe'];
    
    const crew = sessions.filter(s => {
      const label = (s.label || '').toLowerCase();
      return CORE_CREW.some(c => label.includes(c));
    });

    return {
      success: true,
      crew: crew.map(s => ({
        label: s.label,
        status: s.status,
        lastActive: s.lastActive,
        cost: s.cost,
        tokens: s.tokens
      })),
      count: crew.length
    };
  },

  'GET /api/timeline': async (req, res, query) => {
    const limit = parseInt(query.limit) || 50;
    const activities = await activityRepo.findRecent(limit);
    
    // Group by hour
    const byHour = {};
    activities.forEach(a => {
      const hour = new Date(a.timestamp).toISOString().slice(0, 13) + ':00';
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push({
        type: a.type,
        tool: a.tool,
        status: a.status,
        label: a.sessionLabel,
        message: a.type === 'user' ? a.content?.slice(0, 100) : null
      });
    });

    return {
      success: true,
      timeline: Object.entries(byHour).map(([hour, items]) => ({ hour, items, count: items.length }))
    };
  },

  'GET /api/operations': async () => {
    // Read crons from OpenClaw
    const cronJobsPath = path.join(os.homedir(), '.openclaw/cron/jobs.json');
    let crons = [];
    
    try {
      if (fs.existsSync(cronJobsPath)) {
        const data = JSON.parse(fs.readFileSync(cronJobsPath, 'utf8'));
        crons = (data.jobs || []).map(job => ({
          id: job.id,
          name: job.name,
          enabled: job.enabled,
          schedule: job.schedule,
          nextRun: job.state?.nextRunAtMs,
          lastRun: job.state?.lastRunAtMs,
          lastStatus: job.state?.lastStatus,
          lastDuration: job.state?.lastDurationMs,
          delivery: job.delivery?.channel
        }));
      }
    } catch (e) {
      logger.error('Error reading crons', { error: e.message });
    }

    // Get system stats
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    // Categorize crons
    const continuous = crons.filter(c => c.schedule?.kind === 'every');
    const daily = crons.filter(c => c.schedule?.kind === 'cron' && c.schedule?.expr?.includes('* *'));
    const weekly = crons.filter(c => c.schedule?.kind === 'cron' && !c.schedule?.expr?.includes('* *'));

    return {
      success: true,
      operations: {
        system: {
          status: 'online',
          version: VERSION,
          uptime: Math.floor(uptime),
          memory: Math.round(memory.heapUsed / 1024 / 1024),
          nodeVersion: process.version
        },
        crons: {
          total: crons.length,
          enabled: crons.filter(c => c.enabled).length,
          continuous: continuous.length,
          daily: daily.length,
          weekly: weekly.length,
          list: crons.sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0))
        },
        agents: {
          emoji: { main: '🌀', nami: '🍊', robin: '📚', franky: '🔧', zoro: '⚔️', sanji: '🍳', chopper: '🩺', usopp: '🎯' },
          roles: { main: 'Orquestrador', nami: 'Navegadora', robin: 'Arqueóloga', franky: 'Engenheiro', zoro: 'Executor', sanji: 'Provedor', chopper: 'Médico', usopp: 'Comunicador' }
        }
      }
    };
  }
};

// ===== Body Parser Helper =====
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new ApiError(400, 'Invalid JSON body', { parseError: e.message }));
      }
    });
    req.on('error', reject);
  });
}

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
    'GET /api/activities/:id': /^\/api\/activities\/([^/]+)$/,
    'GET /api/notes/:activityId': /^\/api\/notes\/([^/]+)$/,
    'PATCH /api/activities/:id/status': /^\/api\/activities\/([^/]+)\/status$/,
    'DELETE /api/bookmarks/:id': /^\/api\/bookmarks\/([^/]+)$/
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
      throw new ApiError(404, 'Activity not found', { activityId });
    }
    
    return activity;
  },

  // GET /api/notes/:activityId
  'GET /api/notes/:activityId': async (req, res, query, params) => {
    const notes = userDataRepo.getNotes(params.id);
    return { success: true, notes, activityId: params.id };
  },

  // PATCH /api/activities/:id/status - Atualizar status
  'PATCH /api/activities/:id/status': async (req, res, query, params) => {
    const body = await parseBody(req);
    const validStatuses = ['reviewed', 'flagged', 'archived', 'pending'];
    
    if (!body.status || !validStatuses.includes(body.status)) {
      throw new ApiError(400, `status must be one of: ${validStatuses.join(', ')}`, {
        provided: body.status,
        valid: validStatuses
      });
    }
    
    const result = userDataRepo.setStatus(params.id, body.status);
    return { success: true, activityId: params.id, ...result };
  },

  // DELETE /api/bookmarks/:id - Remover favorito
  'DELETE /api/bookmarks/:id': async (req, res, query, params) => {
    const removed = userDataRepo.removeBookmark(params.id);
    if (!removed) {
      throw new ApiError(404, 'Bookmark not found', { bookmarkId: params.id });
    }
    return { success: true, deleted: params.id };
  }
};

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';

  // CORS headers
  const origin = req.headers.origin || '*';
  const allowedOrigin = CORS_CONFIG.allowedOrigins.includes('*') 
    ? '*' 
    : (CORS_CONFIG.allowedOrigins.includes(origin) ? origin : CORS_CONFIG.allowedOrigins[0]);
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders);
  res.setHeader('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = rateLimit(clientIp);
    
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT.maxRequests);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetAt / 1000));
    
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { ip: clientIp, path: pathname });
      const error = new ApiError(429, 'Too many requests. Please slow down.', {
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      });
      res.setHeader('Retry-After', Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
      errorHandler(error, res, req);
      metrics.recordRequest(method, pathname, 429, Date.now() - startTime);
      return;
    }
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const route = matchRoute(method, pathname);

    if (route) {
      try {
        const result = await route.handler(req, res, parsedUrl.query, route.params);
        const jsonData = JSON.stringify(result);
        const buffer = Buffer.from(jsonData);
        
        // Check if we should compress
        if (shouldCompress(buffer, req)) {
          compressResponse(buffer, (err, compressed) => {
            if (err) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(jsonData);
            } else {
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
                'Content-Length': compressed.length
              });
              res.end(compressed);
            }
            metrics.recordRequest(method, pathname, 200, Date.now() - startTime);
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(jsonData);
          metrics.recordRequest(method, pathname, 200, Date.now() - startTime);
        }
      } catch (error) {
        errorHandler(error, res, req);
        metrics.recordRequest(method, pathname, error.statusCode || 500, Date.now() - startTime);
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: false, 
      error: { code: 'NOT_FOUND', message: 'Endpoint not found', path: pathname }
    }));
    metrics.recordRequest(method, pathname, 404, Date.now() - startTime);
    return;
  }

  // Static file serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(STATIC_DIR, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    metrics.recordRequest(method, pathname, 403, Date.now() - startTime);
    return;
  }

  try {
    const data = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Generate/cache ETag
    let etag = staticEtags.get(fullPath);
    if (!etag) {
      etag = generateETag(data);
      staticEtags.set(fullPath, etag);
    }
    
    // Check If-None-Match
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      metrics.recordRequest(method, pathname, 304, Date.now() - startTime);
      return;
    }
    
    const headers = { 
      'Content-Type': contentType,
      'ETag': etag,
      'Cache-Control': 'public, max-age=300'
    };
    
    // Compress static files if beneficial
    if (shouldCompress(data, req) && (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.json')) {
      compressResponse(data, (err, compressed) => {
        if (err) {
          res.writeHead(200, headers);
          res.end(data);
        } else {
          res.writeHead(200, { 
            ...headers,
            'Content-Encoding': 'gzip',
            'Content-Length': compressed.length
          });
          res.end(compressed);
        }
        metrics.recordRequest(method, pathname, 200, Date.now() - startTime);
      });
    } else {
      res.writeHead(200, headers);
      res.end(data);
      metrics.recordRequest(method, pathname, 200, Date.now() - startTime);
    }
  } catch (e) {
    // Fallback to index.html for SPA routing
    try {
      const indexData = fs.readFileSync(path.join(STATIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexData);
      metrics.recordRequest(method, pathname, 200, Date.now() - startTime);
    } catch (e2) {
      res.writeHead(404);
      res.end('Not found');
      metrics.recordRequest(method, pathname, 404, Date.now() - startTime);
    }
  }
});

// ===== Start Server =====
server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started', { version: VERSION, port: PORT });
  console.log(`
╔═══════════════════════════════════════════╗
║       🌀 Mission Control X v${VERSION}          ║
╠═══════════════════════════════════════════╣
║  URL:   http://0.0.0.0:${PORT}              ║
║  API:   /api/stats, /api/sessions         ║
║         /api/sessions/:id/activities      ║
║         /api/activities, /api/activities/:id ║
║         /api/health, /api/metrics         ║
║  CRUD:  /api/notes, /api/bookmarks        ║
║         /api/activities/:id/status        ║
║         /api/bookmarks/suggestions        ║
║  Data:  Real-time OpenClaw sessions       ║
║  New:   Logging, Rate Limit, Compression  ║
╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  server.close(() => process.exit(0));
});

// Clear static ETags periodically (for development)
setInterval(() => {
  staticEtags.clear();
}, 300000); // 5 minutes
