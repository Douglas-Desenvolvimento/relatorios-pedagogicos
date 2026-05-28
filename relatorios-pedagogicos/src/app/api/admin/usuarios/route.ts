// CRUD de usuarios (somente ADMIN)
// - Senha padrao "123@ppi" se nao fornecida.
// - must_change_password=false indica primeiro acesso pendente.
// - Quando role=PROFESSOR: cria registro em "professores" e vinculos pedagogicos.
// - Quando role=COORDENADOR ou ADMIN: nao cria registro em "professores".
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'
import { runWithAuditContext } from '@/lib/audit-context'
import {
  DEFAULT_INITIAL_PASSWORD,
  createProfessorForUser,
  generateUniqueLogin,
  normalizeIdList,
  repairProfessorUserSync,
} from '@/lib/user-professor-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['ADMIN', 'COORDENADOR', 'PROFESSOR'] as const
type UserRole = (typeof ROLES)[number]

function parseRole(value: unknown): UserRole | null {
  const role = String(value || '').toUpperCase()
  return ROLES.includes(role as UserRole) ? (role as UserRole) : null
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  await prisma.$transaction(
    async (tx) => repairProfessorUserSync(tx),
    { timeout: 60000 },
  )

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      matricula: true,
      login: true,
      role: true,
      active: true,
      idTbProfessor: true,
      mustChangePassword: true,
      createdAt: true,
      lastLoginAt: true,
      professor: {
        select: {
          id: true,
          materias: { select: { id: true } },
          turmas: { select: { id: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  return NextResponse.json(
    users.map((user) => ({
      ...user,
      professor: user.professor
        ? {
            id: user.professor.id,
            materiaIds: user.professor.materias.map((m) => m.id),
            turmaIds: user.professor.turmas.map((t) => t.id),
          }
        : null,
    })),
  )
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return runWithAuditContext(request, guard.token, async () => {
    try {
      const body = await request.json()
      const { nome, email, matricula, password, active, login } = body
      const role = parseRole(body.role)

      if (!nome || !email || !matricula || !role) {
        return NextResponse.json(
          { error: 'Campos obrigatorios: nome, email, matricula, role' },
          { status: 400 },
        )
      }

      const materiaIds = normalizeIdList(body.materiaIds)
      const turmaIds = normalizeIdList(body.turmaIds)
      const finalPassword = password ? String(password) : DEFAULT_INITIAL_PASSWORD
      const hash = await bcrypt.hash(finalPassword, 10)
      const matNorm = normalizeMatricula(String(matricula)) || String(matricula).trim()
      const nomeFinal = String(nome).trim()
      const emailFinal = String(email).trim().toLowerCase()

      const result = await prisma.$transaction(
        async (tx) => {
          const finalLogin = await generateUniqueLogin(tx, nomeFinal, login)
          const user = await tx.user.create({
            data: {
              nome: nomeFinal,
              email: emailFinal,
              matricula: matNorm,
              login: finalLogin,
              password: hash,
              role,
              active: active !== false,
              mustChangePassword: false,
            },
          })

          const professor = role === 'PROFESSOR'
            ? await createProfessorForUser(tx, user, materiaIds, turmaIds)
            : null

          return { user, professor }
        },
        { timeout: 60000 },
      )

      return NextResponse.json(
        {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          matricula: result.user.matricula,
          login: result.user.login,
          role: result.user.role,
          active: result.user.active,
          idTbProfessor: result.professor?.id ?? null,
          mustChangePassword: result.user.mustChangePassword,
          defaultPasswordUsed: !password,
        },
        { status: 201 },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matricula ou login ja cadastrados' },
          { status: 409 },
        )
      }
      console.error('[POST /api/admin/usuarios]', err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
