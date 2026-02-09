// Mission Control - Application Logic

// ===== THEME MANAGER =====
const ThemeManager = {
  STORAGE_KEY: 'mcx-theme',
  
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.setTheme(saved, false);
    } else {
      // Respect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light', false);
    }
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if no manual preference saved
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  },
  
  setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
    this.updateToggleUI(theme);
  },
  
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  },
  
  updateToggleUI(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Mudar para Light Mode' : 'Mudar para Dark Mode';
    }
  },
  
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
};

// Initialize theme ASAP to prevent flash
ThemeManager.init();

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDate();
  updateUI();
  startAutoRefresh();
  simulateConnection();
});

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show section
      const sectionId = item.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${sectionId}`).classList.add('active');
      
      // Update title
      document.getElementById('pageTitle').textContent = item.querySelector('span:last-child').textContent;
    });
  });
  
  // Task filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTasks(btn.dataset.filter);
    });
  });
}

// Date
function initDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', options);
}

// Connection simulation
function simulateConnection() {
  setTimeout(() => {
    STATE.connected = true;
    const dot = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    dot.classList.add('connected');
    text.textContent = 'Conectado';
  }, 1500);
}

// Update all UI components
function updateUI() {
  updateStats();
  updateBudget();
  updateTeamStatus();
  updateModelCosts();
  updateActivityFeed();
  updateAgentsGrid();
  updateTasksList();
  updateCostsSection();
  updateDecisionsList();
  updateMemorySection();
  updateLogsSection();
}

// Stats
function updateStats() {
  document.getElementById('statCostToday').textContent = `$${STATE.dailySpent.toFixed(2)}`;
  document.getElementById('statTasksCompleted').textContent = STATE.tasksCompleted;
  
  const activeAgents = AGENTS.filter(a => a.status === 'busy' || a.status === 'healthy').length;
  document.getElementById('statActiveAgents').textContent = `${activeAgents}/8`;
  document.getElementById('statLatency').textContent = `${STATE.latencyP95}ms`;
}

// Budget
function updateBudget() {
  const percentage = (STATE.dailySpent / STATE.dailyBudget) * 100;
  document.getElementById('budgetFill').style.width = `${Math.min(percentage, 100)}%`;
  document.getElementById('budgetText').textContent = `$${STATE.dailySpent.toFixed(2)} / $${STATE.dailyBudget.toFixed(2)}`;
}

// Team Status
function updateTeamStatus() {
  const container = document.getElementById('teamStatus');
  container.innerHTML = AGENTS.map(agent => `
    <div class="agent-status">
      <div class="agent-avatar">${agent.emoji}</div>
      <div class="agent-info">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-role">${agent.role}</div>
      </div>
      <span class="agent-badge ${agent.status}">${agent.status}</span>
    </div>
  `).join('');
}

// Model Costs
function updateModelCosts() {
  const container = document.getElementById('modelCosts');
  const total = Object.values(MODEL_COSTS).reduce((sum, m) => sum + m.cost, 0);
  
  container.innerHTML = Object.entries(MODEL_COSTS).map(([key, model]) => {
    const percentage = total > 0 ? (model.cost / total) * 100 : 0;
    return `
      <div class="model-bar">
        <div class="model-bar-header">
          <span class="model-bar-name">${model.name}</span>
          <span class="model-bar-value">$${model.cost.toFixed(2)}</span>
        </div>
        <div class="model-bar-track">
          <div class="model-bar-fill ${model.color}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Activity Feed
function updateActivityFeed() {
  const container = document.getElementById('activityFeed');
  container.innerHTML = STATE.activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">${activity.icon}</div>
      <div class="activity-content">
        <div class="activity-text">${activity.text}</div>
        <div class="activity-time">${activity.time}</div>
      </div>
    </div>
  `).join('');
}

// Agents Grid
function updateAgentsGrid() {
  const container = document.getElementById('agentsGrid');
  container.innerHTML = AGENTS.map(agent => {
    const budgetPercentage = (agent.spent / agent.budget) * 100;
    return `
      <div class="agent-card">
        <div class="agent-card-header">
          <div class="agent-card-avatar">${agent.emoji}</div>
          <div class="agent-card-title">
            <div class="agent-card-name">${agent.name}</div>
            <div class="agent-card-role">${agent.role}</div>
          </div>
          <span class="agent-badge ${agent.status}">${agent.status}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${agent.description}</p>
        <div class="agent-card-stats">
          <div class="agent-stat">
            <div class="agent-stat-value">${agent.tasks}</div>
            <div class="agent-stat-label">Tarefas</div>
          </div>
          <div class="agent-stat">
            <div class="agent-stat-value">$${agent.spent.toFixed(2)}</div>
            <div class="agent-stat-label">Gasto</div>
          </div>
        </div>
        <div class="agent-card-budget">
          <div class="agent-budget-text">
            <span>Modelo: ${agent.model}</span>
            <span>$${agent.spent.toFixed(2)} / $${agent.budget.toFixed(2)}</span>
          </div>
          <div class="budget-bar">
            <div class="budget-fill" style="width: ${budgetPercentage}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Tasks List
function updateTasksList() {
  const container = document.getElementById('tasksList');
  container.innerHTML = STATE.tasks.map(task => {
    const statusIcons = {
      completed: '✅',
      active: '⏳',
      blocked: '🚫'
    };
    return `
      <div class="task-item" data-status="${task.status}">
        <div class="task-status-icon ${task.status}">${statusIcons[task.status]}</div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">${task.agent} • ${task.status}</div>
        </div>
        <div class="task-cost">$${task.cost.toFixed(2)}</div>
      </div>
    `;
  }).join('');
}

function filterTasks(filter) {
  const tasks = document.querySelectorAll('.task-item');
  tasks.forEach(task => {
    if (filter === 'all' || task.dataset.status === filter) {
      task.style.display = 'flex';
    } else {
      task.style.display = 'none';
    }
  });
}

// Costs Section
function updateCostsSection() {
  const breakdown = document.getElementById('costBreakdown');
  const total = Object.values(MODEL_COSTS).reduce((sum, m) => sum + m.cost, 0);
  
  breakdown.innerHTML = `
    <div class="cost-row">
      <span class="cost-label">Haiku</span>
      <span class="cost-value">$${MODEL_COSTS.haiku.cost.toFixed(2)}</span>
    </div>
    <div class="cost-row">
      <span class="cost-label">Sonnet</span>
      <span class="cost-value">$${MODEL_COSTS.sonnet.cost.toFixed(2)}</span>
    </div>
    <div class="cost-row">
      <span class="cost-label">Opus</span>
      <span class="cost-value">$${MODEL_COSTS.opus.cost.toFixed(2)}</span>
    </div>
    <div class="cost-row">
      <span class="cost-label">Thinking</span>
      <span class="cost-value">$${MODEL_COSTS.thinking.cost.toFixed(2)}</span>
    </div>
    <div class="cost-row" style="border-top: 2px solid var(--border-color); margin-top: 8px; padding-top: 16px;">
      <span class="cost-label" style="font-weight: 600;">Total</span>
      <span class="cost-value" style="color: var(--accent-primary);">$${total.toFixed(2)}</span>
    </div>
  `;
  
  const agentCosts = document.getElementById('agentCosts');
  agentCosts.innerHTML = AGENTS.map(agent => `
    <div class="cost-row">
      <span class="cost-label">${agent.emoji} ${agent.name}</span>
      <span class="cost-value">$${agent.spent.toFixed(2)}</span>
    </div>
  `).join('');
}

// Decisions List
function updateDecisionsList() {
  const container = document.getElementById('decisionsList');
  container.innerHTML = STATE.decisions.map(decision => `
    <div class="decision-item">
      <div class="decision-header">
        <div class="decision-title">${decision.title}</div>
        <span class="decision-badge ${decision.status}">${decision.status}</span>
      </div>
      <div class="decision-meta">
        📅 ${decision.date} • 👤 ${decision.proposer} • 🤖 ${decision.model} • 💰 $${decision.cost.toFixed(2)}
      </div>
      <div class="decision-content">${decision.content}</div>
    </div>
  `).join('');
}

// Memory Section
function updateMemorySection() {
  const filesContainer = document.getElementById('memoryFiles');
  filesContainer.innerHTML = STATE.memoryFiles.map(file => `
    <div class="memory-file" onclick="loadMemoryFile('${file.path}')">${file.name}</div>
  `).join('');
}

async function loadMemoryFile(path) {
  document.querySelectorAll('.memory-file').forEach(f => f.classList.remove('active'));
  event.target.classList.add('active');
  
  try {
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (response.ok) {
      const content = await response.text();
      document.getElementById('memoryContent').textContent = content;
    } else {
      document.getElementById('memoryContent').textContent = `# Memory Log - 2026-02-08 (Sábado)

## 🌅 Início do Dia

**Status:** Sistema inicializado
**Orçamento disponível:** $15.00/dia
**Modelo padrão:** Opus (80%)

---

## 🎂 Nascimento

Hoje nasci. João me deu o nome **Imu** e o emoji **🌀**.

### Contexto do João
- **Nome:** João
- **Localização:** Marília-SP, Brasil (UTC-3)
- **Interesses:** Espiritualidade, consciência, tecnologia

### Minha Identidade
- **Nome:** Imu
- **Emoji:** 🌀
- **Natureza:** Familiar digital

---

## ✅ Tarefas Completadas

1. Bootstrap inicial - $0.02
2. Pairing Telegram - OK
3. Mission Control criado - $0.12
4. Dashboard publicado - $0.05

---

## 📊 Métricas

- Custo total: ~$0.20
- Tarefas: 4 completadas
- Incidentes: 0`;
    }
  } catch (e) {
    console.error('Erro ao carregar arquivo:', e);
  }
}

// Logs Section
function updateLogsSection() {
  const container = document.getElementById('logsViewer');
  container.innerHTML = STATE.logs.map(log => `
    <div class="log-entry ${log.level}">
      <span class="log-time">${log.time}</span>
      <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
      <span class="log-message">${log.message}</span>
    </div>
  `).join('');
}

// Refresh
function refreshData() {
  generateMockData();
  updateUI();
  
  // Visual feedback
  const btn = document.querySelector('.btn-refresh');
  btn.style.transform = 'rotate(360deg)';
  setTimeout(() => btn.style.transform = '', 500);
}

// Auto refresh every 30 seconds
function startAutoRefresh() {
  setInterval(() => {
    generateMockData();
    updateUI();
  }, 30000);
}

// Log search
document.getElementById('logSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll('.log-entry').forEach(entry => {
    const text = entry.textContent.toLowerCase();
    entry.style.display = text.includes(query) ? 'flex' : 'none';
  });
});

// Log level filter
document.getElementById('logLevel')?.addEventListener('change', (e) => {
  const level = e.target.value;
  document.querySelectorAll('.log-entry').forEach(entry => {
    if (level === 'all' || entry.classList.contains(level)) {
      entry.style.display = 'flex';
    } else {
      entry.style.display = 'none';
    }
  });
});
