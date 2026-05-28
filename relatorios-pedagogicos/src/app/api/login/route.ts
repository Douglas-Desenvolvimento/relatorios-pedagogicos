// src/app/api/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { gerarToken, salvarTokenNosCookies } from '@/lib/auth'
import {
  recordLoginAttempt,
  extractClientIp,
  extractUserAgent,
} from '@/lib/login-audit'
import { normalizeMatricula } from '@/lib/auth-guard'
import { rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_LIMIT_PER_IP = 50
const LOGIN_LIMIT_PER_ACCOUNT = 10

type LoginUser = Awaited<ReturnType<typeof findUserByIdentifier>>

async function findUserByIdentifier(identifier: string) {
  const idRaw = identifier.trim()
  const idNorm = normalizeMatricula(idRaw)
  const idLower = idRaw.toLowerCase()

  return prisma.user.findFirst({
    where: {
      OR: [
        { login: idLower },
        { email: idLower },
        { matricula: idRaw },
        { matricula: idNorm },
      ],
    },
    include: { professor: true },
  })
}

function firstAccessPending(user: NonNullable<LoginUser>): boolean {
  return user.mustChangePassword === false
}

export async function POST(request: Request) {
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  const ipLimited = rateLimit({
    key: `login:ip:${ip || 'unknown'}`,
    limit: LOGIN_LIMIT_PER_IP,
    windowMs: LOGIN_WINDOW_MS,
  })
  if (ipLimited) return ipLimited

  try {
    const { matricula, login, password } = await request.json()
    const identifier = String(login || matricula || '').trim()

    if (!identifier || !password) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: identifier || '(vazio)',
        ip,
        userAgent,
        success: false,
        message: 'Login e senha sao obrigatorios',
      })
      return NextResponse.json(
        { error: 'Login e senha sao obrigatorios' },
        { status: 400 },
      )
    }

    const accountLimited = rateLimit({
      key: `login:account:${identifier.toLowerCase()}:${ip || 'unknown'}`,
      limit: LOGIN_LIMIT_PER_ACCOUNT,
      windowMs: LOGIN_WINDOW_MS,
    })
    if (accountLimited) return accountLimited

    const user = await findUserByIdentifier(identifier)

    if (!user) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier,
        ip,
        userAgent,
        success: false,
        message: 'Usuario nao encontrado',
      })
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 },
      )
    }

    if (!user.active) {
      await recordLoginAttempt({
        userId: user.id,
        role: user.role,
        nome: user.nome,
        identifier,
        ip,
        userAgent,
        success: false,
        message: 'Conta desativada',
      })
      return NextResponse.json(
        { error: 'Conta desativada. Procure a administracao.' },
        { status: 403 },
      )
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password)
    if (!passwordMatch) {
      await recordLoginAttempt({
        userId: user.id,
        professorId: user.professor?.id,
        role: user.role,
        nome: user.nome,
        identifier,
        ip,
        userAgent,
        success: false,
        message: 'Senha incorreta',
      })
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 },
      )
    }

    let professor = user.professor
    if (user.role === 'PROFESSOR' && !professor && user.idTbProfessor) {
      const fallbackProfessor = await prisma.professor.findUnique({
        where: { id: user.idTbProfessor },
      })

      if (fallbackProfessor && (!fallbackProfessor.userId || fallbackProfessor.userId === user.id)) {
        professor = await prisma.professor.update({
          where: { id: fallbackProfessor.id },
          data: {
            userId: user.id,
            role: 'PROFESSOR',
            name: fallbackProfessor.name || user.nome,
            email: fallbackProfessor.email || user.email,
            login: fallbackProfessor.login || user.login,
            matricula: fallbackProfessor.matricula || user.matricula,
          },
        })
      }
    }

    if (user.role === 'PROFESSOR' && !professor) {
      await recordLoginAttempt({
        userId: user.id,
        role: 'PROFESSOR',
        nome: user.nome,
        identifier,
        ip,
        userAgent,
        success: false,
        message: 'Professor nao vinculado ao usuario',
      })
      return NextResponse.json(
        { error: 'Professor nao vinculado ao usuario' },
        { status: 403 },
      )
    }

    const professorId = professor?.id
    const mustChangePassword = firstAccessPending(user)
    const token = gerarToken({
      sub: user.role === 'PROFESSOR' && professorId ? professorId.toString() : user.id.toString(),
      role: user.role,
      matricula: user.role === 'PROFESSOR'
        ? professor?.matricula || user.matricula
        : user.matricula,
      nome: user.role === 'PROFESSOR'
        ? professor?.name || user.nome
        : user.nome,
      firstAccess: mustChangePassword,
    })
    await salvarTokenNosCookies(token)

    await recordLoginAttempt({
      userId: user.id,
      professorId,
      role: user.role,
      nome: user.nome,
      identifier,
      ip,
      userAgent,
      success: true,
      message: 'Login OK',
    })

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(professorId && user.idTbProfessor !== professorId ? { idTbProfessor: professorId } : {}),
        },
      })
    } catch {
      // nao-critico
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      nome: user.role === 'PROFESSOR' ? professor?.name || user.nome : user.nome,
      isProfessor: user.role === 'PROFESSOR',
      mustChangePassword,
    })
  } catch (error) {
    console.error('Erro no login:', error)
    await recordLoginAttempt({
      role: 'UNKNOWN',
      identifier: '(erro)',
      ip,
      userAgent,
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
