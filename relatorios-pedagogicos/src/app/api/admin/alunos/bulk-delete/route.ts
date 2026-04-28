// DELETE /api/admin/alunos/bulk-delete - SOFT-DELETE de TODOS os alunos
// (somente ADMIN). Marca alunos como active=false + deletedAt=now.
// Marca também todos os relatórios como deletedAt=now (não DROP).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'
import {
  recordAdminAction,
  extractClientIp,
  extractUserAgent,
} from '@/lib/login-audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  try {
    const totalAlunos = await prisma.aluno.count({ where: { deletedAt: null } })
    const totalRelatorios = await prisma.relatorio.count({ where: { deletedAt: null } })
    const now = new Date()

    let alunosUpd = 0
    let relatoriosUpd = 0
    let conceitosDel = 0

    await prisma.$transaction(async (tx) => {
      const r = await tx.relatorio.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: now },
      })
      relatoriosUpd = r.count

      // Conceitos: soft-delete não definido pelo usuário -> apagar
      const c = await tx.conceitoAlunoBimestre.deleteMany({})
      conceitosDel = c.count

      const a = await tx.aluno.updateMany({
        where: { deletedAt: null },
        data: { active: false, deletedAt: now },
      })
      alunosUpd = a.count
    })

    const summary = {
      action: 'BULK_DELETE_ALUNOS',
      alunos_soft_deleted: alunosUpd,
      relatorios_soft_deleted: relatoriosUpd,
      conceitos_deleted: conceitosDel,
      totals_before: { alunos: totalAlunos, relatorios: totalRelatorios },
      timestamp: now.toISOString(),
    }
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip,
      userAgent,
      action: 'BULK_DELETE_ALUNOS',
      success: true,
      executedData: summary,
      message: `${alunosUpd} alunos / ${relatoriosUpd} relatórios marcados como excluídos`,
    })

    return NextResponse.json({
      ok: true,
      message: `${alunosUpd} aluno(s) marcados como excluídos. ${relatoriosUpd} relatório(s) marcado(s) com data de deleção. ${conceitosDel} conceito(s) removido(s).`,
      ...summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/alunos/bulk-delete]', err)
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip,
      userAgent,
      action: 'BULK_DELETE_ALUNOS',
      success: false,
      message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
