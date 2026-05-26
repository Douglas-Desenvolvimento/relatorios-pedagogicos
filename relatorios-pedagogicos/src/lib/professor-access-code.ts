import crypto from 'crypto'
import { prisma } from './db'

const ACCESS_CODE_TTL_MS = 10 * 60 * 1000
const ACCESS_CODE_DIGITS = 8
const MAX_ACCESS_CODE_ATTEMPTS = 5

function getSecret(): string {
  const secret = process.env.ACCESS_CODE_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('ACCESS_CODE_SECRET ou JWT_SECRET deve estar configurado')
  }
  return secret
}

export function normalizeAccessCode(value: string | null | undefined): string {
  return String(value || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
}

function generateAccessCode(): string {
  const max = 10 ** ACCESS_CODE_DIGITS
  return crypto.randomInt(0, max).toString().padStart(ACCESS_CODE_DIGITS, '0')
}

function hashAccessCode(professorId: number, code: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${professorId}:${normalizeAccessCode(code)}`)
    .digest('hex')
}

function safeHashEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export async function issueProfessorAccessCode({
  professorId,
  createdByUserId,
}: {
  professorId: number
  createdByUserId?: number | null
}): Promise<{ code: string; expiresAt: Date }> {
  const code = generateAccessCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ACCESS_CODE_TTL_MS)

  await prisma.professorAccessCode.updateMany({
    where: {
      professorId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  })

  await prisma.professorAccessCode.create({
    data: {
      professorId,
      codeHash: hashAccessCode(professorId, code),
      expiresAt,
      createdByUserId: createdByUserId ?? null,
    },
  })

  return { code, expiresAt }
}

export async function verifyProfessorAccessCode(
  professorId: number,
  code: string,
): Promise<boolean> {
  const normalizedCode = normalizeAccessCode(code)
  if (!normalizedCode) return false

  const now = new Date()
  const current = await prisma.professorAccessCode.findFirst({
    where: {
      professorId,
      usedAt: null,
      expiresAt: { gt: now },
      attemptCount: { lt: MAX_ACCESS_CODE_ATTEMPTS },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!current) return false

  const candidateHash = hashAccessCode(professorId, normalizedCode)
  const isValid = safeHashEqual(candidateHash, current.codeHash)

  if (!isValid) {
    await prisma.professorAccessCode.update({
      where: { id: current.id },
      data: {
        attemptCount: { increment: 1 },
        ...(current.attemptCount + 1 >= MAX_ACCESS_CODE_ATTEMPTS ? { usedAt: now } : {}),
      },
    })
    return false
  }

  await prisma.professorAccessCode.update({
    where: { id: current.id },
    data: { usedAt: now },
  })

  return true
}
