import crypto from 'crypto'
import { NextResponse } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __ppiRateLimitStore?: Map<string, RateLimitEntry>
}

const rateLimitStore =
  globalForRateLimit.__ppiRateLimitStore ?? new Map<string, RateLimitEntry>()

globalForRateLimit.__ppiRateLimitStore = rateLimitStore

const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'matricula',
  'matricule',
  'matricula_hash',
  'dataNascimento',
  'data_nascimento',
  'conteudo',
  'email',
])

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export function hashForAudit(value: string | null | undefined): string | null {
  if (!value) return null
  const secret = process.env.AUDIT_LOG_SECRET || process.env.JWT_SECRET
  if (!secret) return 'audit-secret-not-configured'
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function maskIdentifier(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = String(value).trim()
  if (normalized.length <= 4) return '*'.repeat(normalized.length)
  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`
}

export function redactForAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForAudit)
  if (!value || typeof value !== 'object') return value

  const output: Record<string, unknown> = {}
  for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]'
    } else {
      output[key] = redactForAudit(innerValue)
    }
  }
  return output
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): NextResponse | null {
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  current.count += 1
  if (current.count <= limit) return null

  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)
  return NextResponse.json(
    { error: 'Muitas tentativas. Tente novamente mais tarde.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'Cache-Control': 'no-store',
      },
    },
  )
}

export function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
