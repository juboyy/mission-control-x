// Mission Control X - Activity Feed
// Real-time activity log from Imu

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
  },
  
  // Activity log
  activities: [
    {
      id: 1,
      type: 'system',
      title: 'Session Started',
      description: 'Mission Control X initialized. Ready to serve.',
      timestamp: new Date().toISOString(),
      tags: ['boot'],
    },
    {
      id: 2,
      type: 'file',
      title: 'Created TaskFlow Project',
      description: 'Built complete task management system with Kanban, drag-drop, and integrations.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      tags: ['taskflow', 'create'],
    },
    {
      id: 3,
      type: 'code',
      title: 'Wrote 3,846 lines of code',
      description: 'HTML, CSS, JavaScript for Mission Control X dashboard.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      tags: ['dev'],
    },
    {
      id: 4,
      type: 'decision',
      title: 'Renamed to Mission Control X',
      description: 'TaskFlow → Mission Control X. Centro de comando visual.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      tags: ['rebrand'],
    },
    {
      id: 5,
      type: 'memory',
      title: 'Memory flush',
      description: 'Saved session log to memory/2025-06-22.md',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      tags: ['memory'],
    },
  ],
  
  // Session stats
  stats: {
    tasks: 12,
    searches: 3,
    files: 15,
    messages: 61,
  },
  
  init() {
    this.render();
    this.startPolling();
  },
  
  render() {
    this.renderStats();
    this.renderSession();
    this.renderFeed();
  },
  
  renderStats() {
    const container = document.getElementById('activityStats');
    if (!container) return;
    
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">✓</div>
        <div class="stat-value">${this.stats.tasks}</div>
        <div class="stat-label">Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔍</div>
        <div class="stat-value">${this.stats.searches}</div>
        <div class="stat-label">Searches</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-value">${this.stats.files}</div>
        <div class="stat-label">Files</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-value">${this.stats.messages}</div>
        <div class="stat-label">Messages</div>
      </div>
    `;
  },
  
  renderSession() {
    const container = document.getElementById('sessionInfo');
    if (!container) return;
    
    const uptime = this.getUptime();
    
    container.innerHTML = `
      <div class="session-header">
        <div class="session-agent">
          <div class="agent-avatar">🌀</div>
          <div class="agent-info">
            <h2>Imu</h2>
            <p>Familiar Digital • Claude Opus</p>
          </div>
        </div>
        <div class="session-status">
          <span class="dot"></span>
          Online
        </div>
      </div>
      <div class="session-meta" style="display: flex; gap: 24px; color: var(--text-muted); font-size: 13px;">
        <span>🕐 Uptime: ${uptime}</span>
        <span>📍 Session: main</span>
        <span>🌐 Channel: Telegram</span>
      </div>
    `;
  },
  
  renderFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;
    
    const sortedActivities = [...this.activities].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    container.innerHTML = `
      <div class="activity-card">
        <div class="activity-card-header">
          <h3><span class="live-dot"></span> Activity Feed</h3>
          <span style="font-size: 12px; color: var(--text-muted);">Live</span>
        </div>
        <div class="activity-list">
          ${sortedActivities.map(activity => this.renderActivity(activity)).join('')}
        </div>
      </div>
    `;
  },
  
  renderActivity(activity) {
    const type = this.types[activity.type] || this.types.system;
    const time = this.formatTime(activity.timestamp);
    const tags = activity.tags.map(t => `<span class="activity-tag">${t}</span>`).join('');
    
    return `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">${type.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-time">${time}</span>
            ${tags}
          </div>
        </div>
      </div>
    `;
  },
  
  formatTime(timestamp) {
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
  
  getUptime() {
    // Simulated uptime since session start
    const startTime = new Date(Date.now() - 1000 * 60 * 45); // 45 min ago
    const diff = Date.now() - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  },
  
  addActivity(activity) {
    this.activities.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...activity,
    });
    this.renderFeed();
  },
  
  startPolling() {
    // In real implementation, this would poll the server
    // For now, simulate occasional updates
    setInterval(() => {
      // Could fetch from /api/activities
    }, 30000);
  },
};
