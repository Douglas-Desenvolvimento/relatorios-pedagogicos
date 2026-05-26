// src/app/api/professores/[professorId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashMatricula } from '@/lib/matriculaHash'
import { requireAdmin, requireRole, withAudit } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseProfessorId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ professorId: string }> },
) {
  const guard = await requireRole(req, ['ADMIN', 'COORDENADOR', 'PROFESSOR'])
  if ('response' in guard) return guard.response

  try {
    const { professorId } = await params
    const professorIdNum = parseProfessorId(professorId)

    if (!professorIdNum) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 })
    }

    if (guard.token.role === 'PROFESSOR' && Number(guard.token.sub) !== professorIdNum) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const professor = await prisma.professor.findUnique({
      where: { id: professorIdNum },
      include: {
        materias: {
          select: {
            id: true,
            name: true,
            codigo: true,
            turmas: {
              where: { professores: { some: { id: professorIdNum } } },
              select: { id: true, name: true },
            },
          },
        },
        turmas: {
          where: { professores: { some: { id: professorIdNum } } },
          select: {
            id: true,
            name: true,
            materias: { select: { id: true, name: true } },
          },
        },
        _count: { select: { relatorios: true } },
      },
    })

    if (!professor) {
      return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
    }

    return NextResponse.json(professor)
  } catch (error) {
    console.error('Erro ao buscar professor:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar professor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return withAudit(request, ['ADMIN'], async () => {
    try {
      const { professorId } = await params
      const professorIdNum = parseProfessorId(professorId)
      const { name, email, matricula, login, turmaIds, materiaIds } = await request.json()

      if (!professorIdNum) {
        return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 })
      }

      const professorExistente = await prisma.professor.findUnique({
        where: { id: professorIdNum },
      })

      if (!professorExistente) {
        return NextResponse.json(
          { error: 'Professor não encontrado' },
          { status: 404 },
        )
      }

      if (email && email !== professorExistente.email) {
        const emailExistente = await prisma.professor.findFirst({
          where: { email, id: { not: professorIdNum } },
          select: { id: true },
        })

        if (emailExistente) {
          return NextResponse.json(
            { error: 'Já existe um professor com este email' },
            { status: 400 },
          )
        }
      }

      if (matricula && matricula !== professorExistente.matricula) {
        const matriculaExistente = await prisma.professor.findFirst({
          where: { matricula, id: { not: professorIdNum } },
          select: { id: true },
        })

        if (matriculaExistente) {
          return NextResponse.json(
            { error: 'Já existe um professor com esta matrícula' },
            { status: 400 },
          )
        }
      }

      const turmasConnect = Array.isArray(turmaIds)
        ? turmaIds.filter((id) => Number.isInteger(Number(id))).map((id) => ({ id: Number(id) }))
        : []
      const materiasConnect = Array.isArray(materiaIds)
        ? materiaIds.filter((id) => Number.isInteger(Number(id))).map((id) => ({ id: Number(id) }))
        : []

      const matriculaHash = matricula ? hashMatricula(matricula) : professorExistente.matricula_hash

      let loginFinal = professorExistente.login
      if (login !== undefined && login !== professorExistente.login) {
        if (String(login).trim()) {
          const cleanLogin = String(login).trim().toLowerCase()
          const loginExistente = await prisma.professor.findFirst({
            where: { login: cleanLogin, id: { not: professorIdNum } },
            select: { id: true },
          })

          if (loginExistente) {
            return NextResponse.json(
              { error: 'Já existe um professor com este login' },
              { status: 400 },
            )
          }

          loginFinal = cleanLogin
        } else {
          const { gerarLogin } = await import('@/lib/loginGenerator')
          loginFinal = await gerarLogin(name || professorExistente.name)
        }
      }

      const professor = await prisma.professor.update({
        where: { id: professorIdNum },
        data: {
          name: name ? String(name).trim() : professorExistente.name,
          email: email ? String(email).trim().toLowerCase() : professorExistente.email,
          matricula: matricula !== undefined ? String(matricula).trim() : professorExistente.matricula,
          matricula_hash: matriculaHash,
          login: loginFinal,
          turmas: { set: turmasConnect },
          materias: { set: materiasConnect },
        },
        include: {
          turmas: true,
          materias: true,
        },
      })

      for (const turma of turmasConnect) {
        for (const materia of materiasConnect) {
          const relacaoExistente = await prisma.turma.findFirst({
            where: {
              id: turma.id,
              materias: { some: { id: materia.id } },
            },
            select: { id: true },
          })

          if (!relacaoExistente) {
            await prisma.turma.update({
              where: { id: turma.id },
              data: { materias: { connect: { id: materia.id } } },
            })
          }
        }
      }

      return NextResponse.json(professor)
    } catch (error) {
      console.error('Erro ao atualizar professor:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar professor' },
        { status: 500 },
      )
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return withAudit(request, ['ADMIN'], async () => {
    try {
      const { professorId } = await params
      const professorIdNum = parseProfessorId(professorId)

      if (!professorIdNum) {
        return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 })
      }

      const professor = await prisma.professor.findUnique({ where: { id: professorIdNum } })
      if (!professor) {
        return NextResponse.json(
          { error: 'Professor não encontrado' },
          { status: 404 },
        )
      }

      const relatoriosCount = await prisma.relatorio.count({
        where: { professorId: professorIdNum, deletedAt: null },
      })

      if (relatoriosCount > 0) {
        return NextResponse.json(
          { error: 'Não é possível excluir professor com relatórios vinculados' },
          { status: 400 },
        )
      }

      await prisma.professor.delete({ where: { id: professorIdNum } })

      return NextResponse.json({ message: 'Professor excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir professor:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir professor' },
        { status: 500 },
      )
    }
  })
}
