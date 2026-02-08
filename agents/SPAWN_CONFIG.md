# Configuração de Spawn de Sub-Agentes

## Modelo Preferido: Opus Thinking

Usar **claude-opus-4-5-thinking** para sub-agentes porque:
- Raciocínio profundo para tarefas complexas
- Melhor qualidade de código e documentação
- Capacidade de análise detalhada

## Padrão de Spawn

```javascript
sessions_spawn({
  label: "zoro-impl",
  model: "claude-opus-4-5-thinking",
  thinking: "medium",  // low, medium, high
  task: "...",
  runTimeoutSeconds: 600
})
```

## Níveis de Thinking

| Nível | Uso |
|-------|-----|
| `low` | Tarefas simples, edições rápidas |
| `medium` | Implementação, documentação |
| `high` | Arquitetura, decisões complexas |

## Fallback

Se opus thinking falhar (erro de API), usar:
1. `claude-sonnet-4-5` (estável, sem thinking)
2. `gemini-2.5-pro` (alternativo)

## Labels e Uso

| Agente | Label | Thinking Level |
|--------|-------|----------------|
| ⚔️ Zoro | zoro-impl | medium |
| 📚 Robin | robin-research | high |
| 🔧 Franky | franky-infra | medium |
| 🩺 Chopper | chopper-debug | high |
| 🍊 Nami | nami-ux | medium |
| 🎯 Usopp | usopp-comm | low |
| 🍳 Sanji | sanji-api | medium |
