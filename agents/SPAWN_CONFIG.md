# Configuração de Spawn de Sub-Agentes

## Modelo Padrão para Sub-Agentes

Usar **claude-sonnet-4-5** (sem thinking) para sub-agentes porque:
- Mais estável em sessões isoladas
- Sem problemas de "thinking.signature"
- Custo menor
- Velocidade maior

## Padrão de Spawn

```javascript
sessions_spawn({
  label: "zoro-impl",
  model: "claude-sonnet-4-5",  // Sem thinking!
  task: "...",
  runTimeoutSeconds: 600
})
```

## Quando Usar Thinking

Reservar thinking para:
- Sessão principal (Imu)
- Tarefas de arquitetura complexa
- Decisões críticas

## Labels e Modelos

| Agente | Label | Modelo Recomendado |
|--------|-------|-------------------|
| ⚔️ Zoro | zoro-impl | claude-sonnet-4-5 |
| 📚 Robin | robin-research | claude-sonnet-4-5 |
| 🔧 Franky | franky-infra | claude-sonnet-4-5 |
| 🩺 Chopper | chopper-debug | claude-sonnet-4-5 |
| 🍊 Nami | nami-ux | claude-sonnet-4-5 |
| 🎯 Usopp | usopp-comm | claude-sonnet-4-5 |
| 🍳 Sanji | sanji-api | claude-sonnet-4-5 |

## Fallback

Se sonnet falhar, tentar:
1. gemini-2.5-pro
2. claude-haiku (para tarefas simples)
