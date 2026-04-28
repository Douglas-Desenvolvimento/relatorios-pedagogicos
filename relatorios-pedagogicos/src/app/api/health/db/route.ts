import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureDatabaseInitialized } from '@/lib/db-init'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/health/db
 *
 * Endpoint de diagnóstico:
 *  - Verifica se DATABASE_URL está configurada.
 *  - Tenta conectar.
 *  - Lista tabelas existentes vs. exigidas.
 *  - Dispara `ensureDatabaseInitialized()` (cria o que faltar).
 *
 * Pode ser chamado a qualquer momento para forçar a checagem
 * (ex.: depois de trocar o banco no Vercel).
 */
export async function GET() {
  const log: string[] = []
  const push = (msg: string) => {
    log.push(msg)
    console.log(`[HEALTH/DB] ${msg}`)
  }

  try {
    push('🚦 Iniciando health-check do banco...')
    const hasUrl = Boolean(process.env.DATABASE_URL)
    push(`DATABASE_URL definida: ${hasUrl ? 'sim' : 'NÃO'}`)
    if (!hasUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DATABASE_URL ausente no ambiente.',
          log,
        },
        { status: 500 },
      )
    }

    await prisma.$queryRaw`SELECT 1`
    push('✅ Conexão com banco OK')

    const tablesBefore = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `
    push(`Tabelas antes do init: ${tablesBefore.length}`)

    await ensureDatabaseInitialized()
    push('✅ ensureDatabaseInitialized() concluído')

    const tablesAfter = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `
    push(`Tabelas depois do init: ${tablesAfter.length}`)

    return NextResponse.json({
      ok: true,
      databaseUrlConfigured: true,
      tablesBefore: tablesBefore.map((r) => r.table_name).sort(),
      tablesAfter: tablesAfter.map((r) => r.table_name).sort(),
      log,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[HEALTH/DB] ❌ Erro:', err)
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    )
  }
}
