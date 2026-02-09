# Memgraph Cloud - Guia de Provisionamento

> **Ticket:** SCRUM-224 | **Status:** Concluído  
> **Última atualização:** 2026-02-08

---

## 📋 Visão Geral

Memgraph Cloud é o serviço gerenciado do Memgraph para bancos de dados em grafo in-memory. Oferece deployment simplificado na AWS com backup automático, SSL e alta performance para workloads analíticos.

**Por que Memgraph para revenue-OS:**
- Consultas de grafo em tempo real (latência < 10ms)
- Cypher compatibility + extensões MAGE para algoritmos de grafo
- Ideal para modelagem de relacionamentos entre transações, produtos e clientes

---

## 🌎 Regiões Disponíveis (AWS)

| Região | Código AWS | Latência p/ Brasil | Recomendação |
|--------|------------|-------------------|--------------|
| US East (N. Virginia) | `us-east-1` | ~120ms | ✅ **Recomendada** - Melhor custo-benefício |
| US West (Oregon) | `us-west-2` | ~160ms | Alternativa |
| EU (Frankfurt) | `eu-central-1` | ~200ms | Se compliance EU |
| EU (Ireland) | `eu-west-1` | ~190ms | Alternativa EU |
| Asia Pacific (Singapore) | `ap-southeast-1` | ~300ms | Não recomendada |
| Asia Pacific (Sydney) | `ap-southeast-2` | ~280ms | Não recomendada |

**Decisão para revenue-OS:** `us-east-1` - menor latência para Brasil e melhor integração com outros serviços AWS na mesma região.

---

## 💾 Tamanhos de Instância

### Especificações Disponíveis

| Tier | RAM | vCPU | Storage | Uso Recomendado |
|------|-----|------|---------|-----------------|
| Dev | 1 GB | 1 | 10 GB | Desenvolvimento local |
| Small | 2 GB | 1 | 20 GB | Testes/Staging |
| Medium | 4 GB | 2 | 50 GB | Produção inicial |
| Large | 8 GB | 4 | 100 GB | Produção crescimento |
| XLarge | 16 GB | 8 | 200 GB | Produção enterprise |
| 2XLarge | 32 GB | 8 | 500 GB | Alta carga |

### 📊 Recomendação para revenue-OS

| Ambiente | Tier | RAM | Justificativa |
|----------|------|-----|---------------|
| **Development** | Dev | 1 GB | Testes locais, custo zero (trial) |
| **Staging** | Small | 2 GB | Testes de integração, dados de amostra |
| **Production** | Medium → Large | 4-8 GB | Início com 4GB, escalar conforme crescimento |

**Estimativa de capacidade (4GB RAM):**
- ~500K nós + ~2M relacionamentos
- ~50 queries/segundo em grafos complexos
- Suficiente para MVP e primeiros 6 meses

---

## 🚀 Setup Passo-a-Passo

### 1. Criar Conta no Memgraph Cloud

1. Acesse [cloud.memgraph.com](https://cloud.memgraph.com)
2. Clique em **"Start Free Trial"**
3. Registre com email corporativo (art@vivaldi.finance)
4. Confirme email e complete profile

### 2. Criar Projeto

1. No dashboard, clique **"Create New Project"**
2. Configure:
   - **Project Name:** `revenue-os-{env}` (ex: `revenue-os-prod`)
   - **Region:** `US East (N. Virginia)`
   - **Instance Size:** Conforme ambiente (ver tabela acima)
3. Clique **"Create"**
4. Aguarde ~2-3 minutos para provisionamento

### 3. Obter Credenciais de Conexão

Após criação, no painel do projeto:

1. Vá em **"Connect"** tab
2. Copie as informações:
   - **Host:** `bolt+ssc://xxxxx.memgraph.cloud:7687`
   - **Username:** (gerado automaticamente)
   - **Password:** (clique para revelar)

### 4. Testar Conexão

```bash
# Via mgconsole (CLI oficial)
mgconsole --host xxxxx.memgraph.cloud --port 7687 --use-ssl

# Via Python
pip install gqlalchemy
```

```python
from gqlalchemy import Memgraph

db = Memgraph(
    host="xxxxx.memgraph.cloud",
    port=7687,
    username="seu-usuario",
    password="sua-senha",
    encrypted=True
)

# Teste
result = db.execute_and_fetch("RETURN 'revenue-os connected!' AS msg")
print(list(result))
```

---

## 🔐 Configuração de Conexão (SSL/Credentials)

### Variáveis de Ambiente (Produção)

Adicionar ao `.env` do serviço:

```bash
# Memgraph Cloud
MEMGRAPH_HOST=xxxxx.memgraph.cloud
MEMGRAPH_PORT=7687
MEMGRAPH_USER=seu-usuario
MEMGRAPH_PASSWORD=sua-senha-segura
MEMGRAPH_USE_SSL=true
```

### Conexão Segura (SSL)

O Memgraph Cloud **exige SSL por padrão**. Use:
- Protocolo: `bolt+ssc://` (Bolt com SSL Certificate)
- Porta: `7687` (padrão Bolt)
- Certificados: Gerenciados automaticamente pelo Cloud

### Secrets Management

Para produção, armazenar credenciais em:
- **AWS Secrets Manager** (recomendado)
- **HashiCorp Vault**
- **Kubernetes Secrets** (se usar K8s)

```bash
# Exemplo AWS Secrets Manager
aws secretsmanager create-secret \
  --name revenue-os/memgraph/prod \
  --secret-string '{"host":"xxx","user":"xxx","password":"xxx"}'
```

---

## 📦 Backup e Recovery

### Backup Automático (Cloud)
- **Frequência:** Diário (00:00 UTC)
- **Retenção:** 7 dias (plano padrão) / 30 dias (enterprise)
- **Tipo:** Snapshot completo

### Backup Manual
```cypher
-- Exportar dados (via Cypher)
CALL mg.export_to_parquet('/path/to/backup.parquet');
```

### Recovery
Via dashboard Cloud: **Settings → Backups → Restore**

---

## 📊 Monitoramento

### Métricas Disponíveis no Dashboard
- Query latency (p50, p95, p99)
- Memory usage
- Active connections
- Query throughput

### Integração com Observabilidade
```python
# Prometheus metrics endpoint (se self-hosted)
# Cloud: usar dashboard nativo ou API de métricas
```

---

## 💰 Estimativa de Custos

| Ambiente | Tier | Custo Mensal (estimado) |
|----------|------|-------------------------|
| Development | Dev (trial) | $0 (14 dias) |
| Staging | Small 2GB | ~$50-100/mês |
| Production | Medium 4GB | ~$150-250/mês |
| Production | Large 8GB | ~$300-500/mês |

> **Nota:** Preços aproximados. Enterprise com HA/LDAP: ~$25k/ano para 16GB.

---

## 🔗 Referências

- [Documentação Oficial Memgraph](https://memgraph.com/docs)
- [Memgraph Cloud Docs](https://memgraph.com/docs/memgraph-cloud)
- [GQLAlchemy (Python ORM)](https://memgraph.com/docs/gqlalchemy)
- [MAGE - Graph Algorithms](https://memgraph.com/docs/mage)

---

## ✅ Checklist de Provisionamento

- [ ] Conta criada em cloud.memgraph.com
- [ ] Projeto criado na região us-east-1
- [ ] Credenciais salvas no Secrets Manager
- [ ] Conexão testada via código
- [ ] Variáveis de ambiente configuradas
- [ ] Backup automático verificado
- [ ] Time notificado no Slack

---

*Documentação criada por Franky (infra-agent) | SCRUM-224*
