// src/app/api/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { findUserByIdentifier, issueAuthTokenForUser } from '@/lib/auth-user-flow'
import {
  recordLoginAttempt,
  extractClientIp,
  extractUserAgent,
} from '@/lib/login-audit'
import { rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_LIMIT_PER_IP = 50
const LOGIN_LIMIT_PER_ACCOUNT = 10

type LoginUser = Awaited<ReturnType<typeof findUserByIdentifier>>

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

    const mustChangePassword = firstAccessPending(user)
    let professor = null

    try {
      const issued = await issueAuthTokenForUser(user, mustChangePassword)
      professor = issued.professor
    } catch (error) {
      if (user.role === 'PROFESSOR') {
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
      throw error
    }

    const professorId = professor?.id

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
