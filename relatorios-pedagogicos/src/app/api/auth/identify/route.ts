import { NextResponse } from 'next/server'
import { findUserByIdentifier, issueAuthTokenForUser } from '@/lib/auth-user-flow'
import { recordLoginAttempt, extractClientIp, extractUserAgent } from '@/lib/login-audit'
import { noStore, rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IDENTIFY_WINDOW_MS = 15 * 60 * 1000
const IDENTIFY_LIMIT_PER_IP = 60
const IDENTIFY_LIMIT_PER_ACCOUNT = 10

export async function POST(request: Request) {
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  const ipLimited = rateLimit({
    key: `identify:ip:${ip || 'unknown'}`,
    limit: IDENTIFY_LIMIT_PER_IP,
    windowMs: IDENTIFY_WINDOW_MS,
  })
  if (ipLimited) return ipLimited

  try {
    const { login, matricula } = await request.json()
    const identifier = String(login || matricula || '').trim()

    if (!identifier) {
      return NextResponse.json({ error: 'Informe seu usuario' }, { status: 400 })
    }

    const accountLimited = rateLimit({
      key: `identify:account:${identifier.toLowerCase()}:${ip || 'unknown'}`,
      limit: IDENTIFY_LIMIT_PER_ACCOUNT,
      windowMs: IDENTIFY_WINDOW_MS,
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
        message: 'Identificacao de login: usuario nao encontrado',
      })
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
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
        message: 'Identificacao de login: conta desativada',
      })
      return NextResponse.json(
        { error: 'Conta desativada. Procure a administracao.' },
        { status: 403 },
      )
    }

    const firstAccess = user.mustChangePassword === false
    if (firstAccess) {
      await issueAuthTokenForUser(user, true)
    }

    await recordLoginAttempt({
      userId: user.id,
      professorId: user.professor?.id,
      role: user.role,
      nome: user.nome,
      identifier,
      ip,
      userAgent,
      success: true,
      message: firstAccess
        ? 'Identificacao de primeiro acesso OK'
        : 'Identificacao de login OK',
    })

    return noStore(NextResponse.json({
      ok: true,
      firstAccess,
      role: user.role,
      nome: user.nome,
      login: user.login,
    }))
  } catch (error) {
    console.error('[POST /api/auth/identify]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
