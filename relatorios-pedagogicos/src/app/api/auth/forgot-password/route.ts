import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findUserByIdentifier, issueAuthTokenForUser } from '@/lib/auth-user-flow'
import { normalizeMatricula } from '@/lib/auth-guard'
import { recordLoginAttempt, extractClientIp, extractUserAgent } from '@/lib/login-audit'
import { noStore, rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RESET_WINDOW_MS = 15 * 60 * 1000
const RESET_LIMIT_PER_IP = 30
const RESET_LIMIT_PER_ACCOUNT = 5

export async function POST(request: Request) {
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  const ipLimited = rateLimit({
    key: `forgot-password:ip:${ip || 'unknown'}`,
    limit: RESET_LIMIT_PER_IP,
    windowMs: RESET_WINDOW_MS,
  })
  if (ipLimited) return ipLimited

  try {
    const { login, email, matricula } = await request.json()
    const identifier = String(login || '').trim()
    const emailInput = String(email || '').trim().toLowerCase()
    const matriculaInput = normalizeMatricula(String(matricula || ''))

    if (!identifier || !emailInput || !matriculaInput) {
      return NextResponse.json(
        { error: 'Informe usuario, email e matricula' },
        { status: 400 },
      )
    }

    const accountLimited = rateLimit({
      key: `forgot-password:account:${identifier.toLowerCase()}:${ip || 'unknown'}`,
      limit: RESET_LIMIT_PER_ACCOUNT,
      windowMs: RESET_WINDOW_MS,
    })
    if (accountLimited) return accountLimited

    const user = await findUserByIdentifier(identifier)
    const matches = Boolean(
      user &&
      user.active &&
      user.email.toLowerCase() === emailInput &&
      normalizeMatricula(user.matricula) === matriculaInput,
    )

    if (!matches || !user) {
      await recordLoginAttempt({
        role: user?.role || 'UNKNOWN',
        userId: user?.id,
        identifier,
        ip,
        userAgent,
        success: false,
        message: 'Esqueci senha: dados nao conferem',
      })
      return NextResponse.json({ error: 'Dados nao conferem' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    })
    await issueAuthTokenForUser({ ...user, mustChangePassword: false }, true)

    await recordLoginAttempt({
      userId: user.id,
      professorId: user.professor?.id,
      role: user.role,
      nome: user.nome,
      identifier,
      ip,
      userAgent,
      success: true,
      message: 'Esqueci senha: redefinicao autorizada',
    })

    return noStore(NextResponse.json({
      ok: true,
      firstAccess: true,
      role: user.role,
      nome: user.nome,
    }))
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
