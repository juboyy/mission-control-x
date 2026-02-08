// TaskFlow - Data Store
// Central state management

const Store = {
  // Application State
  state: {
    currentView: 'board',
    sidebarOpen: false,
    sidebarCollapsed: false,
    modalOpen: false,
    currentTask: null,
    filter: 'all',
    searchQuery: '',
  },
  
  // Project Data
  project: {
    id: 'revenue-os',
    name: 'revenue-OS',
    currentSprint: 'Sprint 1',
    sprintProgress: 68,
    startDate: '2026-02-01',
    endDate: '2026-02-15',
  },
  
  // Kanban Columns
  columns: [
    { id: 'backlog', title: 'Backlog', color: 'backlog' },
    { id: 'todo', title: 'To Do', color: 'todo' },
    { id: 'progress', title: 'In Progress', color: 'progress' },
    { id: 'review', title: 'Review', color: 'review' },
    { id: 'done', title: 'Done', color: 'done' },
  ],
  
  // Tasks
  tasks: [
    {
      id: 'REV-001',
      title: 'Design system architecture for multi-tenant billing',
      description: 'Create the foundational architecture for handling multiple tenants with isolated billing systems.',
      status: 'progress',
      priority: 'critical',
      labels: ['feature', 'design'],
      assignees: ['J'],
      storyPoints: 8,
      dueDate: '2026-02-10',
      github: { pr: '#23', branch: 'feature/billing-arch' },
      jira: 'REV-001',
      createdAt: '2026-02-01',
      updatedAt: '2026-02-08',
    },
    {
      id: 'REV-002',
      title: 'Implement subscription lifecycle hooks',
      description: 'Build webhook handlers for subscription creation, upgrade, downgrade, and cancellation events.',
      status: 'todo',
      priority: 'high',
      labels: ['feature'],
      assignees: ['🌀'],
      storyPoints: 5,
      dueDate: '2026-02-12',
      github: null,
      jira: 'REV-002',
      createdAt: '2026-02-02',
      updatedAt: '2026-02-07',
    },
    {
      id: 'REV-003',
      title: 'Create usage metering API',
      description: 'API endpoints for tracking and reporting usage-based billing metrics.',
      status: 'review',
      priority: 'high',
      labels: ['feature', 'documentation'],
      assignees: ['J', '🌀'],
      storyPoints: 5,
      dueDate: '2026-02-09',
      github: { pr: '#25', branch: 'feature/usage-api' },
      jira: 'REV-003',
      createdAt: '2026-02-03',
      updatedAt: '2026-02-08',
    },
    {
      id: 'REV-004',
      title: 'Invoice PDF generation service',
      description: 'Microservice for generating beautiful, branded invoice PDFs.',
      status: 'done',
      priority: 'medium',
      labels: ['feature'],
      assignees: ['🌀'],
      storyPoints: 3,
      dueDate: '2026-02-07',
      github: { pr: '#21', branch: 'feature/invoice-pdf' },
      jira: 'REV-004',
      createdAt: '2026-02-01',
      updatedAt: '2026-02-06',
    },
    {
      id: 'REV-005',
      title: 'Fix currency conversion rounding errors',
      description: 'Rounding issues causing discrepancies in multi-currency transactions.',
      status: 'todo',
      priority: 'critical',
      labels: ['bug'],
      assignees: ['J'],
      storyPoints: 2,
      dueDate: '2026-02-09',
      github: null,
      jira: 'REV-005',
      createdAt: '2026-02-07',
      updatedAt: '2026-02-08',
    },
    {
      id: 'REV-006',
      title: 'Add Stripe Connect integration',
      description: 'Enable marketplace payments with Stripe Connect for platform revenue sharing.',
      status: 'backlog',
      priority: 'medium',
      labels: ['feature', 'enhancement'],
      assignees: [],
      storyPoints: 13,
      dueDate: null,
      github: null,
      jira: 'REV-006',
      createdAt: '2026-02-04',
      updatedAt: '2026-02-04',
    },
    {
      id: 'REV-007',
      title: 'Payment retry logic improvements',
      description: 'Implement smart retry with exponential backoff for failed payments.',
      status: 'progress',
      priority: 'high',
      labels: ['enhancement'],
      assignees: ['🌀'],
      storyPoints: 3,
      dueDate: '2026-02-11',
      github: { pr: '#27', branch: 'feature/payment-retry' },
      jira: 'REV-007',
      createdAt: '2026-02-05',
      updatedAt: '2026-02-08',
    },
    {
      id: 'REV-008',
      title: 'Customer portal UI redesign',
      description: 'Modernize the customer-facing billing portal with new design system.',
      status: 'backlog',
      priority: 'low',
      labels: ['design', 'enhancement'],
      assignees: [],
      storyPoints: 8,
      dueDate: null,
      github: null,
      jira: 'REV-008',
      createdAt: '2026-02-02',
      updatedAt: '2026-02-02',
    },
    {
      id: 'REV-009',
      title: 'Write API documentation',
      description: 'Complete OpenAPI spec and developer guides for billing API.',
      status: 'todo',
      priority: 'medium',
      labels: ['documentation'],
      assignees: ['J'],
      storyPoints: 3,
      dueDate: '2026-02-13',
      github: null,
      jira: 'REV-009',
      createdAt: '2026-02-06',
      updatedAt: '2026-02-07',
    },
    {
      id: 'REV-010',
      title: 'Set up monitoring dashboards',
      description: 'Grafana dashboards for billing system health and revenue metrics.',
      status: 'done',
      priority: 'medium',
      labels: ['enhancement'],
      assignees: ['🌀'],
      storyPoints: 2,
      dueDate: '2026-02-06',
      github: { pr: '#19', branch: 'feature/monitoring' },
      jira: 'REV-010',
      createdAt: '2026-02-03',
      updatedAt: '2026-02-05',
    },
    {
      id: 'REV-011',
      title: 'Tax calculation engine',
      description: 'Implement VAT/GST/Sales tax calculation with regional rules.',
      status: 'backlog',
      priority: 'high',
      labels: ['feature'],
      assignees: [],
      storyPoints: 8,
      dueDate: null,
      github: null,
      jira: 'REV-011',
      createdAt: '2026-02-01',
      updatedAt: '2026-02-01',
    },
    {
      id: 'REV-012',
      title: 'Webhook delivery reliability',
      description: 'Add dead letter queue and retry mechanism for webhook failures.',
      status: 'review',
      priority: 'medium',
      labels: ['enhancement'],
      assignees: ['J'],
      storyPoints: 3,
      dueDate: '2026-02-10',
      github: { pr: '#26', branch: 'feature/webhook-dlq' },
      jira: 'REV-012',
      createdAt: '2026-02-05',
      updatedAt: '2026-02-08',
    },
  ],
  
  // Integrations
  integrations: {
    github: {
      connected: true,
      repo: 'joao/revenue-os',
      openPRs: 23,
      commits: 156,
      branches: 8,
      lastSync: '2026-02-08T03:45:00Z',
    },
    jira: {
      connected: true,
      project: 'REV',
      inSprint: 12,
      storyPoints: 45,
      blockers: 3,
      lastSync: '2026-02-08T03:40:00Z',
    },
    confluence: {
      connected: false,
      space: null,
      lastSync: null,
    },
  },
  
  // Team
  team: [
    { id: 'joao', name: 'João', avatar: 'J', role: 'Admin', color: '#00d4ff' },
    { id: 'imu', name: 'Imu', avatar: '🌀', role: 'Agent', color: '#7c3aed' },
  ],
  
  // Methods
  getTasksByStatus(status) {
    return this.tasks.filter(task => task.status === status);
  },
  
  getTaskById(id) {
    return this.tasks.find(task => task.id === id);
  },
  
  updateTask(id, updates) {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToLocalStorage();
      return this.tasks[index];
    }
    return null;
  },
  
  moveTask(taskId, newStatus) {
    return this.updateTask(taskId, { status: newStatus });
  },
  
  createTask(taskData) {
    const id = `REV-${String(this.tasks.length + 1).padStart(3, '0')}`;
    const newTask = {
      id,
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: taskData.status || 'backlog',
      priority: taskData.priority || 'medium',
      labels: taskData.labels || [],
      assignees: taskData.assignees || [],
      storyPoints: taskData.storyPoints || 0,
      dueDate: taskData.dueDate || null,
      github: null,
      jira: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    this.saveToLocalStorage();
    return newTask;
  },
  
  deleteTask(id) {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  },
  
  getStats() {
    const total = this.tasks.length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    const inProgress = this.tasks.filter(t => t.status === 'progress').length;
    const totalPoints = this.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = this.tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    return {
      total,
      done,
      inProgress,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
      totalPoints,
      completedPoints,
      velocity: completedPoints,
    };
  },
  
  saveToLocalStorage() {
    try {
      localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('taskflow_state', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  },
  
  loadFromLocalStorage() {
    try {
      const tasks = localStorage.getItem('taskflow_tasks');
      const state = localStorage.getItem('taskflow_state');
      if (tasks) this.tasks = JSON.parse(tasks);
      if (state) this.state = { ...this.state, ...JSON.parse(state) };
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
    }
  },
};

// Initialize from localStorage
Store.loadFromLocalStorage();
