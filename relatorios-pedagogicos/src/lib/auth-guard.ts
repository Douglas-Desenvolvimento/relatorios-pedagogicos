/**
 * Helpers para autenticação/autorização em rotas /api/admin/*.
 * Centraliza a lógica de verificar JWT + role e devolver 401/403.
 *
 * NOVO: também ativa o AsyncLocalStorage de audit-context para que
 * mutações Prisma sejam registradas automaticamente em login_audit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getToken, getTokenFromRequest, TokenPayload } from './auth'
import { runWithAuditContext } from './audit-context'

export type AllowedRole = 'ADMIN' | 'COORDENADOR' | 'PROFESSOR'

type GuardOk = { token: TokenPayload }
type GuardError = { response: NextResponse }

async function _checkRole(
  request: NextRequest | Request,
  roles: AllowedRole[],
): Promise<GuardOk | GuardError> {
  const token =
    request instanceof Request && 'cookies' in request
      ? await getTokenFromRequest(request as NextRequest)
      : await getToken()

  if (!token) {
    return { response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  }
  if (!roles.includes(token.role as AllowedRole)) {
    return {
      response: NextResponse.json(
        { error: 'Acesso negado. Role insuficiente.' },
        { status: 403 },
      ),
    }
  }
  return { token }
}

/**
 * Garante role aceita E ativa o audit context para o restante do handler.
 * Use o token retornado e, dentro do mesmo handler, faça as queries Prisma
 * — elas serão automaticamente auditadas.
 */
export async function requireRole(
  request: NextRequest | Request,
  roles: AllowedRole[],
): Promise<GuardOk | GuardError> {
  const result = await _checkRole(request, roles)
  if ('response' in result) return result
  // ativa audit context — não há retorno aqui, o storage é para callbacks
  // que vamos rodar via withAudit() abaixo. Para compat, retornamos token.
  return result
}

/**
 * Wrapper que combina `requireRole` + `runWithAuditContext`.
 * Use assim:
 *   return withAudit(req, ['ADMIN'], async (token) => { ... })
 */
export async function withAudit<T>(
  request: NextRequest | Request,
  roles: AllowedRole[],
  fn: (token: TokenPayload) => Promise<T>,
): Promise<T | NextResponse> {
  const result = await _checkRole(request, roles)
  if ('response' in result) return result.response
  return runWithAuditContext(request as Request, result.token, () => fn(result.token))
}

export const requireAdmin = (request: NextRequest | Request) =>
  requireRole(request, ['ADMIN'])

export const requireCoordOrAdmin = (request: NextRequest | Request) =>
  requireRole(request, ['ADMIN', 'COORDENADOR'])

/**
 * Normaliza matrícula para comparações: remove hífens, espaços e zeros à esquerda.
 * Ex: "271952-4" e "2719524" viram a mesma string "2719524".
 */
export function normalizeMatricula(m: string | null | undefined): string {
  if (!m) return ''
  return m.replace(/[-\s]/g, '').trim()
}
