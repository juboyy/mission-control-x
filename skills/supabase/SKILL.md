# Supabase Skill

Integração com Supabase para banco de dados, autenticação, storage e funções edge.

## Configuração

Token configurado em `~/.openclaw/workspace/.env`:
```
SUPABASE_TOKEN=sbp_...
```

## Comandos Disponíveis

### Listar Projetos
```bash
source ~/.openclaw/workspace/.env
curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "https://api.supabase.com/v1/projects" | jq
```

### Obter Detalhes de um Projeto
```bash
source ~/.openclaw/workspace/.env
curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "https://api.supabase.com/v1/projects/{project_id}" | jq
```

### Listar Tabelas (via SQL)
```bash
source ~/.openclaw/workspace/.env
curl -s -X POST \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.supabase.com/v1/projects/{project_id}/database/query" \
  -d '{"query": "SELECT tablename FROM pg_tables WHERE schemaname = '"'"'public'"'"'"}' | jq
```

### Storage - Listar Buckets
```bash
source ~/.openclaw/workspace/.env
curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "https://api.supabase.com/v1/projects/{project_id}/storage/buckets" | jq
```

### Edge Functions - Listar
```bash
source ~/.openclaw/workspace/.env
curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "https://api.supabase.com/v1/projects/{project_id}/functions" | jq
```

## Casos de Uso

1. **Verificar infraestrutura** - Listar projetos e recursos
2. **Debugging** - Consultar dados diretamente
3. **Monitoramento** - Verificar status de edge functions
4. **Backup** - Exportar schemas e dados

## Workflow Típico

1. Listar projetos para obter `project_id`
2. Consultar tabelas/buckets/functions do projeto
3. Executar queries SQL quando necessário
4. Monitorar edge functions

## Notas

- API Rate Limits: 60 req/min
- Token é sensível - nunca expor em logs públicos
- Para operações de escrita, verificar permissões do token
