// DELETE /api/admin/professores/bulk-delete - apaga TODOS os professores
// (somente ADMIN). Em transação, remove vínculos M:N e relatórios antes.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const before = await prisma.professor.count()
    // Em ordem: relatorios -> tabelas pivot M:N -> professores
    await prisma.$transaction(async (tx) => {
      await tx.relatorio.deleteMany({})
      // pivots M:N: usar raw porque Prisma não expõe diretamente
      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorMateria"`)
      await tx.$executeRawUnsafe(`DELETE FROM "_ProfessorTurma"`)
      await tx.professor.deleteMany({})
    })
    return NextResponse.json({
      ok: true,
      message: `${before} professor(es) e seus vínculos/relatórios foram removidos.`,
      deleted: before,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/professores/bulk-delete]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
