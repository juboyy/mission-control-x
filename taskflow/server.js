#!/usr/bin/env node
/**
 * Mission Control X Server
 * Serve the application with real-time data from workspace
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

// Read JSONL file and parse
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

// Read markdown file
function readMarkdown(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// Get memory files
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

// Build activities from real data
function getActivities() {
  const activities = [];
  
  // Read decisions log
  const decisions = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'decisions.jsonl'));
  decisions.forEach(d => {
    activities.push({
      id: `dec-${d.id}`,
      type: 'decision',
      title: d.title,
      description: d.description,
      timestamp: d.timestamp,
      tags: [d.status, d.owner],
    });
  });
  
  // Read costs log
  const costs = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'costs.jsonl'));
  costs.slice(-10).forEach(c => {
    activities.push({
      id: `cost-${c.timestamp}`,
      type: 'system',
      title: `Cost: $${c.amount.toFixed(4)}`,
      description: `${c.model} - ${c.task}`,
      timestamp: c.timestamp,
      tags: ['cost', c.agent],
    });
  });
  
  // Read incidents log
  const incidents = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'incidents.jsonl'));
  incidents.forEach(i => {
    activities.push({
      id: `inc-${i.id}`,
      type: i.severity === 'high' ? 'error' : 'system',
      title: i.title,
      description: i.description,
      timestamp: i.timestamp,
      tags: [i.status, i.severity],
    });
  });
  
  // Read memory files as activities
  const memories = getMemoryFiles();
  memories.forEach(m => {
    activities.push({
      id: `mem-${m.date}`,
      type: 'memory',
      title: `Memory: ${m.date}`,
      description: m.content?.substring(0, 200) + '...',
      timestamp: `${m.date}T00:00:00Z`,
      tags: ['memory'],
    });
  });
  
  // Add boot activity
  activities.push({
    id: 'boot',
    type: 'system',
    title: 'Mission Control X Started',
    description: 'Server initialized and ready',
    timestamp: new Date(startTime).toISOString(),
    tags: ['boot'],
  });
  
  // Sort by timestamp descending
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Get session info
function getSession() {
  const uptime = Date.now() - startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const mins = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    agent: 'Imu',
    avatar: '🌀',
    role: 'Familiar Digital',
    model: 'Claude Opus',
    status: 'online',
    uptime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    channel: 'Telegram',
    session: 'main',
  };
}

// Get stats
function getStats() {
  const decisions = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'decisions.jsonl'));
  const costs = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'costs.jsonl'));
  const memories = getMemoryFiles();
  
  // Count files in workspace
  let fileCount = 0;
  try {
    const countFiles = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isFile()) fileCount++;
        else if (stat.isDirectory() && !item.startsWith('.')) countFiles(full);
      });
    };
    countFiles(CONFIG.workspacePath);
  } catch {}
  
  return {
    tasks: decisions.length,
    searches: 5, // Placeholder - would need to track
    files: fileCount,
    messages: 62, // From telegram context
    memories: memories.length,
  };
}

// Get costs summary
function getCosts() {
  const costs = readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'costs.jsonl'));
  const today = new Date().toISOString().split('T')[0];
  
  let todayTotal = 0;
  let monthTotal = 0;
  
  costs.forEach(c => {
    const date = c.timestamp?.split('T')[0];
    if (date === today) todayTotal += c.amount;
    if (date?.startsWith(today.substring(0, 7))) monthTotal += c.amount;
  });
  
  return {
    today: todayTotal,
    month: monthTotal,
    dailyLimit: 15,
    monthlyLimit: 450,
  };
}

// API Handlers
const apiHandlers = {
  '/api/activities': () => getActivities(),
  '/api/session': () => getSession(),
  '/api/stats': () => getStats(),
  '/api/costs': () => getCosts(),
  '/api/decisions': () => readJsonl(path.join(CONFIG.workspacePath, 'docs', 'mission-control', 'logs', 'decisions.jsonl')),
  '/api/memory': () => getMemoryFiles(),
};

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
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}
    .feature{padding:16px;background:rgba(255,255,255,.02);border-radius:12px;font-size:13px;color:rgba(255,255,255,.6)}
    .feature-icon{font-size:24px;margin-bottom:8px}
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
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🌀</div>
        Activity Feed
      </div>
      <div class="feature">
        <div class="feature-icon">📋</div>
        Tasks
      </div>
      <div class="feature">
        <div class="feature-icon">🧠</div>
        Memory
      </div>
    </div>
  </div>
</body>
</html>`;

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
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
  
  // Check auth - allow static assets without auth
  const isStaticAsset = /\.(js|css|svg|png|ico|json|woff|woff2)$/.test(url.pathname);
  const isApi = url.pathname.startsWith('/api/');
  
  if (!validateSession(getCookie(req, 'mcx_session')) && !isStaticAsset && !isApi) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(loginPage.replace('{{ERROR}}', ''));
    return;
  }
  
  // API endpoints
  if (apiHandlers[url.pathname]) {
    const data = apiHandlers[url.pathname]();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
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
      res.writeHead(404);
      res.end('Not Found');
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
║       🌀 Mission Control X Server         ║
╠═══════════════════════════════════════════╣
║  URL:   http://0.0.0.0:${CONFIG.port}              ║
║  Code:  ${CONFIG.password.padEnd(20)}          ║
║  Data:  ${CONFIG.workspacePath.substring(0, 25)}... ║
╚═══════════════════════════════════════════╝
  `);
});
