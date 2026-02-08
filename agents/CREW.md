# CREW.md - Tripulação Mission Control X

## Filosofia de Delegação

O Imu 🌀 é o **orquestrador**, não o executor. Ele:
- Recebe tarefas e contexto
- Analisa a natureza do trabalho
- Delega para o agente especializado
- Monitora progresso
- Consolida resultados

## Agentes Especializados

### ⚔️ Zoro - Executor
**Label:** `zoro-impl`
**Responsabilidades:**
- Implementação de código
- Resolução de tickets de feature
- Code reviews
- Refatoração

**Quando usar:**
- Novo ticket de implementação
- PR precisa de mudanças
- Código precisa de refatoração

**Spawn example:**
```
sessions_spawn(label: "zoro-impl", task: "Implementar feature X do ticket SCRUM-123")
```

---

### 📚 Robin - Arqueóloga
**Label:** `robin-research`
**Responsabilidades:**
- Pesquisa e documentação
- Análise de código existente
- Criação de specs técnicas
- Atualização de Confluence

**Quando usar:**
- Nova feature precisa de spec
- Documentação desatualizada
- Pesquisa de mercado/tecnologia

**Spawn example:**
```
sessions_spawn(label: "robin-research", task: "Pesquisar melhores práticas para X e criar spec")
```

---

### 🔧 Franky - Engenheiro
**Label:** `franky-infra`
**Responsabilidades:**
- Infraestrutura e DevOps
- Configuração de servers
- CI/CD pipelines
- Performance tuning

**Quando usar:**
- Problema de infra
- Deploy necessário
- Otimização de performance

**Spawn example:**
```
sessions_spawn(label: "franky-infra", task: "Otimizar performance do endpoint X")
```

---

### 🩺 Chopper - Médico
**Label:** `chopper-debug`
**Responsabilidades:**
- Debug e diagnóstico
- Análise de bugs
- Code quality review
- Testes

**Quando usar:**
- Bug report
- Erro em produção
- Análise de qualidade

**Spawn example:**
```
sessions_spawn(label: "chopper-debug", task: "Diagnosticar bug no ticket SCRUM-456")
```

---

### 🍊 Nami - Navegadora
**Label:** `nami-ux`
**Responsabilidades:**
- UX e design
- Análise de métricas
- Planejamento de sprint
- Priorização

**Quando usar:**
- Sprint planning
- Análise de UX
- Decisões de produto

**Spawn example:**
```
sessions_spawn(label: "nami-ux", task: "Analisar UX do fluxo X e sugerir melhorias")
```

---

### 🎯 Usopp - Comunicador
**Label:** `usopp-comm`
**Responsabilidades:**
- Comunicação Slack
- Notificações
- Standups
- Reports

**Quando usar:**
- Precisa notificar time
- Standup diário
- Sprint report

**Spawn example:**
```
sessions_spawn(label: "usopp-comm", task: "Postar standup com dados do Jira")
```

---

### 🍳 Sanji - Provedor
**Label:** `sanji-api`
**Responsabilidades:**
- APIs e integrações
- Dados externos
- Web scraping
- Feed de informações

**Quando usar:**
- Nova integração
- Buscar dados externos
- API endpoints

**Spawn example:**
```
sessions_spawn(label: "sanji-api", task: "Criar integração com API do serviço X")
```

---

## Fluxo de Delegação

```
┌─────────────────────────────────────────────────────┐
│                    🌀 IMU                           │
│              (Orquestrador Central)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Recebe tarefa/trigger                          │
│  2. Analisa natureza do trabalho                   │
│  3. Identifica agente apropriado                   │
│  4. sessions_spawn com label específico            │
│  5. Monitora com sessions_list                     │
│  6. Consolida resultado                            │
│                                                     │
└──────────┬──────────┬──────────┬──────────┬────────┘
           │          │          │          │
     ┌─────▼────┐┌────▼────┐┌────▼────┐┌────▼────┐
     │ ⚔️ Zoro ││ 📚 Robin││ 🔧Franky││ 🩺Chopper│
     │  impl   ││ research││  infra  ││  debug  │
     └─────────┘└─────────┘└─────────┘└─────────┘
```

## Regras

1. **Imu nunca implementa diretamente** - sempre delega
2. **Cada agente tem seu label** - cria sessão persistente
3. **Agentes podem chamar outros** - ex: Zoro pede review ao Chopper
4. **Resultados consolidados** - Imu recebe via announce
5. **Histórico preservado** - cada label mantém contexto

## Métricas por Agente

O MCX rastreia automaticamente:
- Tokens usados por label
- Custo por agente
- Tasks completadas
- Tempo médio de execução
