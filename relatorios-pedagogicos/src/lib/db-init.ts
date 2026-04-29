/**
 * Auto-inicialização do banco de dados.
 *
 * Verifica, na primeira execução do processo, se todas as tabelas
 * exigidas pelo schema Prisma existem no banco. Se algo estiver
 * faltando, executa o SQL de criação completo (`prisma/init-schema.sql`)
 * e logra cada passo no console.
 *
 * É seguro chamar várias vezes (idempotente):
 *  - Em caso de banco novo / zerado: cria tudo.
 *  - Em caso de banco já populado: detecta tabelas presentes e não faz nada.
 *  - Em caso de banco "trocado" (ex.: nova URL apontando para outro
 *    Supabase): roda novamente a verificação e cria o que faltar.
 */

import fs from 'node:fs'
import path from 'node:path'
import { prisma } from './db'

// Tabelas que DEVEM existir conforme schema.prisma (v3).
// Se qualquer uma estiver ausente, o init é executado.
const REQUIRED_TABLES = [
  'users',
  'professores',
  'alunos',
  'materias',
  'turmas',
  'relatorios',
  'anos_letivos',
  'bimestres',
  'conceitos_alunos_bimestres',
  'login_audit',
  '_ProfessorMateria',
  '_ProfessorTurma',
  '_MateriaTurma',
] as const

// Colunas que devem existir em tabelas já criadas. Se faltar, o init
// roda um ALTER TABLE ADD COLUMN IF NOT EXISTS — útil para rodar
// upgrades incrementais (ex: schema v3 → v3.1 com novos campos).
type ColumnSpec = { table: string; column: string; ddl: string }
const REQUIRED_COLUMNS: ColumnSpec[] = [
  {
    table: 'professores',
    column: 'role',
    ddl: `ALTER TABLE "professores" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'PROFESSOR'`,
  },
  {
    table: 'professores',
    column: 'data_nascimento',
    ddl: `ALTER TABLE "professores" ADD COLUMN IF NOT EXISTS "data_nascimento" TIMESTAMP(3)`,
  },
  {
    table: 'alunos',
    column: 'data_nascimento',
    ddl: `ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "data_nascimento" TIMESTAMP(3)`,
  },
  {
    table: 'alunos',
    column: 'created_at',
    ddl: `ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
  {
    table: 'alunos',
    column: 'updated_at',
    ddl: `ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
  {
    table: 'alunos',
    column: 'deleted_at',
    ddl: `ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`,
  },
  {
    table: 'relatorios',
    column: 'deleted_at',
    ddl: `ALTER TABLE "relatorios" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)`,
  },
  {
    table: 'login_audit',
    column: 'executed_data',
    ddl: `ALTER TABLE "login_audit" ADD COLUMN IF NOT EXISTS "executed_data" TEXT`,
  },
  {
    table: 'users',
    column: 'login',
    ddl: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login" VARCHAR(100)`,
  },
  {
    table: 'users',
    column: 'id_tb_professor',
    ddl: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_tb_professor" INTEGER`,
  },
  {
    table: 'users',
    column: 'must_change_password',
    ddl: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false`,
  },
]

// Cache no escopo do processo (evita re-executar na mesma instância).
// Em Vercel/serverless cada cold start refaz a checagem (rápida, ~1 query).
type InitState = {
  initialized: boolean
  databaseFingerprint: string | null
  promise: Promise<void> | null
}

const globalForInit = globalThis as unknown as { __dbInit?: InitState }
if (!globalForInit.__dbInit) {
  globalForInit.__dbInit = {
    initialized: false,
    databaseFingerprint: null,
    promise: null,
  }
}
const state = globalForInit.__dbInit

/**
 * Calcula um identificador estável da URL atual do banco.
 * Útil para detectar quando a `DATABASE_URL` muda em runtime
 * (forçando nova verificação/criação de schema).
 */
function getDatabaseFingerprint(): string {
  const url = process.env.DATABASE_URL ?? ''
  try {
    const u = new URL(url)
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return url.slice(0, 32)
  }
}

async function listExistingTables(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `
  return new Set(rows.map((r) => r.table_name))
}

/**
 * Divide o SQL de init em statements executáveis individualmente.
 * - Remove comentários "-- ..." e linhas em branco.
 * - Faz split por ";" no fim de linha (cada CREATE/ALTER ocupa um statement).
 */
function splitStatements(sql: string): string[] {
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  return cleaned
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function runInitScript(): Promise<void> {
  const sqlPath = path.join(process.cwd(), 'prisma', 'init-schema.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error(`[DB INIT] ❌ Arquivo SQL não encontrado: ${sqlPath}`)
    throw new Error(`init-schema.sql não encontrado em ${sqlPath}`)
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const statements = splitStatements(sql)
  console.log(`[DB INIT] 📜 Executando ${statements.length} statements de criação...`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt)
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // PostgreSQL: 42P07=duplicate_table, 42710=duplicate_object,
      // 42P06=duplicate_schema, 42701=duplicate_column
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('42P07') ||
        msg.includes('42710')
      ) {
        skipped++
      } else {
        failed++
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 120)
        console.error(`[DB INIT] ⚠️  Falha em "${preview}..." -> ${msg}`)
      }
    }
  }

  console.log(
    `[DB INIT] 📊 Statements: ✅ criados=${created}  ⏭️  já existentes=${skipped}  ❌ falhas=${failed}`,
  )

  if (failed > 0) {
    console.warn(
      `[DB INIT] ⚠️  ${failed} statements falharam (não são "already exists"). ` +
        `O app continuará, mas algumas operações podem quebrar. ` +
        `Verifique os logs acima.`,
    )
  }
}

// Índices únicos extras que não vêm naturalmente via ADD COLUMN.
async function ensureUniqueIndexes(): Promise<void> {
  const ddls = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_login_key" ON "users"("login") WHERE "login" IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_id_tb_professor_key" ON "users"("id_tb_professor") WHERE "id_tb_professor" IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS "idx_user_login" ON "users"("login")`,
    `CREATE INDEX IF NOT EXISTS "idx_user_id_tb_professor" ON "users"("id_tb_professor")`,
  ]
  for (const ddl of ddls) {
    try {
      await prisma.$executeRawUnsafe(ddl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('already exists')) {
        console.warn(`[DB INIT] ⚠️  Falha ao criar índice: ${msg}`)
      }
    }
  }
}

async function ensureRequiredColumns(): Promise<void> {
  // Lê quais colunas já existem para cada tabela exigida.
  const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `
  const existing = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`))

  const missing = REQUIRED_COLUMNS.filter(
    (c) => !existing.has(`${c.table}.${c.column}`),
  )
  if (missing.length === 0) {
    console.log('[DB INIT] ✅ Todas as colunas exigidas existem')
    return
  }

  console.log(
    `[DB INIT] ⚠️  ${missing.length} coluna(s) ausente(s): ` +
      missing.map((c) => `${c.table}.${c.column}`).join(', '),
  )
  for (const col of missing) {
    try {
      await prisma.$executeRawUnsafe(col.ddl)
      console.log(`[DB INIT] ✅ Coluna criada: ${col.table}.${col.column}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        console.log(`[DB INIT] ⏭️  Coluna ${col.table}.${col.column} já existe`)
      } else {
        console.error(`[DB INIT] ❌ Falha ao criar ${col.table}.${col.column}: ${msg}`)
      }
    }
  }
}

async function performInit(): Promise<void> {
  const fingerprint = getDatabaseFingerprint()
  const startedAt = Date.now()

  console.log('[DB INIT] 🔍 Verificando schema do banco...')
  console.log(`[DB INIT]    Banco alvo: ${fingerprint || '(DATABASE_URL ausente)'}`)

  if (!process.env.DATABASE_URL) {
    console.error(
      '[DB INIT] ❌ DATABASE_URL não está configurada no ambiente. ' +
        'Defina-a no Vercel (Project Settings → Environment Variables) ' +
        'ou em .env local antes de subir o app.',
    )
    throw new Error('DATABASE_URL ausente')
  }

  // 1) Conexão básica
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('[DB INIT] ✅ Conexão com PostgreSQL OK')
  } catch (err) {
    console.error(
      '[DB INIT] ❌ Não foi possível conectar ao banco. ' +
        'Verifique DATABASE_URL/DIRECT_DATABASE_URL e regras de rede.',
      err,
    )
    throw err
  }

  // 2) Verifica tabelas presentes
  const existing = await listExistingTables()
  const missing = REQUIRED_TABLES.filter((t) => !existing.has(t))

  console.log(
    `[DB INIT] 📋 Tabelas no schema 'public': ${existing.size} encontrada(s)`,
  )

  if (missing.length === 0) {
    console.log('[DB INIT] ✅ Todas as tabelas exigidas existem.')
    // Mesmo com tabelas OK, valida colunas (cobre upgrades incrementais).
    await ensureRequiredColumns()
    await ensureUniqueIndexes()
    state.databaseFingerprint = fingerprint
    state.initialized = true
    console.log(`[DB INIT] ⏱️  Concluído em ${Date.now() - startedAt}ms`)
    return
  }

  console.log(
    `[DB INIT] ⚠️  ${missing.length} tabela(s) ausente(s): ${missing.join(', ')}`,
  )
  console.log('[DB INIT] 🛠️  Iniciando criação automática do schema...')

  // 3) Executa SQL de criação
  await runInitScript()

  // 3.1) Garante colunas extras pós-criação
  await ensureRequiredColumns()
  await ensureUniqueIndexes()

  // 4) Re-verifica
  const finalTables = await listExistingTables()
  const stillMissing = REQUIRED_TABLES.filter((t) => !finalTables.has(t))

  if (stillMissing.length === 0) {
    console.log('[DB INIT] ✅ Schema criado/atualizado com sucesso.')
  } else {
    console.error(
      `[DB INIT] ❌ Após init ainda faltam tabelas: ${stillMissing.join(', ')}`,
    )
  }

  state.databaseFingerprint = fingerprint
  state.initialized = stillMissing.length === 0
  console.log(`[DB INIT] ⏱️  Concluído em ${Date.now() - startedAt}ms`)
}

/**
 * Garante que o banco esteja inicializado. Pode ser chamada em
 * qualquer ponto do app (rota, middleware, instrumentation).
 *
 * Se a `DATABASE_URL` mudar em runtime (fingerprint diferente),
 * executa novamente a verificação.
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  const currentFingerprint = getDatabaseFingerprint()

  // Banco "trocou" → reinicia o estado.
  if (
    state.initialized &&
    state.databaseFingerprint &&
    state.databaseFingerprint !== currentFingerprint
  ) {
    console.log(
      `[DB INIT] 🔄 DATABASE_URL mudou (${state.databaseFingerprint} → ${currentFingerprint}). ` +
        'Re-executando init...',
    )
    state.initialized = false
    state.promise = null
  }

  if (state.initialized) return
  if (state.promise) return state.promise

  state.promise = performInit()
    .catch((err) => {
      // Permite retry em chamadas futuras (não trava o processo para sempre).
      state.promise = null
      throw err
    })
    .finally(() => {
      // Mantém state.promise definido para reaproveitamento em chamadas paralelas.
    })

  return state.promise
}
