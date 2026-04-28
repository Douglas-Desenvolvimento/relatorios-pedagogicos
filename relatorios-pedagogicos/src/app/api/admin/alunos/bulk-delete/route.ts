// DELETE /api/admin/alunos/bulk-delete - apaga TODOS os alunos
// (somente ADMIN). Cascata: relatorios e conceitos antes.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const before = await prisma.aluno.count()
    await prisma.$transaction(async (tx) => {
      await tx.relatorio.deleteMany({})
      await tx.conceitoAlunoBimestre.deleteMany({})
      await tx.aluno.deleteMany({})
    })
    return NextResponse.json({
      ok: true,
      message: `${before} aluno(s) e seus relatórios/conceitos foram removidos.`,
      deleted: before,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/alunos/bulk-delete]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
