// CRUD de usuários (somente ADMIN)
// - Senha padrão "123@ppi" se não fornecida + mustChangePassword=true
// - Quando role=PROFESSOR: também cria registro em "professores" e
//   sincroniza User.idTbProfessor / Professor.userId.
// - Quando role=COORDENADOR ou ADMIN: NÃO cria em professores (esses
//   roles ficam fora da listagem de professores).
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'
import { runWithAuditContext } from '@/lib/audit-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_PASSWORD = '123@ppi'

function genLogin(nome: string): string {
  const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const partes = semAcento(nome).toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'usuario'
  if (partes.length === 1) return partes[0]
  return `${partes[0]}.${partes[partes.length - 1]}`
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

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
    },
    orderBy: { id: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return runWithAuditContext(request, guard.token, async () => {
    try {
      const body = await request.json()
      const { nome, email, matricula, password, role, active, login } = body
      if (!nome || !email || !matricula || !role) {
        return NextResponse.json(
          { error: 'Campos obrigatórios: nome, email, matricula, role' },
          { status: 400 },
        )
      }
      if (!['ADMIN', 'COORDENADOR', 'PROFESSOR'].includes(role)) {
        return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
      }

      const finalPassword = password || DEFAULT_PASSWORD
      const mustChange = !password
      const hash = await bcrypt.hash(finalPassword, 10)
      const matNorm = normalizeMatricula(matricula) || matricula.trim()

      // Garante login único: se não fornecido, gera; se duplicado, sufixa.
      let finalLogin = (login || genLogin(nome)).toLowerCase().trim()
      let suffix = 1
      while (await prisma.user.findUnique({ where: { login: finalLogin } })) {
        finalLogin = `${genLogin(nome)}${suffix++}`
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            nome,
            email,
            matricula: matNorm,
            login: finalLogin,
            password: hash,
            role,
            active: active !== false,
            mustChangePassword: mustChange,
          },
        })

        let professor = null
        if (role === 'PROFESSOR') {
          // cria registro em "professores" linkado
          professor = await tx.professor.create({
            data: {
              name: nome,
              email,
              login: finalLogin,
              matricula: matNorm,
              userId: user.id,
              role: 'PROFESSOR',
            },
          })
          await tx.user.update({
            where: { id: user.id },
            data: { idTbProfessor: professor.id },
          })
        }

        return { user, professor }
      },
  {
    timeout: 60000, 
  }
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
          mustChangePassword: mustChange,
          defaultPasswordUsed: !password,
        },
        { status: 201 },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matrícula ou login já cadastrados' },
          { status: 409 },
        )
      }
      console.error('[POST /api/admin/usuarios]', err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
