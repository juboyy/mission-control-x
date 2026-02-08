#!/usr/bin/env node
/**
 * TaskFlow Server
 * Serve the application with authentication
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  port: parseInt(process.env.PORT || '18950'),
  password: process.env.PASSWORD || 'taskflow2026',
  sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const sessions = new Map();
const staticDir = __dirname;

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

const loginPage = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow • Login</title>
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
    <h1>TaskFlow</h1>
    <p class="subtitle">Intelligent Project Management</p>
    <div class="form-card">
      {{ERROR}}
      <form method="POST" action="/login">
        <input type="password" name="password" placeholder="Enter access code" required autofocus>
        <button type="submit">Access Dashboard</button>
      </form>
    </div>
    <div class="features">
      <div class="feature">
        <div class="feature-icon">📋</div>
        Kanban Board
      </div>
      <div class="feature">
        <div class="feature-icon">🔗</div>
        GitHub + Jira
      </div>
      <div class="feature">
        <div class="feature-icon">📊</div>
        Insights
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
        'Set-Cookie': `tf_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${CONFIG.sessionTimeout / 1000}`
      });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(loginPage.replace('{{ERROR}}', '<div class="error">Invalid access code</div>'));
    }
    return;
  }
  
  // Check auth
  if (!validateSession(getCookie(req, 'tf_session'))) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(loginPage.replace('{{ERROR}}', ''));
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
╔════════════════════════════════════════╗
║         🌀 TaskFlow Server             ║
╠════════════════════════════════════════╣
║  URL:  http://0.0.0.0:${CONFIG.port}             ║
║  Code: ${CONFIG.password}                  ║
╚════════════════════════════════════════╝
  `);
});
