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
import { verifyProfessorAccessCode } from '@/lib/professor-access-code'
import { rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_LIMIT_PER_IP = 50
const LOGIN_LIMIT_PER_ACCOUNT = 10

type ResolvedProfessor = {
  id: number
  name: string
  matricula: string | null
  userId: number | null
  userActive: boolean
}

async function findProfessorByIdentifier(
  idRaw: string,
  idNorm: string,
  idLower: string,
): Promise<ResolvedProfessor | null> {
  const professor = await prisma.professor.findFirst({
    where: {
      role: 'PROFESSOR',
      OR: [
        { login: idLower },
        { email: idLower },
        { matricula: idRaw },
        { matricula: idNorm },
      ],
    },
    include: { user: true },
  })

  if (!professor) return null
  return {
    id: professor.id,
    name: professor.name,
    matricula: professor.matricula,
    userId: professor.user?.id ?? null,
    userActive: professor.user?.active !== false,
  }
}

async function resolveProfessorFromUser(user: {
  id: number
  active: boolean
  idTbProfessor: number | null
  professor: { id: number; name: string; matricula: string | null } | null
}): Promise<ResolvedProfessor | null> {
  const professor =
    user.professor ||
    (user.idTbProfessor
      ? await prisma.professor.findUnique({
          where: { id: user.idTbProfessor },
          select: { id: true, name: true, matricula: true },
        })
      : null)

  if (!professor) return null
  return {
    id: professor.id,
    name: professor.name,
    matricula: professor.matricula,
    userId: user.id,
    userActive: user.active,
  }
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
    const { matricula, login, password, accessCode } = await request.json()
    const identifier = String(login || matricula || '').trim()

    if (!identifier) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: '(vazio)',
        ip,
        userAgent,
        success: false,
        message: 'Login e obrigatorio',
      })
      return NextResponse.json(
        { error: 'Login e obrigatorio' },
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

    let professor = user?.role === 'PROFESSOR'
      ? await resolveProfessorFromUser(user)
      : null

    if (!user) {
      professor = await findProfessorByIdentifier(idRaw, idNorm, idLower)
    }

    if (!user && !professor) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: idRaw,
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

    if (user && user.role !== 'PROFESSOR') {
      if (!password) {
        await recordLoginAttempt({
          userId: user.id,
          role: user.role,
          nome: user.nome,
          identifier: idRaw,
          ip,
          userAgent,
          success: false,
          message: 'Senha obrigatoria para usuario administrativo',
        })
        return NextResponse.json(
          { error: 'Login e senha sao obrigatorios' },
          { status: 400 },
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
          { error: 'Conta desativada. Procure a administracao.' },
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
          { error: 'Credenciais invalidas' },
          { status: 401 },
        )
      }

      const token = gerarToken({
        sub: user.id.toString(),
        role: user.role,
        matricula: user.matricula,
        nome: user.nome,
      })
      await salvarTokenNosCookies(token)

      await recordLoginAttempt({
        userId: user.id,
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
        // nao-critico
      }

      return NextResponse.json({
        success: true,
        role: user.role,
        nome: user.nome,
        isProfessor: false,
        mustChangePassword: user.mustChangePassword === true,
      })
    }

    if (!professor) {
      await recordLoginAttempt({
        userId: user?.id,
        role: 'PROFESSOR',
        nome: user?.nome,
        identifier: idRaw,
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

    if (!professor.userActive) {
      await recordLoginAttempt({
        userId: professor.userId,
        professorId: professor.id,
        role: 'PROFESSOR',
        nome: professor.name,
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Conta de professor desativada',
      })
      return NextResponse.json(
        { error: 'Conta desativada. Procure a administracao.' },
        { status: 403 },
      )
    }

    if (!accessCode) {
      await recordLoginAttempt({
        userId: professor.userId,
        professorId: professor.id,
        role: 'PROFESSOR',
        nome: professor.name,
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Codigo de acesso obrigatorio',
      })
      return NextResponse.json(
        { error: 'Codigo de acesso obrigatorio' },
        { status: 400 },
      )
    }

    const validAccessCode = await verifyProfessorAccessCode(
      professor.id,
      String(accessCode),
    )

    if (!validAccessCode) {
      await recordLoginAttempt({
        userId: professor.userId,
        professorId: professor.id,
        role: 'PROFESSOR',
        nome: professor.name,
        identifier: idRaw,
        ip,
        userAgent,
        success: false,
        message: 'Codigo de acesso invalido ou expirado',
      })
      return NextResponse.json(
        { error: 'Codigo de acesso invalido ou expirado' },
        { status: 401 },
      )
    }

    const token = gerarToken({
      sub: professor.id.toString(),
      role: 'PROFESSOR',
      matricula: professor.matricula || idRaw,
      nome: professor.name,
    })
    await salvarTokenNosCookies(token)

    await recordLoginAttempt({
      userId: professor.userId,
      professorId: professor.id,
      role: 'PROFESSOR',
      nome: professor.name,
      identifier: idRaw,
      ip,
      userAgent,
      success: true,
      message: 'Login professor por codigo temporario OK',
    })

    if (professor.userId) {
      try {
        await prisma.user.update({
          where: { id: professor.userId },
          data: { lastLoginAt: new Date() },
        })
      } catch {
        // nao-critico
      }
    }

    return NextResponse.json({
      success: true,
      role: 'PROFESSOR',
      nome: professor.name,
      isProfessor: true,
      mustChangePassword: false,
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
