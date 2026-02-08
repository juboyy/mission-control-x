#!/usr/bin/env node
/**
 * Mission Control X Server - COMPLETE REBUILD
 * Full-featured dashboard with real metrics from OpenClaw sessions
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  port: parseInt(process.env.PORT || '18950'),
  password: process.env.PASSWORD || 'mcx2026',
  sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  workspacePath: process.env.WORKSPACE || '/home/ubuntu/.openclaw/workspace',
  openclawPath: process.env.OPENCLAW || '/home/ubuntu/.openclaw',
  sessionsDir: '/home/ubuntu/.openclaw/agents/main/sessions',
};

// Pricing per 1K tokens
const PRICING = {
  'claude-opus-4-5-thinking': { input: 0.015, output: 0.075, cacheRead: 0.00375 },
  'claude-opus-4-5': { input: 0.015, output: 0.075, cacheRead: 0.00375 },
  'claude-sonnet-4-5': { input: 0.003, output: 0.015, cacheRead: 0.0003 },
  'claude-haiku-4-5': { input: 0.0008, output: 0.004, cacheRead: 0.00008 },
  'default': { input: 0.003, output: 0.015, cacheRead: 0.0003 },
};

const sessions = new Map();
const staticDir = __dirname;
const startTime = Date.now();

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ============================================
// AUTH HELPERS
// ============================================

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + CONFIG.sessionTimeout });
  return token;
}

function validateSession(token) {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(body))));
  });
}

// ============================================
// FILE HELPERS
// ============================================

function readJsonl(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function readMarkdown(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// ============================================
// DEEP SESSION ANALYSIS
// ============================================

function parseSessionTranscript(filePath) {
  const entries = readJsonl(filePath);
  const stats = {
    messages: { user: 0, assistant: 0, tool: 0 },
    tokens: { input: 0, output: 0, cacheRead: 0, total: 0 },
    cost: 0,
    toolCalls: [],
    timeline: [],
    models: {},
    firstTs: null,
    lastTs: null,
  };

  for (const entry of entries) {
    if (!entry.message) continue;
    
    const msg = entry.message;
    const ts = entry.timestamp || msg.timestamp;
    
    if (ts) {
      if (!stats.firstTs || ts < stats.firstTs) stats.firstTs = ts;
      if (!stats.lastTs || ts > stats.lastTs) stats.lastTs = ts;
    }

    // Count message types
    if (msg.role === 'user') {
      stats.messages.user++;
      stats.timeline.push({
        ts,
        type: 'user',
        preview: (msg.content?.[0]?.text || '').substring(0, 100),
      });
    } else if (msg.role === 'assistant') {
      stats.messages.assistant++;
      
      // Extract usage
      if (msg.usage) {
        const u = msg.usage;
        stats.tokens.input += u.input || 0;
        stats.tokens.output += u.output || 0;
        stats.tokens.cacheRead += u.cacheRead || 0;
        stats.tokens.total += u.totalTokens || (u.input + u.output);
        
        // Calculate cost
        if (u.cost?.total) {
          stats.cost += u.cost.total;
        } else {
          const model = msg.model || 'default';
          const pricing = PRICING[model] || PRICING.default;
          stats.cost += (u.input || 0) / 1000 * pricing.input;
          stats.cost += (u.output || 0) / 1000 * pricing.output;
          stats.cost += (u.cacheRead || 0) / 1000 * pricing.cacheRead;
        }
      }

      // Track models
      if (msg.model) {
        stats.models[msg.model] = (stats.models[msg.model] || 0) + 1;
      }

      // Extract tool calls
      if (msg.content && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'toolCall') {
            stats.messages.tool++;
            stats.toolCalls.push({
              ts,
              name: block.name,
              id: block.id,
            });
          }
        }
      }

      stats.timeline.push({
        ts,
        type: 'assistant',
        model: msg.model,
        tokens: msg.usage?.totalTokens || 0,
        cost: msg.usage?.cost?.total || 0,
      });
    } else if (msg.role === 'toolResult') {
      stats.timeline.push({
        ts,
        type: 'tool',
        name: msg.toolName,
        isError: msg.isError,
      });
    }
  }

  return stats;
}

function getAllSessions() {
  const sessionsFile = path.join(CONFIG.sessionsDir, 'sessions.json');
  try {
    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    const result = [];
    
    for (const [key, session] of Object.entries(data)) {
      const sessionId = session.sessionId;
      const jsonlPath = path.join(CONFIG.sessionsDir, `${sessionId}.jsonl`);
      
      let transcriptStats = null;
      if (fs.existsSync(jsonlPath)) {
        transcriptStats = parseSessionTranscript(jsonlPath);
      }

      result.push({
        key,
        sessionId,
        label: session.label || key.split(':').pop(),
        kind: key.includes('subagent') ? 'subagent' : key.includes('cron') ? 'cron' : 'main',
        channel: session.channel || session.lastChannel,
        model: session.model,
        provider: session.modelProvider,
        updatedAt: session.updatedAt,
        totalTokens: session.totalTokens || transcriptStats?.tokens.total || 0,
        inputTokens: session.inputTokens || 0,
        outputTokens: session.outputTokens || 0,
        cost: transcriptStats?.cost || 0,
        messages: transcriptStats?.messages || { user: 0, assistant: 0, tool: 0 },
        toolCalls: transcriptStats?.toolCalls?.length || 0,
        models: transcriptStats?.models || {},
        uptime: transcriptStats ? {
          first: transcriptStats.firstTs,
          last: transcriptStats.lastTs,
        } : null,
      });
    }
    
    return result;
  } catch (e) {
    console.error('Error reading sessions:', e);
    return [];
  }
}

// ============================================
// AGGREGATED STATS
// ============================================

function getAggregatedStats() {
  const sessions = getAllSessions();
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  let totalTokens = 0;
  let totalCost = 0;
  let totalMessages = { user: 0, assistant: 0, tool: 0 };
  let totalToolCalls = 0;
  let modelUsage = {};
  let agentCosts = {};
  let timeline = [];
  
  for (const session of sessions) {
    totalTokens += session.totalTokens || 0;
    totalCost += session.cost || 0;
    totalToolCalls += session.toolCalls || 0;
    
    totalMessages.user += session.messages?.user || 0;
    totalMessages.assistant += session.messages?.assistant || 0;
    totalMessages.tool += session.messages?.tool || 0;
    
    // Model usage
    for (const [model, count] of Object.entries(session.models || {})) {
      modelUsage[model] = (modelUsage[model] || 0) + count;
    }
    
    // Per-agent costs
    const agentName = session.label || 'unknown';
    agentCosts[agentName] = (agentCosts[agentName] || 0) + (session.cost || 0);
  }

  // Calculate uptime from main session
  const mainSession = sessions.find(s => s.kind === 'main');
  let uptime = '0m';
  if (mainSession?.uptime?.first) {
    const first = new Date(mainSession.uptime.first).getTime();
    const uptimeMs = now - first;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const mins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    uptime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  return {
    totalTokens,
    totalCost,
    totalMessages,
    totalToolCalls,
    modelUsage,
    agentCosts,
    sessionCount: sessions.length,
    uptime,
    budget: {
      daily: 15,
      monthly: 450,
      usedToday: totalCost, // TODO: filter by today only
      percentUsed: Math.min(100, (totalCost / 15) * 100),
    },
    alertLevel: totalCost > 11.25 ? 'warning' : totalCost > 13.5 ? 'danger' : 'ok',
  };
}

// ============================================
// ACTIVITY FEED
// ============================================

function getRecentActivities(limit = 50) {
  const sessions = getAllSessions();
  const activities = [];
  
  for (const session of sessions) {
    const jsonlPath = path.join(CONFIG.sessionsDir, `${session.sessionId}.jsonl`);
    if (!fs.existsSync(jsonlPath)) continue;
    
    const entries = readJsonl(jsonlPath);
    const recent = entries.slice(-20);
    
    for (const entry of recent) {
      if (!entry.message) continue;
      const msg = entry.message;
      const ts = entry.timestamp || msg.timestamp;
      
      if (msg.role === 'user' && msg.content?.[0]?.text) {
        activities.push({
          id: entry.id,
          type: 'message',
          icon: '💬',
          title: 'User Message',
          description: msg.content[0].text.substring(0, 120),
          timestamp: ts,
          session: session.label,
          tags: ['user'],
        });
      } else if (msg.role === 'assistant' && msg.content) {
        const hasToolCall = msg.content.some(b => b.type === 'toolCall');
        const textContent = msg.content.find(b => b.type === 'text')?.text;
        
        if (hasToolCall) {
          const tools = msg.content.filter(b => b.type === 'toolCall').map(b => b.name);
          activities.push({
            id: entry.id,
            type: 'tool',
            icon: '🔧',
            title: `Tool: ${tools.join(', ')}`,
            description: textContent?.substring(0, 80) || 'Executing tools...',
            timestamp: ts,
            session: session.label,
            tokens: msg.usage?.totalTokens || 0,
            cost: msg.usage?.cost?.total || 0,
            tags: ['tool', ...tools.slice(0, 2)],
          });
        } else if (textContent) {
          activities.push({
            id: entry.id,
            type: 'response',
            icon: '🤖',
            title: 'Assistant Response',
            description: textContent.substring(0, 120),
            timestamp: ts,
            session: session.label,
            tokens: msg.usage?.totalTokens || 0,
            cost: msg.usage?.cost?.total || 0,
            model: msg.model,
            tags: ['assistant'],
          });
        }
      }
    }
  }
  
  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return activities.slice(0, limit);
}

// ============================================
// TODAY SUMMARY
// ============================================

function getTodaySummary() {
  const today = new Date().toISOString().split('T')[0];
  const activities = getRecentActivities(100);
  const todayActivities = activities.filter(a => a.timestamp?.startsWith(today));
  
  // Extract key activities
  const toolsUsed = new Set();
  const tasksCompleted = [];
  
  for (const act of todayActivities) {
    if (act.type === 'tool') {
      (act.tags || []).filter(t => t !== 'tool').forEach(t => toolsUsed.add(t));
    }
  }
  
  return {
    date: today,
    activityCount: todayActivities.length,
    toolsUsed: Array.from(toolsUsed),
    summary: `${todayActivities.length} atividades hoje. Tools: ${Array.from(toolsUsed).join(', ') || 'nenhum'}`,
    pendingTasks: [], // TODO: parse from memory files
    alerts: [],
  };
}

// ============================================
// MEMORY FILES
// ============================================

function getMemoryFiles() {
  const memoryDir = path.join(CONFIG.workspacePath, 'memory');
  try {
    return fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const content = readMarkdown(path.join(memoryDir, f));
        return { file: f, date: f.replace('.md', ''), content: content?.substring(0, 500) };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

// ============================================
// API HANDLERS
// ============================================

const apiHandlers = {
  '/api/sessions': () => getAllSessions(),
  '/api/stats': () => getAggregatedStats(),
  '/api/activities': (req, url) => {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return getRecentActivities(limit);
  },
  '/api/summary': () => getTodaySummary(),
  '/api/memory': () => getMemoryFiles(),
  '/api/health': () => ({
    status: 'ok',
    uptime: Date.now() - startTime,
    sessionsDir: fs.existsSync(CONFIG.sessionsDir),
    workspacePath: fs.existsSync(CONFIG.workspacePath),
  }),
  // Legacy endpoints for compatibility
  '/api/session': () => {
    const stats = getAggregatedStats();
    return {
      agent: 'Imu',
      avatar: '🌀',
      role: 'Familiar Digital',
      model: 'Claude Opus',
      status: 'online',
      uptime: stats.uptime,
      channel: 'Telegram',
      session: 'main',
    };
  },
  '/api/costs': () => {
    const stats = getAggregatedStats();
    return {
      today: stats.totalCost,
      month: stats.totalCost,
      dailyLimit: 15,
      monthlyLimit: 450,
    };
  },
  '/api/openclaw/sessions': () => getAllSessions(),
};

// ============================================
// LOGIN PAGE
// ============================================

const loginPage = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Control X • Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#050507;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
    .container{width:100%;max-width:440px;text-align:center}
    .logo{margin-bottom:32px}
    .logo svg{width:80px;height:80px}
    h1{font-size:32px;font-weight:700;margin-bottom:8px;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{color:rgba(255,255,255,.5);margin-bottom:40px;font-size:15px}
    .form-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px}
    input{width:100%;height:52px;padding:0 20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:15px;margin-bottom:20px;transition:all .2s}
    input:focus{outline:none;border-color:#00d4ff;box-shadow:0 0 0 4px rgba(0,212,255,.15)}
    button{width:100%;height:52px;border:none;border-radius:12px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#050507;font-size:16px;font-weight:600;cursor:pointer;transition:all .2s}
    button:hover{transform:translateY(-2px);box-shadow:0 10px 40px rgba(0,212,255,.3)}
    .error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:14px;margin-bottom:20px;color:#f87171;font-size:14px}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 80 80">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#00d4ff"/>
            <stop offset="100%" style="stop-color:#7c3aed"/>
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="none" stroke="url(#g)" stroke-width="3"/>
        <path d="M24 40 L36 52 L56 28" stroke="url(#g)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>Mission Control X</h1>
    <p class="subtitle">Centro de Comando do Imu 🌀</p>
    <div class="form-card">
      {{ERROR}}
      <form method="POST" action="/login">
        <input type="password" name="password" placeholder="Enter access code" required autofocus>
        <button type="submit">Access Dashboard</button>
      </form>
    </div>
  </div>
</body>
</html>`;

// ============================================
// REQUEST HANDLER
// ============================================

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS for API
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  
  // Login POST
  if (url.pathname === '/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (body.password === CONFIG.password) {
      const token = createSession();
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': `mcx_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${CONFIG.sessionTimeout / 1000}`
      });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(loginPage.replace('{{ERROR}}', '<div class="error">Invalid access code</div>'));
    }
    return;
  }
  
  // Check auth - allow static assets and HTML without auth
  const isStaticAsset = /\.(js|css|svg|png|ico|json|woff|woff2|html)$/.test(url.pathname);
  const isApi = url.pathname.startsWith('/api/');
  const isRoot = url.pathname === '/';
  
  // No auth required - open access
  // if (!validateSession(getCookie(req, 'mcx_session')) && !isStaticAsset && !isApi && !isRoot) {
  //   res.writeHead(200, { 'Content-Type': 'text/html' });
  //   res.end(loginPage.replace('{{ERROR}}', ''));
  //   return;
  // }
  
  // API endpoints
  if (apiHandlers[url.pathname]) {
    try {
      const data = apiHandlers[url.pathname](req, url);
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error('API Error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  // Serve static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fullPath = path.join(staticDir, filePath);
  
  // Security check
  if (!fullPath.startsWith(staticDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // Try index.html as fallback
      fs.readFile(path.join(staticDir, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(handler);

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║       🌀 Mission Control X v2.0           ║
╠═══════════════════════════════════════════╣
║  URL:   http://0.0.0.0:${CONFIG.port}              ║
║  Code:  ${CONFIG.password.padEnd(20)}          ║
║  Data:  Real-time OpenClaw sessions       ║
╚═══════════════════════════════════════════╝
  `);
});
