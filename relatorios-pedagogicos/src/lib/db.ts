import { PrismaClient } from '@prisma/client'
import { redactForAudit } from './security'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// IMPORTANTE: NÃO passar `datasources.db.url` aqui.
// O Prisma já lê `env("DATABASE_URL")` definido em prisma/schema.prisma
// de forma LAZY (na primeira query). Setar `url: process.env.DATABASE_URL`
// força validação no momento do `new PrismaClient(...)`, e durante o
// build do Next.js (page data collection) a env var pode estar ausente,
// causando: "Invalid value undefined for datasource 'db'".
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma

// Tabelas (modelos Prisma) que devem ter create/update/delete auditados.
// LoginAudit NÃO entra aqui (geraria loop infinito).
const AUDITED_MODELS = new Set([
  'User',
  'Professor',
  'Aluno',
  'Turma',
  'Materia',
  'Relatorio',
  'AnoLetivo',
  'Bimestre',
  'ConceitoAlunoBimestre',
])
const AUDITED_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
])

/**
 * Extension que registra (post-mutation) cada create/update/delete em
 * `login_audit`, lendo o usuário atual do AsyncLocalStorage.
 * Falhas no log nunca propagam; auditoria é best-effort.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args)
        if (
          AUDITED_MODELS.has(model || '') &&
          AUDITED_OPERATIONS.has(operation)
        ) {
          try {
            const { getAuditContext } = await import('./audit-context')
            const ctx = getAuditContext()
            if (ctx) {
              const action = `${operation.toUpperCase()}_${model?.toUpperCase()}`
              const summary = summarize(operation, args, result)
              await basePrisma.loginAudit
                .create({
                  data: {
                    userId: ctx.userId,
                    role: ctx.role,
                    nome: ctx.nome || null,
                    identifier: action.slice(0, 150),
                    ip: ctx.ip?.slice(0, 64) ?? null,
                    userAgent: ctx.userAgent?.slice(0, 180) ?? null,
                    success: true,
                    message: summary.message,
                    executedData: JSON.stringify(redactForAudit(summary.data)).slice(0, 10000),
                  },
                })
                .catch(() => {})
            }
          } catch {
            // ignore
          }
        }
        return result
      },
    },
  },
})

type Summary = { message: string; data: Record<string, unknown> }
function summarize(operation: string, args: unknown, result: unknown): Summary {
  const a = args as Record<string, unknown>
  if (operation === 'createMany' || operation === 'updateMany' || operation === 'deleteMany') {
    const r = result as { count?: number }
    return {
      message: `${operation} (count=${r?.count ?? '?'})`,
      data: { operation, where: a?.where, count: r?.count },
    }
  }
  if (operation === 'delete') {
    const r = result as { id?: number }
    return {
      message: `delete id=${r?.id ?? '?'}`,
      data: { operation, where: a?.where, deleted_id: r?.id },
    }
  }
  const r = result as { id?: number }
  return {
    message: `${operation} id=${r?.id ?? '?'}`,
    data: {
      operation,
      where: a?.where,
      data: a?.data ? redactForAudit(a.data) : undefined,
      result_id: r?.id,
    },
  }
}

// Função para verificar conexão
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
