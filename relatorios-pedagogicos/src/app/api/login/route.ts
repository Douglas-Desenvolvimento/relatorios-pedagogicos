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
        message: 'Login e senha são obrigatórios',
      })
      return NextResponse.json(
        { error: 'Login e senha são obrigatórios' },
        { status: 400 },
      )
    }

    const accountLimited = rateLimit({
      key: `login:account:${identifier.toLowerCase()}:${ip || 'unknown'}`,
      limit: LOGIN_LIMIT_PER_ACCOUNT,
      windowMs: LOGIN_WINDOW_MS,
    })
    if (accountLimited) return accountLimited

    const idRaw = identifier
    const idNorm = normalizeMatricula(idRaw)
    const idLower = idRaw.toLowerCase()

    const user = await prisma.user.findFirst({
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

    if (!user) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Usuário não encontrado',
      })
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 },
      )
    }

    if (!user.active) {
      await recordLoginAttempt({
        userId: user.id,
        role: user.role,
        nome: user.nome,
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Conta desativada',
      })
      return NextResponse.json(
        { error: 'Conta desativada. Procure a administração.' },
        { status: 403 },
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      await recordLoginAttempt({
        userId: user.id,
        role: user.role,
        nome: user.nome,
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Senha incorreta',
      })
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 },
      )
    }

    let tokenSubject = user.id.toString()
    let professorId: number | null = null

    if (user.role === 'PROFESSOR') {
      const professor =
        user.professor ||
        (user.idTbProfessor
          ? await prisma.professor.findUnique({ where: { id: user.idTbProfessor } })
          : null)

      if (!professor) {
        await recordLoginAttempt({
          userId: user.id,
          role: user.role,
          nome: user.nome,
          identifier: idRaw,
          ip,
          userAgent,
          success: false,
          message: 'Professor não vinculado ao usuário',
        })
        return NextResponse.json(
          { error: 'Professor não vinculado ao usuário' },
          { status: 403 },
        )
      }

      professorId = professor.id
      tokenSubject = professor.id.toString()
    }

    const token = gerarToken({
      sub: tokenSubject,
      role: user.role,
      matricula: user.matricula,
      nome: user.nome,
    })
    await salvarTokenNosCookies(token)

    await recordLoginAttempt({
      userId: user.id,
      professorId,
      role: user.role,
      nome: user.nome,
      identifier: idRaw,
      ip,
      userAgent,
      success: true,
      message: 'Login OK',
    })

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    } catch {
      // não-crítico
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      nome: user.nome,
      isProfessor: user.role === 'PROFESSOR',
      mustChangePassword: user.mustChangePassword === true,
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
