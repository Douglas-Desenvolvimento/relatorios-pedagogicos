// CRUD de usuários (somente ADMIN)
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      matricula: true,
      role: true,
      active: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { id: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const body = await request.json()
    const { nome, email, matricula, password, role, active } = body
    if (!nome || !email || !matricula || !password || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, email, matricula, password, role' },
        { status: 400 },
      )
    }
    if (!['ADMIN', 'COORDENADOR', 'PROFESSOR'].includes(role)) {
      return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
    }
    const hash = await bcrypt.hash(password, 10)
    const matNorm = normalizeMatricula(matricula)
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        matricula: matNorm || matricula.trim(),
        password: hash,
        role,
        active: active !== false,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        active: true,
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    if (msg.includes('Unique')) {
      return NextResponse.json(
        { error: 'Email ou matrícula já cadastrados' },
        { status: 409 },
      )
    }
    console.error('[POST /api/admin/usuarios]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
