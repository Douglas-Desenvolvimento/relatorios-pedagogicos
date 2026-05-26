// src/app/api/professores/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken()

    if (!token || token.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const professorId = parseInt(token.sub)
    const { searchParams } = new URL(request.url)
    const includeRelatorios = searchParams.get('include')?.includes('relatorios')

    const professor = await prisma.professor.findUnique({
      where: { id: professorId },
      include: {
        user: { select: { active: true } },
        materias: {
          orderBy: { name: 'asc' },
          include: {
            turmas: {
              where: { professores: { some: { id: professorId } } },
              orderBy: { name: 'asc' },
              include: {
                alunos: {
                  where: { active: true, deletedAt: null },
                  orderBy: { name: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    turmaId: true,
                    relatorios: {
                      where: { professorId, deletedAt: null },
                      select: {
                        id: true,
                        status: true,
                        professorId: true,
                        materiaId: true,
                        turmaId: true,
                        bimestreId: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        turmas: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            materias: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!professor) {
      return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
    }

    if (professor.user && professor.user.active === false) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    let relatorios: any[] = []
    if (includeRelatorios) {
      relatorios = await prisma.relatorio.findMany({
        where: { professorId, deletedAt: null },
        include: {
          aluno: { select: { id: true, name: true } },
          materia: { select: { id: true, name: true } },
          turma: { select: { id: true, name: true } },
          professor: { select: { id: true, name: true } },
          bimestre: { select: { id: true, numero: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
    }

    const { user, ...professorSemUsuario } = professor
    return NextResponse.json({
      ...professorSemUsuario,
      ...(includeRelatorios && { relatorios }),
    })
  } catch (error) {
    console.error('Erro ao buscar dados do professor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
