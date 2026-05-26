// src/app/api/relatorios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, withAudit } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

async function validateRelatorioScope(params: {
  alunoId: number
  professorId: number
  materiaId: number
  turmaId: number
  bimestreId: number
}) {
  const [aluno, professor, bimestre, turmaMateria] = await Promise.all([
    prisma.aluno.findFirst({
      where: {
        id: params.alunoId,
        turmaId: params.turmaId,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.professor.findFirst({
      where: {
        id: params.professorId,
        materias: { some: { id: params.materiaId } },
        turmas: { some: { id: params.turmaId } },
      },
      select: { id: true },
    }),
    prisma.bimestre.findUnique({
      where: { id: params.bimestreId },
      select: { id: true },
    }),
    prisma.turma.findFirst({
      where: {
        id: params.turmaId,
        materias: { some: { id: params.materiaId } },
      },
      select: { id: true },
    }),
  ])

  return Boolean(aluno && professor && bimestre && turmaMateria)
}

export async function GET(request: NextRequest) {
  const guard = await requireRole(request, ['ADMIN', 'COORDENADOR', 'PROFESSOR'])
  if ('response' in guard) return guard.response

  try {
    const where =
      guard.token.role === 'PROFESSOR'
        ? { status: 'ENVIADO' as const, deletedAt: null, professorId: Number(guard.token.sub) }
        : { status: 'ENVIADO' as const, deletedAt: null }

    const relatorios = await prisma.relatorio.findMany({
      where,
      include: {
        aluno: {
          select: {
            id: true,
            name: true,
            turma: { select: { id: true, name: true } },
          },
        },
        professor: { select: { id: true, name: true } },
        materia: { select: { id: true, name: true } },
        turma: { select: { id: true, name: true } },
        bimestre: { select: { id: true, numero: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json(relatorios)
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar relatórios' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return withAudit(request, ['ADMIN', 'COORDENADOR', 'PROFESSOR'], async (token) => {
    try {
      const body = await request.json()
      const conteudo = String(body.conteudo || '').trim()

      if (!conteudo) {
        return NextResponse.json(
          { error: 'O conteúdo do relatório não pode estar vazio.' },
          { status: 400 },
        )
      }

      const alunoId = toInt(body.alunoId)
      const materiaId = toInt(body.materiaId)
      const turmaId = toInt(body.turmaId)
      const bimestreId = toInt(body.bimestreId)
      const professorId =
        token.role === 'PROFESSOR' ? Number(token.sub) : toInt(body.professorId)

      if (!alunoId || !professorId || !materiaId || !turmaId || !bimestreId) {
        return NextResponse.json(
          { error: 'Aluno, professor, matéria, turma e bimestre são obrigatórios.' },
          { status: 400 },
        )
      }

      const scopeOk = await validateRelatorioScope({
        alunoId,
        professorId,
        materiaId,
        turmaId,
        bimestreId,
      })

      if (!scopeOk) {
        return NextResponse.json(
          { error: 'Vínculo inválido entre professor, aluno, turma, matéria ou bimestre.' },
          { status: 403 },
        )
      }

      const existing = await prisma.relatorio.findFirst({
        where: {
          alunoId,
          professorId,
          materiaId,
          turmaId,
          bimestreId,
          deletedAt: null,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Já existe um relatório para este aluno nesta matéria, turma e bimestre.' },
          { status: 400 },
        )
      }

      const relatorio = await prisma.relatorio.create({
        data: {
          conteudo,
          alunoId,
          professorId,
          materiaId,
          turmaId,
          bimestreId,
          status: 'ENVIADO',
        },
        include: {
          aluno: { select: { id: true, name: true } },
          professor: { select: { id: true, name: true } },
          materia: { select: { id: true, name: true } },
          turma: { select: { id: true, name: true } },
          bimestre: { select: { id: true, numero: true } },
        },
      })

      return NextResponse.json(relatorio)
    } catch (error) {
      console.error('Erro ao criar relatório:', error)
      return NextResponse.json(
        { error: 'Falha ao criar relatório' },
        { status: 500 },
      )
    }
  })
}
