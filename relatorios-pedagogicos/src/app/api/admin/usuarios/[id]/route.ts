// PUT/DELETE /api/admin/usuarios/[id] - editar/apagar usuário (somente ADMIN)
// PUT: se role=PROFESSOR e ainda não tem registro em professores, cria.
// DELETE: cascade simples — apaga registro de professores vinculado se houver.
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'
import { runWithAuditContext } from '@/lib/audit-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return runWithAuditContext(request, guard.token, async () => {
    const { id } = await params
    const userId = parseInt(id)
    try {
      const body = await request.json()
      const { nome, email, matricula, password, role, active, login } = body
      const data: Record<string, unknown> = {}
      if (nome !== undefined) data.nome = nome
      if (email !== undefined) data.email = email
      if (matricula !== undefined) {
        const norm = normalizeMatricula(matricula)
        data.matricula = norm || matricula.trim()
      }
      if (login !== undefined) {
        data.login = login ? String(login).toLowerCase().trim() : null
      }
      if (role !== undefined) {
        if (!['ADMIN', 'COORDENADOR', 'PROFESSOR'].includes(role)) {
          return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
        }
        data.role = role
      }
      if (active !== undefined) data.active = Boolean(active)
      if (password) {
        data.password = await bcrypt.hash(password, 10)
        data.mustChangePassword = false
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        include: { professor: true },
      })

      // Sincronização com tabela professores
      if (user.role === 'PROFESSOR' && !user.professor) {
        const professor = await prisma.professor.create({
          data: {
            name: user.nome,
            email: user.email,
            login: user.login,
            matricula: user.matricula,
            userId: user.id,
            role: 'PROFESSOR',
          },
        })
        await prisma.user.update({
          where: { id: user.id },
          data: { idTbProfessor: professor.id },
        })
      }
      if (user.role !== 'PROFESSOR' && user.professor) {
        // mudou de PROFESSOR para outro role -> remove vínculo (não apaga
        // automaticamente para não perder relatórios). Apenas desliga.
        await prisma.user.update({
          where: { id: user.id },
          data: { idTbProfessor: null },
        })
      }

      return NextResponse.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        matricula: user.matricula,
        login: user.login,
        role: user.role,
        active: user.active,
        idTbProfessor: user.idTbProfessor,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Record to update not found')) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matrícula ou login já cadastrados' },
          { status: 409 },
        )
      }
      console.error('[PUT /api/admin/usuarios/:id]', err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return runWithAuditContext(request, guard.token, async () => {
    const { id } = await params
    const userId = parseInt(id)

    if (guard.token.sub === id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 },
      )
    }

    try {
      // Se houver Professor vinculado: desvincula (não apaga professor pra
      // preservar histórico de relatórios). Admin pode apagar professor à
      // parte se quiser.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { professor: true },
      })
      if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      await prisma.$transaction(async (tx) => {
        if (user.professor) {
          await tx.professor.update({
            where: { id: user.professor.id },
            data: { userId: null },
          })
        }
        await tx.user.delete({ where: { id: userId } })
      },
  {
    timeout: 60000,
  }
)
      return NextResponse.json({ ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Record to delete does not exist')) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
