// GET /api/admin/login-audit - lista tentativas de login (somente ADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)
  const onlyFailures = url.searchParams.get('failures') === '1'
  const role = url.searchParams.get('role')

  const where: Record<string, unknown> = {}
  if (onlyFailures) where.success = false
  if (role) where.role = role

  const audits = await prisma.loginAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ total: audits.length, items: audits })
}
