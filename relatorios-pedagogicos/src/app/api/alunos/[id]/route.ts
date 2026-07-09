// app/api/alunos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireCoordOrAdmin, withAudit } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseId(id: string): number | null {
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireCoordOrAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const params = await context.params
    const alunoId = parseId(params.id)

    if (!alunoId) {
      return NextResponse.json(
        { error: 'ID do aluno inválido' },
        { status: 400 },
      )
    }

    const aluno = await prisma.aluno.findFirst({
      where: { id: alunoId, deletedAt: null },
      include: {
        turma: { select: { id: true, name: true } },
        relatorios: {
          where: { deletedAt: null },
          include: {
            professor: { select: { id: true, name: true } },
            materia: { select: { id: true, name: true } },
            turma: { select: { id: true, name: true } },
            bimestre: { select: { id: true, numero: true } },
          },
        },
        _count: { select: { relatorios: true } },
      },
    })

    if (!aluno) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json(aluno)
  } catch (error) {
    console.error('Erro ao buscar aluno:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar aluno' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const params = await context.params
      const alunoId = parseId(params.id)
      const { name, matricule, turmaId, dataNascimento, active } = await request.json()

      if (!alunoId) {
        return NextResponse.json(
          { error: 'ID do aluno inválido' },
          { status: 400 },
        )
      }

      const alunoExistente = await prisma.aluno.findUnique({
        where: { id: alunoId },
      })

      if (!alunoExistente) {
        return NextResponse.json(
          { error: 'Aluno não encontrado' },
          { status: 404 },
        )
      }

      if (matricule && matricule !== alunoExistente.matricule) {
        const matriculaExistente = await prisma.aluno.findFirst({
          where: { matricule, id: { not: alunoId } },
          select: { id: true },
        })

        if (matriculaExistente) {
          return NextResponse.json(
            { error: 'Já existe um aluno com esta matrícula' },
            { status: 400 },
          )
        }
      }

      const parsedTurmaId = turmaId ? Number(turmaId) : alunoExistente.turmaId
      if (!Number.isInteger(parsedTurmaId)) {
        return NextResponse.json({ error: 'Turma inválida' }, { status: 400 })
      }

      const turmaExistente = await prisma.turma.findUnique({
        where: { id: parsedTurmaId },
        select: { id: true },
      })

      if (!turmaExistente) {
        return NextResponse.json(
          { error: 'Turma não encontrada' },
          { status: 400 },
        )
      }

      const aluno = await prisma.aluno.update({
        where: { id: alunoId },
        data: {
          name: name ? String(name).trim() : alunoExistente.name,
          matricule: matricule ? String(matricule).trim() : alunoExistente.matricule,
          turmaId: parsedTurmaId,
          dataNascimento:
            dataNascimento === undefined
              ? alunoExistente.dataNascimento
              : dataNascimento
                ? new Date(dataNascimento)
                : null,
          active: active === undefined ? alunoExistente.active : Boolean(active),
        },
        include: {
          turma: { select: { id: true, name: true } },
          _count: { select: { relatorios: true } },
        },
      })

      return NextResponse.json(aluno)
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar aluno' },
        { status: 500 },
      )
    }
  })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const params = await context.params
      const alunoId = parseId(params.id)

      if (!alunoId) {
        return NextResponse.json(
          { error: 'ID do aluno inválido' },
          { status: 400 },
        )
      }

      const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
      if (!aluno) {
        return NextResponse.json(
          { error: 'Aluno não encontrado' },
          { status: 404 },
        )
      }

      const now = new Date()
await prisma.$transaction([
  prisma.relatorio.updateMany({
    where: { alunoId, deletedAt: null },
    data: { deletedAt: now },
  }),
  prisma.aluno.update({
    where: { id: alunoId },
    data: { active: false, deletedAt: now },
  }),
])

      return NextResponse.json({ message: 'Aluno excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir aluno:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir aluno' },
        { status: 500 },
      )
    }
  })
}
