/**
 * Helper para registrar tentativas de login e ações sensíveis.
 *
 * LGPD: este módulo evita persistir identificadores brutos em trilhas de
 * auditoria. IPs são transformados em HMAC e identificadores são mascarados;
 * payloads administrativos são redigidos antes de gravar em login_audit.
 */
import { prisma } from './db'
import { hashForAudit, maskIdentifier, redactForAudit } from './security'

export type AuditEntry = {
  userId?: number | null
  professorId?: number | null
  nome?: string | null
  role: string
  identifier: string
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
        identifier: maskIdentifier(entry.identifier).slice(0, 150),
        ip: hashForAudit(entry.ip)?.slice(0, 64) ?? null,
        userAgent: entry.userAgent?.slice(0, 180) ?? null,
        success: entry.success,
        message: entry.message?.slice(0, 255) ?? null,
      },
    })
  } catch (err) {
    // Auditoria nunca deve quebrar o login.
    console.error('[LOGIN AUDIT] Falha ao registrar tentativa:', err)
  }
}

/**
 * Registra uma ação administrativa na tabela login_audit.
 * Reaproveita a tabela como log unificado (login + ações sensíveis).
 */
export async function recordAdminAction(params: {
  actorUserId?: number | null
  actorRole?: string | null
  actorNome?: string | null
  ip?: string | null
  userAgent?: string | null
  action: string
  success: boolean
  executedData?: unknown
  message?: string | null
}): Promise<void> {
  try {
    await prisma.loginAudit.create({
      data: {
        userId: params.actorUserId ?? null,
        role: params.actorRole || 'UNKNOWN',
        nome: params.actorNome ?? null,
        identifier: params.action.slice(0, 150),
        ip: hashForAudit(params.ip)?.slice(0, 64) ?? null,
        userAgent: params.userAgent?.slice(0, 180) ?? null,
        success: params.success,
        message: params.message?.slice(0, 255) ?? null,
        executedData: params.executedData
          ? JSON.stringify(redactForAudit(params.executedData)).slice(0, 10000)
          : null,
      },
    })
  } catch (err) {
    console.error('[ADMIN AUDIT] falha ao registrar ação:', err)
  }
}

export function extractClientIp(request: Request): string | null {
  const headers = request.headers
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || null
}

export function extractUserAgent(request: Request): string | null {
  return request.headers.get('user-agent')
}
