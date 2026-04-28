// GET /api/admin/counts - contagens consolidadas para o painel admin
// (somente ADMIN). Sempre filtra soft-delete.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const [professores, turmas, alunos, alunosSoftDeleted, relatorios, relatoriosSoftDeleted] =
    await Promise.all([
      prisma.professor.count(),
      prisma.turma.count(),
      prisma.aluno.count({ where: { active: true, deletedAt: null } }),
      prisma.aluno.count({ where: { OR: [{ active: false }, { deletedAt: { not: null } }] } }),
      prisma.relatorio.count({ where: { deletedAt: null } }),
      prisma.relatorio.count({ where: { deletedAt: { not: null } } }),
    ])

  return NextResponse.json({
    professores,
    turmas,
    alunos,
    alunosSoftDeleted,
    relatorios,
    relatoriosSoftDeleted,
  })
}
