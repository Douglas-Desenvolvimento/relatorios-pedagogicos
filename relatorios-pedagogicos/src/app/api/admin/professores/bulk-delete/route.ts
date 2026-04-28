// DELETE /api/admin/professores/bulk-delete - apaga TODOS os professores
// (somente ADMIN). Em transação: marca relatórios como deletedAt e remove
// vínculos M:N + professores.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'
import { recordAdminAction, extractClientIp, extractUserAgent } from '@/lib/login-audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  try {
    const before = await prisma.professor.count()
    const now = new Date()

    let relatoriosMarcados = 0
    await prisma.$transaction(async (tx) => {
      const r = await tx.relatorio.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: now },
      })
      relatoriosMarcados = r.count
      await tx.relatorio.deleteMany({})
      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorMateria"`)
      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorTurma"`)
      await tx.professor.deleteMany({})
    })

    const summary = {
      action: 'BULK_DELETE_PROFESSORES',
      professores_deleted: before,
      relatorios_marcados_e_apagados: relatoriosMarcados,
      timestamp: now.toISOString(),
    }
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip, userAgent,
      action: 'BULK_DELETE_PROFESSORES',
      success: true,
      executedData: summary,
      message: `${before} professores e ${relatoriosMarcados} relatórios apagados`,
    })

    return NextResponse.json({
      ok: true,
      message: `${before} professor(es) removidos. ${relatoriosMarcados} relatório(s) marcado(s) com data de deleção.`,
      ...summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/professores/bulk-delete]', err)
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip, userAgent,
      action: 'BULK_DELETE_PROFESSORES',
      success: false,
      message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
