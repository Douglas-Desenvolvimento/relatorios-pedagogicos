# Auto-inicialização do banco de dados

A partir do branch **v5_app**, o app verifica e cria automaticamente o schema do
banco PostgreSQL na inicialização (Vercel cold start ou `next start` local).

## Como funciona

1. **`src/instrumentation.ts`** (Next.js hook nativo) roda 1x quando o servidor sobe.
2. Chama **`ensureDatabaseInitialized()`** em `src/lib/db-init.ts`.
3. O init:
   - Confirma `DATABASE_URL` configurada.
   - Conecta ao Postgres (`SELECT 1`).
   - Lista tabelas em `information_schema.tables` (schema `public`).
   - Compara com a lista de tabelas exigidas pelo schema Prisma v3.
   - Se faltar alguma: executa **`prisma/init-schema.sql`** (gerado a partir
     de `prisma migrate diff --from-empty --to-schema-datamodel`).
   - Cada statement é executado com `prisma.$executeRawUnsafe()`.
     Erros tipo `already exists` são ignorados (idempotente).
4. Estado é cacheado em `globalThis` por processo (cold start = re-checagem rápida).
5. Se a `DATABASE_URL` mudar (fingerprint diferente), o init roda novamente.

## Variáveis de ambiente necessárias (Vercel + local)

```env
# usado pelo app em runtime
DATABASE_URL="postgres://...:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# usado pelo Prisma para migrate / db push (sem pooler)
DIRECT_DATABASE_URL="postgres://...:5432/postgres?sslmode=require"

JWT_SECRET="..."
```

> **Supabase:** `DATABASE_URL` deve ser o **pooler 6543** com `pgbouncer=true`.
> `DIRECT_DATABASE_URL` deve usar a porta **5432**.

## Logs esperados

### Primeira subida (banco zerado)
```
[INSTRUMENTATION] 🚀 Inicializando aplicação...
[DB INIT] 🔍 Verificando schema do banco...
[DB INIT]    Banco alvo: aws-1-us-east-1.pooler.supabase.com:6543/postgres
[DB INIT] ✅ Conexão com PostgreSQL OK
[DB INIT] 📋 Tabelas no schema 'public': 0 encontrada(s)
[DB INIT] ⚠️  12 tabela(s) ausente(s): users, professores, ...
[DB INIT] 🛠️  Iniciando criação automática do schema...
[DB INIT] 📜 Executando 67 statements de criação...
[DB INIT] 📊 Statements: ✅ criados=67  ⏭️  já existentes=0  ❌ falhas=0
[DB INIT] ✅ Schema criado/atualizado com sucesso.
[DB INIT] ⏱️  Concluído em ~10s
[INSTRUMENTATION] ✅ Inicialização concluída
```

### Subidas subsequentes (banco já populado)
```
[DB INIT] 🔍 Verificando schema do banco...
[DB INIT] ✅ Conexão com PostgreSQL OK
[DB INIT] 📋 Tabelas no schema 'public': 12 encontrada(s)
[DB INIT] ✅ Todas as tabelas exigidas existem. Nada a fazer.
[DB INIT] ⏱️  Concluído em ~500ms
```

## Endpoint de diagnóstico

`GET /api/health/db` - força a checagem e retorna JSON com:
- `databaseUrlConfigured`: boolean
- `tablesBefore`: lista antes do init
- `tablesAfter`: lista depois do init
- `log`: passos executados

Útil para validar manualmente após trocar a `DATABASE_URL` no Vercel.

## Scripts npm

| Comando | O que faz |
|---|---|
| `npm run dev` / `yarn dev` | Sobe local (auto-init no primeiro request) |
| `npm run build` | Build padrão (auto-init em runtime no Vercel) |
| `npm run build:with-db-sync` | Build + `prisma db push` (defesa em profundidade) |
| `npm run db:push` | Sincroniza schema.prisma → banco manualmente |
| `npx tsx scripts/test-db-init.ts` | Testa o init contra o banco da `.env.local` |

## Quando NÃO confiar na auto-inicialização

- Mudanças destrutivas (DROP COLUMN, ALTER TYPE em colunas existentes):
  o init só CRIA o que falta, **não migra dados**. Para isso use migrations
  Prisma (`prisma migrate dev`) ou aplique SQL manualmente.
- O arquivo `prisma/init-schema.sql` deve ser regenerado quando o schema
  mudar:
  ```bash
  npx prisma migrate diff --from-empty \
    --to-schema-datamodel prisma/schema.prisma --script \
    > prisma/init-schema.sql
  ```
