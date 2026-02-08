// Mission Control X - API Data Layer
// Connects to real workspace data

const API = {
  baseUrl: '',
  
  // Fetch activities from server
  async getActivities() {
    try {
      const res = await fetch('/api/activities');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      console.warn('API error, using cached data:', e);
      return null;
    }
  },
  
  // Fetch stats
  async getStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      console.warn('API error:', e);
      return null;
    }
  },
  
  // Fetch session info
  async getSession() {
    try {
      const res = await fetch('/api/session');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      console.warn('API error:', e);
      return null;
    }
  },
  
  // Fetch decisions log
  async getDecisions() {
    try {
      const res = await fetch('/api/decisions');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      return [];
    }
  },
  
  // Fetch memory entries
  async getMemory() {
    try {
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      return [];
    }
  },
  
  // Fetch costs
  async getCosts() {
    try {
      const res = await fetch('/api/costs');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (e) {
      return { today: 0, month: 0, limit: 15 };
    }
  },
};

// Enhanced Activity module with real data
const ActivityLive = {
  pollInterval: 30000, // 30 seconds
  lastUpdate: null,
  
  async init() {
    await this.refresh();
    this.startPolling();
  },
  
  async refresh() {
    // Fetch all data
    const [activities, stats, session, costs] = await Promise.all([
      API.getActivities(),
      API.getStats(),
      API.getSession(),
      API.getCosts(),
    ]);
    
    // Update Activity module with real data
    if (activities) {
      Activity.activities = activities;
    }
    if (stats) {
      Activity.stats = stats;
    }
    if (session) {
      Activity.session = session;
    }
    if (costs) {
      Activity.costs = costs;
    }
    
    // Re-render
    Activity.render();
    this.lastUpdate = new Date();
    
    // Update last-update indicator
    this.updateTimestamp();
  },
  
  startPolling() {
    setInterval(() => this.refresh(), this.pollInterval);
  },
  
  updateTimestamp() {
    const el = document.getElementById('lastUpdate');
    if (el && this.lastUpdate) {
      el.textContent = `Last update: ${this.lastUpdate.toLocaleTimeString('pt-BR')}`;
    }
  },
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Start live updates after initial render
  setTimeout(() => ActivityLive.init(), 1000);
});
