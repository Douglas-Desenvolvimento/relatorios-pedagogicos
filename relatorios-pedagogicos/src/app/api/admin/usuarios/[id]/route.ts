// PUT/DELETE /api/admin/usuarios/[id] - editar/apagar usuário (somente ADMIN)
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const { id } = await params
  const userId = parseInt(id)
  try {
    const body = await request.json()
    const { nome, email, matricula, password, role, active } = body
    const data: Record<string, unknown> = {}
    if (nome !== undefined) data.nome = nome
    if (email !== undefined) data.email = email
    if (matricula !== undefined) {
      const norm = normalizeMatricula(matricula)
      data.matricula = norm || matricula.trim()
    }
    if (role !== undefined) {
      if (!['ADMIN', 'COORDENADOR', 'PROFESSOR'].includes(role)) {
        return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
      }
      data.role = role
    }
    if (active !== undefined) data.active = Boolean(active)
    if (password) data.password = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        active: true,
      },
    })
    return NextResponse.json(user)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    if (msg.includes('Unique')) {
      return NextResponse.json(
        { error: 'Email ou matrícula já cadastrados' },
        { status: 409 },
      )
    }
    console.error('[PUT /api/admin/usuarios/:id]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const { id } = await params
  const userId = parseInt(id)

  // Não deixar o admin se auto-deletar
  if (guard.token.sub === id) {
    return NextResponse.json(
      { error: 'Você não pode excluir sua própria conta' },
      { status: 400 },
    )
  }

  try {
    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    if (msg.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
