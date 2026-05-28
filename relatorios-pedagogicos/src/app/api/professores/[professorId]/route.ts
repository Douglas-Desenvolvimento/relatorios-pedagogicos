// src/app/api/professores/[professorId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { normalizeMatricula, requireRole, withAudit } from '@/lib/auth-guard'
import {
  DEFAULT_INITIAL_PASSWORD,
  deleteProfessorIfUnused,
  generateUniqueLogin,
  normalizeIdList,
  updateProfessorForUser,
} from '@/lib/user-professor-sync'

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
      return NextResponse.json({ error: 'ID do professor invalido' }, { status: 400 })
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
      return NextResponse.json({ error: 'Professor nao encontrado' }, { status: 404 })
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
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const { professorId } = await params
      const professorIdNum = parseProfessorId(professorId)
      const body = await request.json()
      const { name, email, matricula, login } = body

      if (!professorIdNum) {
        return NextResponse.json({ error: 'ID do professor invalido' }, { status: 400 })
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const professorExistente = await tx.professor.findUnique({
            where: { id: professorIdNum },
            include: {
              user: true,
              materias: { select: { id: true } },
              turmas: { select: { id: true } },
            },
          })

          if (!professorExistente) throw new Error('Professor nao encontrado')

          const nomeFinal = name !== undefined ? String(name).trim() : professorExistente.name
          const emailFinal = email !== undefined
            ? String(email).trim().toLowerCase()
            : professorExistente.email
          const matriculaFinal = matricula !== undefined
            ? normalizeMatricula(String(matricula)) || String(matricula).trim()
            : professorExistente.matricula

          if (!nomeFinal || !emailFinal || !matriculaFinal) {
            throw new Error('Nome, email e matricula sao obrigatorios')
          }

          const materiaIds = Array.isArray(body.materiaIds)
            ? normalizeIdList(body.materiaIds)
            : professorExistente.materias.map((m) => m.id)
          const turmaIds = Array.isArray(body.turmaIds)
            ? normalizeIdList(body.turmaIds)
            : professorExistente.turmas.map((t) => t.id)

          const loginPreferido = login !== undefined
            ? String(login)
            : professorExistente.user?.login || professorExistente.login
          const loginFinal = await generateUniqueLogin(tx, nomeFinal, loginPreferido, {
            excludeUserId: professorExistente.user?.id,
            excludeProfessorId: professorExistente.id,
          })

          const user = professorExistente.user
            ? await tx.user.update({
                where: { id: professorExistente.user.id },
                data: {
                  nome: nomeFinal,
                  email: emailFinal,
                  matricula: matriculaFinal,
                  login: loginFinal,
                  role: 'PROFESSOR',
                  idTbProfessor: professorExistente.id,
                },
              })
            : await tx.user.create({
                data: {
                  nome: nomeFinal,
                  email: emailFinal,
                  matricula: matriculaFinal,
                  login: loginFinal,
                  password: await bcrypt.hash(DEFAULT_INITIAL_PASSWORD, 10),
                  role: 'PROFESSOR',
                  active: true,
                  mustChangePassword: false,
                },
              })

          const professor = await updateProfessorForUser(
            tx,
            professorExistente.id,
            user,
            materiaIds,
            turmaIds,
          )

          return tx.professor.findUnique({
            where: { id: professor.id },
            include: { turmas: true, materias: true },
          })
        },
        { timeout: 60000 },
      )

      return NextResponse.json(result)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      if (msg.includes('Professor nao encontrado')) {
        return NextResponse.json({ error: 'Professor nao encontrado' }, { status: 404 })
      }
      if (msg.includes('Nome, email e matricula')) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matricula ou login ja cadastrados' },
          { status: 409 },
        )
      }
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
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const { professorId } = await params
      const professorIdNum = parseProfessorId(professorId)

      if (!professorIdNum) {
        return NextResponse.json({ error: 'ID do professor invalido' }, { status: 400 })
      }

      await prisma.$transaction(
        async (tx) => {
          const professor = await tx.professor.findUnique({
            where: { id: professorIdNum },
            include: { user: true },
          })
          if (!professor) throw new Error('Professor nao encontrado')

          const user = professor.user
          await deleteProfessorIfUnused(tx, professorIdNum)

          if (user) {
            if (user.role === 'PROFESSOR') {
              await tx.user.delete({ where: { id: user.id } })
            } else {
              await tx.user.update({
                where: { id: user.id },
                data: { idTbProfessor: null },
              })
            }
          }
        },
        { timeout: 60000 },
      )

      return NextResponse.json({ message: 'Professor excluido com sucesso' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      if (msg.includes('Professor nao encontrado')) {
        return NextResponse.json({ error: 'Professor nao encontrado' }, { status: 404 })
      }
      if (msg.includes('Nao e possivel remover')) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      console.error('Erro ao excluir professor:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir professor' },
        { status: 500 },
      )
    }
  })
}
