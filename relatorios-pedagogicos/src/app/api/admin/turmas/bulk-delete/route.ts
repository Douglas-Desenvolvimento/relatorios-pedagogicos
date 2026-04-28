// DELETE /api/admin/turmas/bulk-delete - apaga TODAS as turmas
// (somente ADMIN). Cascata: relatorios, conceitos, alunos, vínculos M:N.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const before = await prisma.turma.count()
    await prisma.$transaction(async (tx) => {
      await tx.relatorio.deleteMany({})
      await tx.conceitoAlunoBimestre.deleteMany({})
      await tx.aluno.deleteMany({})
      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorTurma"`)
      await tx.$executeRawUnsafe(`DELETE FROM "_MateriaTurma"`)
      await tx.turma.deleteMany({})
    })
    return NextResponse.json({
      ok: true,
      message: `${before} turma(s) e seus alunos/relatórios/conceitos foram removidos.`,
      deleted: before,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/turmas/bulk-delete]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
