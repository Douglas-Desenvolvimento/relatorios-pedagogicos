/**
 * Helper para registrar tentativas de login na tabela login_audit.
 */
import { prisma } from './db'

export type AuditEntry = {
  userId?: number | null
  professorId?: number | null
  nome?: string | null
  role: string
  identifier: string // matricula, login ou email tentado
  ip?: string | null
  userAgent?: string | null
  success: boolean
  message?: string | null
}

export async function recordLoginAttempt(entry: AuditEntry): Promise<void> {
  try {
    await prisma.loginAudit.create({
      data: {
        userId: entry.userId ?? null,
        professorId: entry.professorId ?? null,
        nome: entry.nome ?? null,
        role: entry.role,
        identifier: entry.identifier.slice(0, 150),
        ip: entry.ip?.slice(0, 64) ?? null,
        userAgent: entry.userAgent?.slice(0, 500) ?? null,
        success: entry.success,
        message: entry.message?.slice(0, 255) ?? null,
      },
    })
  } catch (err) {
    // Auditoria nunca deve quebrar o login.
    console.error('[LOGIN AUDIT] Falha ao registrar tentativa:', err)
  }
}

export function extractClientIp(request: Request): string | null {
  const headers = request.headers
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    null
  )
}

export function extractUserAgent(request: Request): string | null {
  return request.headers.get('user-agent')
}
