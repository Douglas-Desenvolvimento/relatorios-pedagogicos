/**
 * Audit context (AsyncLocalStorage) — guarda quem está executando a request
 * para que o Prisma extension possa registrar create/update/delete em
 * login_audit automaticamente, sem que cada rota precise fazer isso à mão.
 *
 * Uso típico:
 *   import { runWithAuditContext } from '@/lib/audit-context'
 *
 *   export async function POST(req) {
 *     const guard = await requireAdmin(req)
 *     if ('response' in guard) return guard.response
 *     return runWithAuditContext(req, guard.token, async () => {
 *       // todo o código aqui dentro tem o audit context disponível
 *       const user = await prisma.user.create({ data })
 *       return NextResponse.json(user)
 *     })
 *   }
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { TokenPayload } from './auth'
import { extractClientIp, extractUserAgent } from './login-audit'

export type AuditContext = {
  userId: number | null
  role: string
  nome: string
  ip: string | null
  userAgent: string | null
}

const storage = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext | undefined {
  return storage.getStore()
}

export function runWithAuditContext<T>(
  request: Request,
  token: TokenPayload,
  fn: () => Promise<T>,
): Promise<T> {
  const ctx: AuditContext = {
    userId: parseInt(token.sub) || null,
    role: token.role || 'UNKNOWN',
    nome: token.nome || '',
    ip: extractClientIp(request),
    userAgent: extractUserAgent(request),
  }
  return storage.run(ctx, fn)
}
