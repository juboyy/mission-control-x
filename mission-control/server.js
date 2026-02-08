#!/usr/bin/env node
/**
 * Mission Control Server
 * Serve o dashboard + API para dados do workspace
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  port: parseInt(process.env.PORT || '18900'),
  password: process.env.PASSWORD || 'imu2026',
  workspacePath: '/home/ubuntu/.openclaw/workspace',
  sessionTimeout: 24 * 60 * 60 * 1000
};

const sessions = new Map();

// MIME types
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

// Session management
function validateSession(token) {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { created: Date.now(), expires: Date.now() + CONFIG.sessionTimeout });
  return token;
}

function getSessionCookie(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/mc_session=([^;]+)/);
  return match ? match[1] : null;
}

// Login page
const loginPage = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌀 Mission Control - Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#0a0a0f,#12121a,#1a1a25);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff}
    .container{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:48px;width:100%;max-width:420px;box-shadow:0 25px 50px rgba(0,0,0,.5)}
    .logo{font-size:72px;text-align:center;margin-bottom:24px;animation:spin 10s linear infinite}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    h1{text-align:center;font-size:28px;margin-bottom:8px;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{text-align:center;color:rgba(255,255,255,.5);margin-bottom:32px;font-size:14px}
    input{width:100%;padding:16px 20px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;font-size:16px;margin-bottom:20px;transition:all .3s}
    input:focus{outline:none;border-color:#00d4ff;box-shadow:0 0 30px rgba(0,212,255,.2)}
    button{width:100%;padding:16px;border:none;border-radius:12px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s}
    button:hover{transform:translateY(-2px);box-shadow:0 15px 40px rgba(0,212,255,.3)}
    .error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;color:#ef4444}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🌀</div>
    <h1>Mission Control</h1>
    <p class="subtitle">Centro de Comando • Chapéus de Palha</p>
    {{ERROR}}
    <form method="POST" action="/login">
      <input type="password" name="password" placeholder="Senha de acesso" required autofocus>
      <button type="submit">Acessar Dashboard</button>
    </form>
  </div>
</body>
</html>`;

// Parse body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(body))));
  });
}

// Serve static file
function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// API handlers
const API = {
  '/api/costs': async (req, res) => {
    const logsPath = path.join(CONFIG.workspacePath, 'logs/costs.jsonl');
    try {
      const data = fs.readFileSync(logsPath, 'utf-8');
      const lines = data.trim().split('\n').filter(Boolean);
      const costs = lines.map(line => JSON.parse(line));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(costs));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  },
  
  '/api/decisions': async (req, res) => {
    const logsPath = path.join(CONFIG.workspacePath, 'logs/decisions.jsonl');
    try {
      const data = fs.readFileSync(logsPath, 'utf-8');
      const lines = data.trim().split('\n').filter(Boolean);
      const decisions = lines.map(line => JSON.parse(line));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(decisions));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  },
  
  '/api/memory/today': async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const memoryPath = path.join(CONFIG.workspacePath, `memory/${today}.md`);
    try {
      const data = fs.readFileSync(memoryPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(data);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
  },
  
  '/api/file': async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400);
      res.end('Missing path parameter');
      return;
    }
    
    const fullPath = path.join(CONFIG.workspacePath, filePath);
    // Security: ensure path is within workspace
    if (!fullPath.startsWith(CONFIG.workspacePath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    try {
      const data = fs.readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(data);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
  },
  
  '/api/agents': async (req, res) => {
    const agentsDir = path.join(CONFIG.workspacePath, 'agents');
    try {
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      const agents = files.map(f => ({
        id: f.replace('.md', ''),
        name: f.replace('.md', '').charAt(0).toUpperCase() + f.replace('.md', '').slice(1),
        file: f
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agents));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  },
  
  '/api/memory/list': async (req, res) => {
    const memoryDir = path.join(CONFIG.workspacePath, 'memory');
    try {
      const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  }
};

// Request handler
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Login
  if (pathname === '/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (body.password === CONFIG.password) {
      const token = createSession();
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': `mc_session=${token}; Path=/; HttpOnly; SameSite=Strict`
      });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(loginPage.replace('{{ERROR}}', '<div class="error">Senha incorreta</div>'));
    }
    return;
  }
  
  // Check auth for everything else
  const sessionToken = getSessionCookie(req);
  if (!validateSession(sessionToken)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(loginPage.replace('{{ERROR}}', ''));
    return;
  }
  
  // API routes
  if (pathname.startsWith('/api/')) {
    const handler = API[pathname.split('?')[0]];
    if (handler) {
      await handler(req, res);
    } else {
      res.writeHead(404);
      res.end('API not found');
    }
    return;
  }
  
  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const staticPath = path.join(__dirname, filePath);
  serveStatic(res, staticPath);
}

// Create server
const server = http.createServer(handleRequest);

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`\n🌀 Mission Control Server`);
  console.log(`════════════════════════════`);
  console.log(`📡 http://0.0.0.0:${CONFIG.port}`);
  console.log(`🔑 Senha: ${CONFIG.password}`);
  console.log(`📁 Workspace: ${CONFIG.workspacePath}`);
  console.log(`════════════════════════════\n`);
});
