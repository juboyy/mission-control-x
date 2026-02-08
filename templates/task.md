# Template: Tarefa

_Use para definir e acompanhar tarefas_

---

```markdown
# Tarefa: [Título Curto]

**ID:** TASK-YYYYMMDD-NNN
**Criada:** YYYY-MM-DD HH:MM UTC
**Status:** BACKLOG / TODO / IN PROGRESS / REVIEW / DONE / BLOCKED

---

## Resumo

[Uma frase descrevendo o que precisa ser feito]

## Contexto

[Por que essa tarefa existe]

## Especificação

### Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

### Requisitos Não-Funcionais
- Performance: [target]
- Segurança: [considerações]
- Compatibilidade: [requisitos]

### Fora do Escopo
- ❌ [Item explicitamente excluído]
- ❌ [Outro item excluído]

## Assignments

| Papel | Agente | Responsabilidade |
|-------|--------|------------------|
| Owner | [Agente] | Entregar a tarefa |
| Reviewer | [Agente] | Validar entrega |
| Stakeholder | [Agente] | Aprovar resultado |

## Estimativas

| Aspecto | Estimativa |
|---------|------------|
| Esforço | [horas] |
| Custo | $[X.XX] |
| Modelo | [Haiku/Sonnet/Opus/Thinking] |
| Deadline | YYYY-MM-DD |

## Dependências

- [ ] Depende de: [TASK-XXX ou recurso]
- [ ] Bloqueia: [TASK-YYY]

## Progresso

### Log de Atividade
| Data | Agente | Ação | Custo |
|------|--------|------|-------|
| YYYY-MM-DD | [Agente] | [Ação] | $X.XX |

### Artifacts
- [ ] Código: [branch/PR]
- [ ] Testes: [arquivo]
- [ ] Docs: [arquivo]

## Bloqueios

| Bloqueio | Status | Owner | Ação |
|----------|--------|-------|------|
| [Descrição] | ATIVO/RESOLVIDO | [Agente] | [O que fazer] |

## Resultado

**Status final:** DONE / CANCELLED / DEFERRED
**Data conclusão:** YYYY-MM-DD

### Métricas Finais
- Esforço real: [horas]
- Custo real: $[X.XX]
- Tempo total: [dias]

### Lições Aprendidas
- [O que funcionou bem]
- [O que poderia melhorar]

---

_Template v1.0_
```
