// TaskFlow - Integrations
// GitHub, Jira, Confluence sync

const Integrations = {
  github: {
    activity: [
      { type: 'pr', title: 'Add payment retry logic', author: '🌀', time: '10m ago', status: 'open' },
      { type: 'commit', title: 'Fix currency rounding', author: 'J', time: '25m ago', status: null },
      { type: 'pr', title: 'Usage metering API', author: 'J', time: '1h ago', status: 'review' },
      { type: 'commit', title: 'Update tests', author: '🌀', time: '2h ago', status: null },
      { type: 'pr', title: 'Webhook reliability', author: 'J', time: '3h ago', status: 'approved' },
    ],
    
    render() {
      const container = document.getElementById('githubActivity');
      if (!container) return;
      
      container.innerHTML = `
        <div class="activity-list">
          ${this.activity.map(item => `
            <div class="activity-row">
              <span class="activity-type ${item.type}">${item.type === 'pr' ? 'PR' : '⚡'}</span>
              <span class="activity-title">${item.title}</span>
              <span class="activity-author">${item.author}</span>
              <span class="activity-time">${item.time}</span>
            </div>
          `).join('')}
        </div>
      `;
    },
  },
  
  jira: {
    sync() {
      // Simulated sync
      console.log('Syncing with Jira...');
      return Promise.resolve();
    },
  },
  
  confluence: {
    connect() {
      App.showToast('Confluence integration coming soon', 'info');
    },
  },
  
  init() {
    this.github.render();
  },
};
