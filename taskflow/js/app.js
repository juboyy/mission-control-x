// TaskFlow - Main Application
// Core app logic and UI management

const App = {
  init() {
    this.bindEvents();
    this.initNavigation();
    this.initSidebar();
    this.initModal();
    this.initSearch();
    
    // Initialize modules
    Kanban.init();
    Integrations.init();
    
    // Render other views
    this.renderInsights();
    this.renderTimeline();
    
    // Show initial view
    this.showView(Store.state.currentView);
    
    console.log('🌀 TaskFlow initialized');
  },
  
  bindEvents() {
    // New task button
    document.getElementById('newTaskBtn')?.addEventListener('click', () => {
      Kanban.openNewTaskModal('backlog');
    });
    
    // FAB
    document.getElementById('fabAdd')?.addEventListener('click', () => {
      Kanban.openNewTaskModal('backlog');
    });
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      this.showToast('Filters coming soon', 'info');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
      
      // Escape to close modal
      if (e.key === 'Escape') {
        Kanban.closeModal();
        this.closeSidebar();
      }
      
      // N for new task
      if (e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        Kanban.openNewTaskModal('backlog');
      }
    });
  },
  
  initNavigation() {
    // Desktop nav
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) {
          this.showView(view);
          this.updateActiveNav(item);
        }
      });
    });
    
    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) {
          this.showView(view);
          document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
  },
  
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const menuToggle = document.getElementById('menuToggle');
    
    // Collapse toggle (desktop)
    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      Store.state.sidebarCollapsed = sidebar.classList.contains('collapsed');
      Store.saveToLocalStorage();
    });
    
    // Menu toggle (mobile)
    menuToggle?.addEventListener('click', () => {
      this.openSidebar();
    });
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', () => {
      this.closeSidebar();
    });
    
    // Restore collapsed state
    if (Store.state.sidebarCollapsed) {
      sidebar.classList.add('collapsed');
    }
  },
  
  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.add('open');
    overlay.classList.add('active');
    Store.state.sidebarOpen = true;
  },
  
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    Store.state.sidebarOpen = false;
  },
  
  initModal() {
    const modal = document.getElementById('taskModal');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('cancelTask');
    const saveBtn = document.getElementById('saveTask');
    
    backdrop?.addEventListener('click', () => Kanban.closeModal());
    closeBtn?.addEventListener('click', () => Kanban.closeModal());
    cancelBtn?.addEventListener('click', () => Kanban.closeModal());
    saveBtn?.addEventListener('click', () => Kanban.saveTask());
  },
  
  initSearch() {
    const searchInput = document.getElementById('globalSearch');
    
    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      Store.state.searchQuery = query;
      
      if (Store.state.currentView === 'board') {
        this.filterCards(query);
      }
    });
  },
  
  filterCards(query) {
    const cards = document.querySelectorAll('.task-card');
    
    cards.forEach(card => {
      const title = card.querySelector('.task-title')?.textContent.toLowerCase() || '';
      const id = card.dataset.taskId.toLowerCase();
      
      if (title.includes(query) || id.includes(query)) {
        card.style.display = '';
      } else {
        card.style.display = query ? 'none' : '';
      }
    });
  },
  
  showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    
    // Show target view
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
      Store.state.currentView = viewId;
      
      // Update page title
      const titles = {
        board: 'Kanban Board',
        timeline: 'Timeline',
        calendar: 'Calendar',
        backlog: 'Backlog',
        github: 'GitHub',
        jira: 'Jira',
        confluence: 'Confluence',
        insights: 'Insights',
        velocity: 'Velocity',
        integrations: 'Integrations',
      };
      
      document.getElementById('pageTitle').textContent = titles[viewId] || viewId;
    }
  },
  
  updateActiveNav(activeItem) {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.classList.remove('active');
    });
    activeItem.classList.add('active');
  },
  
  renderInsights() {
    const stats = Store.getStats();
    
    // Velocity Chart
    const velocityContainer = document.getElementById('velocityChart');
    if (velocityContainer) {
      const sprints = [
        { name: 'S-4', value: 32 },
        { name: 'S-3', value: 45 },
        { name: 'S-2', value: 38 },
        { name: 'S-1', value: 52 },
        { name: 'Current', value: stats.completedPoints },
      ];
      
      const maxValue = Math.max(...sprints.map(s => s.value));
      
      velocityContainer.innerHTML = sprints.map(sprint => `
        <div class="chart-bar" 
             style="height: ${(sprint.value / maxValue) * 100}%"
             data-value="${sprint.value}sp"
             title="${sprint.name}: ${sprint.value} points">
        </div>
      `).join('');
    }
    
    // Distribution
    const distributionContainer = document.getElementById('distributionBars');
    if (distributionContainer) {
      const distribution = [
        { label: 'To Do', count: Store.getTasksByStatus('todo').length, color: 'todo' },
        { label: 'In Progress', count: Store.getTasksByStatus('progress').length, color: 'progress' },
        { label: 'Review', count: Store.getTasksByStatus('review').length, color: 'review' },
        { label: 'Done', count: Store.getTasksByStatus('done').length, color: 'done' },
      ];
      
      const total = Store.tasks.length;
      
      distributionContainer.innerHTML = distribution.map(item => `
        <div class="distribution-item">
          <div class="distribution-label">
            <span>${item.label}</span>
            <span>${item.count}</span>
          </div>
          <div class="distribution-bar">
            <div class="distribution-fill ${item.color}" style="width: ${(item.count / total) * 100}%"></div>
          </div>
        </div>
      `).join('');
    }
  },
  
  renderTimeline() {
    const container = document.getElementById('timelineContent');
    if (!container) return;
    
    const tasks = Store.tasks.filter(t => t.dueDate).slice(0, 6);
    
    container.innerHTML = tasks.map(task => {
      const startOffset = Math.random() * 40;
      const width = 20 + Math.random() * 40;
      
      return `
        <div class="timeline-row">
          <div class="timeline-task-info">
            <div class="timeline-task-title">${task.title.substring(0, 30)}...</div>
            <div class="timeline-task-meta">${task.id} • ${task.assignees.join(', ') || 'Unassigned'}</div>
          </div>
          <div class="timeline-bar-container">
            <div class="timeline-bar" style="left: ${startOffset}%; width: ${width}%"></div>
          </div>
        </div>
      `;
    }).join('');
  },
  
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.2s reverse forwards';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Handle visibility change (for potential sync)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Could trigger sync here
  }
});

// Service Worker Registration (for PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('SW registered'))
    //   .catch(err => console.log('SW registration failed'));
  });
}
