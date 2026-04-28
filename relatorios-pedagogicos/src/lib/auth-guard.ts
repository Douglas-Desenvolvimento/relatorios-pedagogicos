/**
 * Helpers para autenticação/autorização em rotas /api/admin/*.
 * Centraliza a lógica de verificar JWT + role e devolver 401/403.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getToken, getTokenFromRequest, TokenPayload } from './auth'

export type AllowedRole = 'ADMIN' | 'COORDENADOR' | 'PROFESSOR'

/**
 * Garante que o request é feito por um usuário autenticado com uma das roles aceitas.
 * Retorna o token ou um NextResponse de erro pronto para retornar.
 */
export async function requireRole(
  request: NextRequest | Request,
  roles: AllowedRole[],
): Promise<{ token: TokenPayload } | { response: NextResponse }> {
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
