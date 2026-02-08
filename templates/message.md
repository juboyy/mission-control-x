# Template: Mensagem Entre Agentes

_Use para comunicação estruturada entre agentes_

---

```markdown
# Mensagem: [Assunto]

**ID:** MSG-YYYYMMDD-NNN
**Timestamp:** YYYY-MM-DD HH:MM UTC

---

## Remetente
- **Agente:** [Nome]
- **Papel:** [Papel]

## Destinatário
- **Agente:** [Nome]
- **Papel:** [Papel]

## Prioridade
- [ ] 🔴 CRITICAL - Responder imediatamente
- [ ] 🟡 HIGH - Responder em 1 hora
- [ ] 🟢 NORMAL - Responder quando possível
- [ ] ⚪ LOW - Informativo, sem resposta necessária

## Tipo
- [ ] 📋 REQUEST - Pedido de ação
- [ ] 📬 HANDOFF - Entrega de trabalho
- [ ] ❓ QUESTION - Pergunta
- [ ] ℹ️ INFO - Informação
- [ ] ⚠️ ALERT - Alerta
- [ ] ✅ RESPONSE - Resposta a mensagem anterior

---

## Conteúdo

### Assunto
[Descrição clara do que é a mensagem]

### Contexto
[Background necessário para entender]

### Ação Solicitada
[O que você quer que o destinatário faça]

### Deadline
[Quando precisa estar pronto]

### Recursos
- [Link/arquivo 1]
- [Link/arquivo 2]

---

## Budget Alocado

| Item | Valor |
|------|-------|
| Estimativa | $X.XX |
| Modelo sugerido | [Haiku/Sonnet/Opus] |
| Tempo estimado | [horas] |

---

## Resposta (preenchido pelo destinatário)

**Status:** ACKNOWLEDGED / IN PROGRESS / COMPLETE / BLOCKED

### Resposta
[Conteúdo da resposta]

### Resultado
[Link para entrega, se aplicável]

### Custo Real
- Tokens usados: [N]
- Custo: $X.XX
- Tempo: [horas]

---

_Template v1.0_
```

---

## Exemplo de Uso

```markdown
# Mensagem: Spec para Dashboard de Custos

**ID:** MSG-20260208-001
**Timestamp:** 2026-02-08 10:15 UTC

---

## Remetente
- **Agente:** Nami
- **Papel:** Requirements Manager

## Destinatário
- **Agente:** Zoro
- **Papel:** Code Warrior

## Prioridade
- [ ] 🔴 CRITICAL
- [x] 🟡 HIGH
- [ ] 🟢 NORMAL
- [ ] ⚪ LOW

## Tipo
- [x] 📋 REQUEST
- [x] 📬 HANDOFF

---

## Conteúdo

### Assunto
Implementar endpoint GET /api/v1/dashboard/costs

### Contexto
Usuário reportou que não consegue visualizar custos. Precisamos de um endpoint para o dashboard.

### Ação Solicitada
Implementar endpoint conforme spec anexo, com testes.

### Deadline
2026-02-08 16:00 UTC

### Recursos
- [docs/specs/dashboard-costs.md]
- [templates/task.md#TASK-20260208-003]

---

## Budget Alocado

| Item | Valor |
|------|-------|
| Estimativa | $0.40 |
| Modelo sugerido | Sonnet |
| Tempo estimado | 2h |
```
