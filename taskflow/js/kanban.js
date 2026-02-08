// TaskFlow - Kanban Board
// Drag and drop functionality

const Kanban = {
  draggedTask: null,
  
  init() {
    this.render();
    this.bindEvents();
  },
  
  render() {
    const container = document.getElementById('kanbanBoard');
    if (!container) return;
    
    container.innerHTML = Store.columns.map(column => this.renderColumn(column)).join('');
    
    // Bind drag events after render
    this.bindDragEvents();
  },
  
  renderColumn(column) {
    const tasks = Store.getTasksByStatus(column.id);
    
    return `
      <div class="kanban-column" data-column="${column.id}">
        <div class="column-header">
          <div class="column-title-group">
            <div class="column-indicator ${column.color}"></div>
            <h3 class="column-title">${column.title}</h3>
            <span class="column-count">${tasks.length}</span>
          </div>
          <button class="column-menu">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
        <div class="cards-container" data-status="${column.id}">
          ${tasks.map(task => this.renderCard(task)).join('')}
        </div>
        <button class="add-card-btn" data-column="${column.id}">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add task
        </button>
      </div>
    `;
  },
  
  renderCard(task) {
    const priorityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    
    const labels = task.labels.map(label => `
      <span class="task-label ${label}">${label}</span>
    `).join('');
    
    const assignees = task.assignees.length > 0 
      ? task.assignees.map(a => `<div class="task-assignee">${a}</div>`).join('')
      : '<div class="task-assignee empty">?</div>';
    
    const githubIcon = task.github ? `
      <div class="task-meta-item" title="PR ${task.github.pr}">
        <svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
        <span>${task.github.pr}</span>
      </div>
    ` : '';
    
    const pointsIcon = task.storyPoints ? `
      <div class="task-meta-item" title="Story Points">
        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>${task.storyPoints}</span>
      </div>
    ` : '';
    
    return `
      <div class="task-card priority-${task.priority}" 
           data-task-id="${task.id}" 
           draggable="true">
        <div class="task-card-header">
          <span class="task-id">${task.id}</span>
          <span class="task-priority">${priorityEmoji[task.priority]}</span>
        </div>
        <h4 class="task-title">${task.title}</h4>
        ${labels ? `<div class="task-labels">${labels}</div>` : ''}
        <div class="task-footer">
          <div class="task-meta">
            ${githubIcon}
            ${pointsIcon}
          </div>
          <div class="task-assignees">
            ${assignees}
          </div>
        </div>
      </div>
    `;
  },
  
  bindEvents() {
    // Add card buttons
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-card-btn');
      if (addBtn) {
        const column = addBtn.dataset.column;
        this.openNewTaskModal(column);
      }
      
      // Card click to open detail
      const card = e.target.closest('.task-card');
      if (card && !e.target.closest('.task-meta-item')) {
        const taskId = card.dataset.taskId;
        this.openTaskModal(taskId);
      }
    });
  },
  
  bindDragEvents() {
    const cards = document.querySelectorAll('.task-card');
    const containers = document.querySelectorAll('.cards-container');
    
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => this.handleDragStart(e));
      card.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
    
    containers.forEach(container => {
      container.addEventListener('dragover', (e) => this.handleDragOver(e));
      container.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      container.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      container.addEventListener('drop', (e) => this.handleDrop(e));
    });
  },
  
  handleDragStart(e) {
    this.draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    
    // Add slight delay for visual feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  },
  
  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.style.opacity = '1';
    this.draggedTask = null;
    
    document.querySelectorAll('.cards-container').forEach(container => {
      container.classList.remove('drag-over');
    });
  },
  
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  },
  
  handleDragEnter(e) {
    e.preventDefault();
    const container = e.target.closest('.cards-container');
    if (container) {
      container.classList.add('drag-over');
    }
  },
  
  handleDragLeave(e) {
    const container = e.target.closest('.cards-container');
    if (container && !container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
    }
  },
  
  handleDrop(e) {
    e.preventDefault();
    const container = e.target.closest('.cards-container');
    if (!container || !this.draggedTask) return;
    
    container.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = container.dataset.status;
    
    // Update task status
    const task = Store.moveTask(taskId, newStatus);
    
    if (task) {
      // Re-render the board
      this.render();
      
      // Show toast
      App.showToast(`Task moved to ${newStatus}`, 'success');
    }
  },
  
  openNewTaskModal(column) {
    const modal = document.getElementById('taskModal');
    const titleInput = document.getElementById('taskTitleInput');
    const statusSelect = document.getElementById('taskStatus');
    
    // Reset form
    titleInput.value = '';
    document.getElementById('taskDescription').value = '';
    statusSelect.value = column;
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskAssignee').value = '';
    
    Store.state.currentTask = null;
    modal.classList.add('active');
    titleInput.focus();
  },
  
  openTaskModal(taskId) {
    const task = Store.getTaskById(taskId);
    if (!task) return;
    
    const modal = document.getElementById('taskModal');
    const titleInput = document.getElementById('taskTitleInput');
    
    titleInput.value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignees[0] || '';
    
    Store.state.currentTask = taskId;
    modal.classList.add('active');
  },
  
  saveTask() {
    const title = document.getElementById('taskTitleInput').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const status = document.getElementById('taskStatus').value;
    const priority = document.getElementById('taskPriority').value;
    const assignee = document.getElementById('taskAssignee').value;
    
    if (!title) {
      App.showToast('Task title is required', 'error');
      return;
    }
    
    const taskData = {
      title,
      description,
      status,
      priority,
      assignees: assignee ? [assignee === 'imu' ? '🌀' : 'J'] : [],
    };
    
    if (Store.state.currentTask) {
      // Update existing
      Store.updateTask(Store.state.currentTask, taskData);
      App.showToast('Task updated', 'success');
    } else {
      // Create new
      Store.createTask(taskData);
      App.showToast('Task created', 'success');
    }
    
    this.closeModal();
    this.render();
  },
  
  closeModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    Store.state.currentTask = null;
  },
};
