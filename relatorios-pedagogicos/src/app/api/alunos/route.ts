// app/api/alunos/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, withAudit } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function professorCanAccessTurma(professorId: number, turmaId: number): Promise<boolean> {
  const vinculo = await prisma.professor.findFirst({
    where: { id: professorId, turmas: { some: { id: turmaId } } },
    select: { id: true },
  })
  return Boolean(vinculo)
}

export async function GET(request: NextRequest) {
  const guard = await requireRole(request, ['ADMIN', 'COORDENADOR', 'PROFESSOR'])
  if ('response' in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turmaId')
  const includeParams = searchParams.get('include') || ''
  const includeRelatorios = includeParams.includes('relatorios')
  const includeConceitos = includeParams.includes('conceitos')
  const includeCount = includeParams === 'count'
  const professorIdParam = searchParams.get('professorId')
  const materiaId = searchParams.get('materiaId')
  const bimestreId = searchParams.get('bimestreId')
  const status = searchParams.get('status') || 'ENVIADO'

  try {
    const whereClause: any = { active: true, deletedAt: null }

    if (turmaId) {
      const tid = Number(turmaId)
      if (!Number.isInteger(tid) || tid <= 0) {
        return NextResponse.json({ error: 'turmaId inválido' }, { status: 400 })
      }
      whereClause.turmaId = tid

      if (guard.token.role === 'PROFESSOR') {
        const allowed = await professorCanAccessTurma(Number(guard.token.sub), tid)
        if (!allowed) {
          return NextResponse.json({ error: 'Acesso negado à turma' }, { status: 403 })
        }
      }
    } else if (guard.token.role === 'PROFESSOR') {
      return NextResponse.json(
        { error: 'Professor deve informar uma turma vinculada' },
        { status: 400 },
      )
    }

    const includeConfig: any = {
      turma: { select: { id: true, name: true } },
    }

    if (includeConceitos && guard.token.role !== 'PROFESSOR') {
      includeConfig.conceitosBimestrais = {
        include: { bimestre: { select: { id: true, numero: true } } },
      }
    }

    if (includeRelatorios) {
      const relatorioWhere: any = { status, deletedAt: null }
      if (turmaId) relatorioWhere.turmaId = Number(turmaId)
      if (materiaId) relatorioWhere.materiaId = Number(materiaId)
      if (bimestreId) relatorioWhere.bimestreId = Number(bimestreId)

      if (guard.token.role === 'PROFESSOR') {
        relatorioWhere.professorId = Number(guard.token.sub)
      } else if (professorIdParam) {
        relatorioWhere.professorId = Number(professorIdParam)
      }

      includeConfig.relatorios = {
        where: relatorioWhere,
        include: {
          professor: { select: { id: true, name: true } },
          materia: { select: { id: true, name: true } },
          turma: { select: { id: true, name: true } },
          bimestre: { select: { id: true, numero: true } },
        },
        orderBy: { createdAt: 'desc' },
      }
    }

    if (includeCount) {
      includeConfig._count = { select: { relatorios: true } }
    }

    const alunos = await prisma.aluno.findMany({
      where: whereClause,
      include: includeConfig,
      orderBy: { name: 'asc' },
      take: 500,
    })

    return NextResponse.json(alunos)
  } catch (error) {
    console.error('Erro ao buscar alunos:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar alunos' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const { name, matricule, turmaId, dataNascimento } = await request.json()
      const parsedTurmaId = Number(turmaId)

      if (!name || !matricule || !Number.isInteger(parsedTurmaId)) {
        return NextResponse.json(
          { error: 'Nome, matrícula e turma são obrigatórios' },
          { status: 400 },
        )
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

      const matriculaExistente = await prisma.aluno.findFirst({
        where: { matricule },
        select: { id: true },
      })

      if (matriculaExistente) {
        return NextResponse.json(
          { error: 'Já existe um aluno com esta matrícula' },
          { status: 400 },
        )
      }

      const aluno = await prisma.aluno.create({
        data: {
          name: String(name).trim(),
          matricule: String(matricule).trim(),
          turmaId: parsedTurmaId,
          active: true,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        },
        include: {
          turma: { select: { id: true, name: true } },
          _count: { select: { relatorios: true } },
        },
      })

      return NextResponse.json(aluno)
    } catch (error) {
      console.error('Erro ao criar aluno:', error)
      return NextResponse.json(
        { error: 'Falha ao criar aluno' },
        { status: 500 },
      )
    }
  })
}
