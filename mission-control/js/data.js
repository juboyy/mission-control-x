// Mission Control - Data Layer
// Dados dos agentes e estado do sistema

const AGENTS = [
  {
    id: 'luffy',
    name: 'Luffy',
    role: 'Capitão Orquestrador',
    emoji: '🏴‍☠️',
    model: 'Opus',
    budget: 2.00,
    spent: 0,
    tasks: 0,
    status: 'healthy',
    description: 'Coordenação multi-agente, decisões estratégicas'
  },
  {
    id: 'nami',
    name: 'Nami',
    role: 'Requisitos & Produto',
    emoji: '🗺️',
    model: 'Sonnet',
    budget: 0.50,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Entender requisitos, prevenir scope creep'
  },
  {
    id: 'zoro',
    name: 'Zoro',
    role: 'Code Warrior',
    emoji: '⚔️',
    model: 'Sonnet',
    budget: 1.50,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Implementação, arquitetura de componentes'
  },
  {
    id: 'sanji',
    name: 'Sanji',
    role: 'Backend & APIs',
    emoji: '🍳',
    model: 'Sonnet',
    budget: 1.00,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Design de APIs REST/GraphQL, serviços backend'
  },
  {
    id: 'robin',
    name: 'Robin',
    role: 'Pesquisa & RAG',
    emoji: '📚',
    model: 'Opus',
    budget: 0.80,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Research profundo, síntese de conhecimento'
  },
  {
    id: 'usopp',
    name: 'Usopp',
    role: 'QA & Testes',
    emoji: '🎯',
    model: 'Sonnet',
    budget: 0.60,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Estratégia de testes, automação'
  },
  {
    id: 'chopper',
    name: 'Chopper',
    role: 'Debug & Troubleshooting',
    emoji: '🩺',
    model: 'Sonnet',
    budget: 0.40,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'Root cause analysis, debugging produção'
  },
  {
    id: 'brook',
    name: 'Brook',
    role: 'Integração & DevOps',
    emoji: '🎸',
    model: 'Sonnet',
    budget: 0.40,
    spent: 0,
    tasks: 0,
    status: 'idle',
    description: 'CI/CD, infraestrutura, integrações'
  }
];

const MODEL_COSTS = {
  haiku: { name: 'Haiku', cost: 0, color: 'haiku', target: 8 },
  sonnet: { name: 'Sonnet', cost: 0, color: 'sonnet', target: 10 },
  opus: { name: 'Opus', cost: 0, color: 'opus', target: 80 },
  thinking: { name: 'Thinking', cost: 0, color: 'thinking', target: 2 }
};

const STATE = {
  connected: false,
  dailyBudget: 15.00,
  dailySpent: 0,
  tasksCompleted: 0,
  latencyP95: 0,
  activities: [],
  tasks: [],
  decisions: [],
  logs: [],
  memoryFiles: []
};

// Simular dados para demonstração
function generateMockData() {
  // Simular gastos dos agentes
  AGENTS.forEach(agent => {
    agent.spent = Math.random() * agent.budget * 0.7;
    agent.tasks = Math.floor(Math.random() * 5);
    agent.status = Math.random() > 0.7 ? 'busy' : (Math.random() > 0.5 ? 'healthy' : 'idle');
  });
  
  // Simular custos por modelo
  MODEL_COSTS.haiku.cost = Math.random() * 0.5;
  MODEL_COSTS.sonnet.cost = Math.random() * 1.5;
  MODEL_COSTS.opus.cost = Math.random() * 2;
  MODEL_COSTS.thinking.cost = Math.random() * 0.3;
  
  // Calcular totais
  STATE.dailySpent = Object.values(MODEL_COSTS).reduce((sum, m) => sum + m.cost, 0);
  STATE.tasksCompleted = AGENTS.reduce((sum, a) => sum + a.tasks, 0);
  STATE.latencyP95 = Math.floor(300 + Math.random() * 200);
  
  // Atividades recentes
  STATE.activities = [
    { icon: '✅', text: '<strong>Zoro</strong> completou implementação do endpoint', time: 'há 2 min' },
    { icon: '📋', text: '<strong>Nami</strong> criou spec para nova feature', time: 'há 5 min' },
    { icon: '🔍', text: '<strong>Robin</strong> pesquisou precedentes de cache', time: 'há 12 min' },
    { icon: '🧪', text: '<strong>Usopp</strong> adicionou 15 testes unitários', time: 'há 18 min' },
    { icon: '🚀', text: '<strong>Brook</strong> deployou versão 1.2.3', time: 'há 25 min' },
    { icon: '🐛', text: '<strong>Chopper</strong> resolveu bug de memory leak', time: 'há 32 min' },
  ];
  
  // Tarefas
  STATE.tasks = [
    { id: 1, title: 'Implementar dashboard de custos', agent: 'Zoro', status: 'completed', cost: 0.45 },
    { id: 2, title: 'Criar spec para API v2', agent: 'Nami', status: 'completed', cost: 0.12 },
    { id: 3, title: 'Otimizar queries do banco', agent: 'Sanji', status: 'active', cost: 0.28 },
    { id: 4, title: 'Pesquisar soluções de cache', agent: 'Robin', status: 'completed', cost: 0.35 },
    { id: 5, title: 'Escrever testes de integração', agent: 'Usopp', status: 'active', cost: 0.18 },
    { id: 6, title: 'Configurar monitoramento', agent: 'Brook', status: 'blocked', cost: 0.08 },
  ];
  
  // Decisões
  STATE.decisions = [
    {
      title: 'Arquitetura de Cache Layer',
      status: 'approved',
      date: '2026-02-08 02:30',
      proposer: 'Zoro',
      model: 'Opus',
      cost: 0.04,
      content: 'Decidido usar file-based cache com Python fcntl para atomic updates. Redis considerado mas descartado por adicionar complexidade desnecessária para nossa escala.'
    },
    {
      title: 'Estratégia de Testes E2E',
      status: 'approved',
      date: '2026-02-08 01:45',
      proposer: 'Usopp',
      model: 'Sonnet',
      cost: 0.02,
      content: 'Implementar Playwright para testes E2E. Coverage target: 85%. Rodar em CI a cada PR.'
    },
    {
      title: 'Budget Diário',
      status: 'approved',
      date: '2026-02-08 03:25',
      proposer: 'João',
      model: 'N/A',
      cost: 0,
      content: 'Aumentado budget diário de $5 para $15. Modelo padrão alterado para Opus (80%).'
    }
  ];
  
  // Logs
  STATE.logs = [
    { time: '03:40:15', level: 'info', message: 'Mission Control iniciado' },
    { time: '03:39:56', level: 'info', message: 'Túnel Cloudflare estabelecido' },
    { time: '03:35:00', level: 'info', message: 'Dashboard Proxy v2 ativo na porta 18800' },
    { time: '03:30:00', level: 'info', message: 'Heartbeat: todos os agentes saudáveis' },
    { time: '03:26:00', level: 'info', message: 'Budget atualizado: $15/dia' },
    { time: '03:00:00', level: 'info', message: 'Mission Control estrutura criada' },
    { time: '02:55:00', level: 'info', message: '8 perfis de agentes documentados' },
    { time: '02:50:00', level: 'info', message: 'Recebidos 5 arquivos de configuração' },
    { time: '02:37:00', level: 'info', message: 'Telegram pareado com sucesso' },
    { time: '02:35:00', level: 'info', message: 'Bootstrap: Imu 🌀 inicializado' },
  ];
  
  // Memory files
  STATE.memoryFiles = [
    { name: '2026-02-08.md', path: 'memory/2026-02-08.md' }
  ];
}

// Carregar dados reais do workspace
async function loadRealData() {
  try {
    // Tentar carregar logs de custos
    const costsResponse = await fetch('/api/costs');
    if (costsResponse.ok) {
      const costs = await costsResponse.json();
      // Processar custos reais
    }
    
    // Tentar carregar decisões
    const decisionsResponse = await fetch('/api/decisions');
    if (decisionsResponse.ok) {
      const decisions = await decisionsResponse.json();
      STATE.decisions = decisions;
    }
    
    // Tentar carregar memória do dia
    const memoryResponse = await fetch('/api/memory/today');
    if (memoryResponse.ok) {
      const memory = await memoryResponse.text();
      // Processar memória
    }
  } catch (e) {
    console.log('Usando dados de demonstração');
    generateMockData();
  }
}

// Inicializar dados
generateMockData();
