// Mission Control X - Activity Feed
// Real-time activity log - NO MOCK DATA

const Activity = {
  // Activity types and their icons
  types: {
    task: { icon: '✓', label: 'Task' },
    search: { icon: '🔍', label: 'Search' },
    file: { icon: '📄', label: 'File' },
    message: { icon: '💬', label: 'Message' },
    system: { icon: '⚙️', label: 'System' },
    code: { icon: '💻', label: 'Code' },
    decision: { icon: '🎯', label: 'Decision' },
    memory: { icon: '🧠', label: 'Memory' },
    error: { icon: '⚠️', label: 'Error' },
    cost: { icon: '💰', label: 'Cost' },
  },
  
  // Real data - loaded from API
  activities: [],
  stats: {},
  session: {},
  costs: {},
  
  async init() {
    await this.loadData();
    this.render();
    this.startPolling();
  },
  
  async loadData() {
    try {
      const [activities, stats, session, costs] = await Promise.all([
        fetch('/api/activities').then(r => r.json()).catch(() => []),
        fetch('/api/stats').then(r => r.json()).catch(() => ({})),
        fetch('/api/session').then(r => r.json()).catch(() => ({})),
        fetch('/api/costs').then(r => r.json()).catch(() => ({})),
      ]);
      
      this.activities = activities;
      this.stats = stats;
      this.session = session;
      this.costs = costs;
      
      console.log('📊 Data loaded:', { 
        activities: activities.length, 
        stats, 
        session: session.agent,
        costs 
      });
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  },
  
  render() {
    this.renderStats();
    this.renderSession();
    this.renderFeed();
    this.renderCosts();
  },
  
  renderStats() {
    const container = document.getElementById('activityStats');
    if (!container) return;
    
    const s = this.stats;
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-value">${s.tasks || 0}</div>
        <div class="stat-label">Decisions</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-value">${s.files || 0}</div>
        <div class="stat-label">Files</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-value">${s.messages || 0}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧠</div>
        <div class="stat-value">${s.memories || 0}</div>
        <div class="stat-label">Memories</div>
      </div>
    `;
  },
  
  renderSession() {
    const container = document.getElementById('sessionInfo');
    if (!container) return;
    
    const s = this.session;
    const c = this.costs;
    
    container.innerHTML = `
      <div class="session-header">
        <div class="session-agent">
          <div class="agent-avatar">${s.avatar || '🌀'}</div>
          <div class="agent-info">
            <h2>${s.agent || 'Imu'}</h2>
            <p>${s.role || 'Familiar Digital'} • ${s.model || 'Claude Opus'}</p>
          </div>
        </div>
        <div class="session-status">
          <span class="dot"></span>
          ${s.status || 'Online'}
        </div>
      </div>
      <div class="session-meta" style="display: flex; gap: 24px; color: var(--text-muted); font-size: 13px; margin-top: 12px;">
        <span>🕐 Uptime: ${s.uptime || '0m'}</span>
        <span>📍 Session: ${s.session || 'main'}</span>
        <span>🌐 Channel: ${s.channel || 'Telegram'}</span>
        <span>💰 Today: $${(c.today || 0).toFixed(2)} / $${c.dailyLimit || 15}</span>
      </div>
    `;
  },
  
  renderFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;
    
    if (!this.activities.length) {
      container.innerHTML = `
        <div class="activity-card">
          <div class="activity-card-header">
            <h3><span class="live-dot"></span> Activity Feed</h3>
            <span id="lastUpdate" style="font-size: 12px; color: var(--text-muted);">Loading...</span>
          </div>
          <div class="activity-list" style="padding: 40px; text-align: center; color: var(--text-muted);">
            No activities yet. Waiting for data...
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="activity-card">
        <div class="activity-card-header">
          <h3><span class="live-dot"></span> Activity Feed</h3>
          <span id="lastUpdate" style="font-size: 12px; color: var(--text-muted);">${new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
        <div class="activity-list">
          ${this.activities.slice(0, 20).map(activity => this.renderActivity(activity)).join('')}
        </div>
      </div>
    `;
  },
  
  renderActivity(activity) {
    const type = this.types[activity.type] || this.types.system;
    const time = this.formatTime(activity.timestamp);
    const tags = (activity.tags || []).map(t => `<span class="activity-tag">${t}</span>`).join('');
    
    return `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">${type.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description || ''}</div>
          <div class="activity-meta">
            <span class="activity-time">${time}</span>
            ${tags}
          </div>
        </div>
      </div>
    `;
  },
  
  renderCosts() {
    // Cost info is now shown in session header
  },
  
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  startPolling() {
    // Poll every 30 seconds for updates
    setInterval(async () => {
      await this.loadData();
      this.render();
    }, 30000);
  },
};
