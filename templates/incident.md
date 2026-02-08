# Template: Postmortem de Incidente

_Use para documentar incidentes e prevenir recorrência_

---

```markdown
# Postmortem: [Título do Incidente]

**ID:** INC-YYYYMMDD-NNN
**Data:** YYYY-MM-DD
**Autor:** [Agente - geralmente Chopper]
**Status:** DRAFT / REVIEW / FINAL

---

## Resumo Executivo

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low |
| **Duração** | [X minutos/horas] |
| **Impacto** | [Breve descrição] |
| **Root Cause** | [Uma frase] |
| **Custo do Incidente** | $[X.XX] |

---

## Timeline

| Hora (UTC) | Evento | Agente |
|------------|--------|--------|
| HH:MM | [Primeiro sinal] | - |
| HH:MM | Alerta disparou | Sistema |
| HH:MM | Investigação iniciou | [Agente] |
| HH:MM | Root cause identificado | [Agente] |
| HH:MM | Mitigação aplicada | [Agente] |
| HH:MM | Incidente resolvido | [Agente] |
| HH:MM | Normalidade confirmada | [Agente] |

---

## Impacto

### Usuários Afetados
- Número: [N]
- Tipo: [Descrição]
- Duração do impacto: [minutos/horas]

### Sistemas Afetados
- [Sistema 1]: [Como foi afetado]
- [Sistema 2]: [Como foi afetado]

### Impacto Financeiro
| Item | Valor |
|------|-------|
| Custo direto (ex: API calls desperdiçadas) | $[X.XX] |
| Custo de investigação | $[X.XX] |
| Custo de remediation | $[X.XX] |
| **Total** | $[X.XX] |

---

## Detecção

### Como Detectamos
- [ ] Alerta automático
- [ ] Usuário reportou
- [ ] Descoberto por acidente
- [ ] Monitoramento proativo

### Tempo até Detecção
[X minutos/horas] desde o início

### O que Poderia Ter Detectado Mais Rápido
[Sugestões de melhoria]

---

## Root Cause Analysis

### Causa Imediata
[O que diretamente causou o problema]

### Causa Raiz
[A razão fundamental por trás da causa imediata]

### Fatores Contribuintes
1. [Fator 1]
2. [Fator 2]
3. [Fator 3]

### Diagrama (se aplicável)
```
[Evento A] → [Evento B] → [FALHA] → [Impacto]
     ↑
[Fator contribuinte]
```

---

## Mitigação

### Ações Imediatas Tomadas
1. [Ação 1] - [Quem] - [Resultado]
2. [Ação 2] - [Quem] - [Resultado]

### Workaround Temporário
[Se aplicável, o que fizemos para restaurar serviço]

---

## Resolução

### Fix Definitivo
[O que foi feito para resolver permanentemente]

### Validação
- [ ] Fix testado em staging
- [ ] Fix deployado em produção
- [ ] Métricas voltaram ao normal
- [ ] Monitoramento confirmou estabilidade

---

## Action Items

| # | Ação | Owner | Deadline | Status |
|---|------|-------|----------|--------|
| 1 | [Ação preventiva] | [Agente] | YYYY-MM-DD | ⬜ TODO |
| 2 | [Melhoria de detecção] | [Agente] | YYYY-MM-DD | ⬜ TODO |
| 3 | [Documentação] | [Agente] | YYYY-MM-DD | ⬜ TODO |
| 4 | [Teste adicional] | [Agente] | YYYY-MM-DD | ⬜ TODO |

---

## Lições Aprendidas

### O que Funcionou Bem
1. [Aspecto positivo 1]
2. [Aspecto positivo 2]

### O que Poderia Melhorar
1. [Área de melhoria 1]
2. [Área de melhoria 2]

### O que Tivemos Sorte
1. [Fator de sorte - poderia ter sido pior]

---

## Prevenção

### Mudanças de Processo
[O que mudaremos no processo para evitar recorrência]

### Mudanças de Código
[O que mudaremos no código]

### Mudanças de Monitoramento
[Novos alertas ou métricas]

### Mudanças de Documentação
[O que documentaremos]

---

## Referências

- Logs: [link]
- Métricas: [link]
- PR do fix: [link]
- Discussão: [link]

---

## Aprovações

| Reviewer | Status | Data |
|----------|--------|------|
| [Agente 1] | ✅ Aprovado | YYYY-MM-DD |
| [Agente 2] | ⬜ Pendente | - |

---

_Template v1.0 - Baseado em Google SRE Postmortem Guide_
```
