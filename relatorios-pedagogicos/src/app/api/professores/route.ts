// app/api/professores/route.ts
import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { normalizeMatricula, requireRole, withAudit } from '@/lib/auth-guard'
import {
  DEFAULT_INITIAL_PASSWORD,
  createProfessorForUser,
  generateUniqueLogin,
  normalizeIdList,
  repairProfessorUserSync,
} from '@/lib/user-professor-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireRole(request, ['ADMIN', 'COORDENADOR'])
  if ('response' in guard) return guard.response

  try {
    await prisma.$transaction(
      async (tx) => repairProfessorUserSync(tx),
      { timeout: 60000 },
    )

    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include') || ''
    const includeRelatorios = include.split(',').includes('relatorios')

    const professores = await prisma.professor.findMany({
      where: { role: 'PROFESSOR' },
      include: {
        materias: true,
        turmas: true,
        ...(includeRelatorios && {
          relatorios: {
            include: {
              aluno: { include: { turma: true } },
              materia: true,
              turma: true,
            },
          },
          _count: { select: { relatorios: true } },
        }),
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(professores)
  } catch (error) {
    console.error('Erro ao buscar professores:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar professores' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async () => {
    try {
      const body = await request.json()
      const { name, email, matricula, login, password } = body

      if (!name || !email || !matricula) {
        return NextResponse.json(
          { error: 'Nome, email e matricula sao obrigatorios' },
          { status: 400 },
        )
      }

      const materiaIds = normalizeIdList(body.materiaIds)
      const turmaIds = normalizeIdList(body.turmaIds)
      const nomeFinal = String(name).trim()
      const emailFinal = String(email).trim().toLowerCase()
      const matriculaFinal = normalizeMatricula(String(matricula)) || String(matricula).trim()
      const finalPassword = password ? String(password) : DEFAULT_INITIAL_PASSWORD
      const hash = await bcrypt.hash(finalPassword, 10)

      const result = await prisma.$transaction(
        async (tx) => {
          const finalLogin = await generateUniqueLogin(tx, nomeFinal, login)
          const user = await tx.user.create({
            data: {
              nome: nomeFinal,
              email: emailFinal,
              matricula: matriculaFinal,
              login: finalLogin,
              password: hash,
              role: 'PROFESSOR',
              active: true,
              mustChangePassword: false,
            },
          })

          const professor = await createProfessorForUser(tx, user, materiaIds, turmaIds)
          return { user, professor }
        },
        { timeout: 60000 },
      )

      return NextResponse.json(
        {
          id: result.professor?.id,
          name: result.professor?.name,
          email: result.professor?.email,
          matricula: result.professor?.matricula,
          login: result.user.login,
          defaultPasswordUsed: !password,
        },
        { status: 201 },
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matricula ou login ja cadastrados' },
          { status: 409 },
        )
      }
      console.error('Erro ao criar professor:', error)
      return NextResponse.json(
        { error: 'Falha ao criar professor' },
        { status: 500 },
      )
    }
  })
}
