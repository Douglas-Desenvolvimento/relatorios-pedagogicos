// DELETE /api/admin/turmas/bulk-delete - apaga TODAS as turmas
// (somente ADMIN). Em transação: marca relatórios como deletedAt, marca
// alunos como soft-deleted (active=false + deletedAt), depois remove
// turmas/conceitos/vínculos.
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
    const turmasAntes = await prisma.turma.count()
    const alunosAntes = await prisma.aluno.count({ where: { deletedAt: null } })
    const now = new Date()

    let relatoriosMarcados = 0
    let alunosSoftDel = 0
    let conceitosDel = 0
    await prisma.$transaction(async (tx) => {
      const r = await tx.relatorio.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: now },
      })
      relatoriosMarcados = r.count
      await tx.relatorio.deleteMany({})

      const c = await tx.conceitoAlunoBimestre.deleteMany({})
      conceitosDel = c.count

      const a = await tx.aluno.updateMany({
        where: { deletedAt: null },
        data: { active: false, deletedAt: now },
      })
      alunosSoftDel = a.count
      await tx.aluno.deleteMany({})

      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorTurma"`)
      await tx.$executeRawUnsafe(`DELETE FROM "_MateriaTurma"`)
      await tx.turma.deleteMany({})
    })

    const summary = {
      action: 'BULK_DELETE_TURMAS',
      turmas_deleted: turmasAntes,
      alunos_soft_deleted_then_dropped: alunosSoftDel,
      relatorios_marcados_e_apagados: relatoriosMarcados,
      conceitos_deleted: conceitosDel,
      totals_before: { turmas: turmasAntes, alunos: alunosAntes },
      timestamp: now.toISOString(),
    }
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip, userAgent,
      action: 'BULK_DELETE_TURMAS',
      success: true,
      executedData: summary,
      message: `${turmasAntes} turmas e ${alunosSoftDel} alunos removidos`,
    })

    return NextResponse.json({
      ok: true,
      message: `${turmasAntes} turma(s) removida(s). ${alunosSoftDel} aluno(s) marcados e apagados. ${relatoriosMarcados} relatório(s) com data de deleção.`,
      ...summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/turmas/bulk-delete]', err)
    await recordAdminAction({
      actorUserId: parseInt(guard.token.sub),
      actorRole: guard.token.role,
      actorNome: guard.token.nome,
      ip, userAgent,
      action: 'BULK_DELETE_TURMAS',
      success: false,
      message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
