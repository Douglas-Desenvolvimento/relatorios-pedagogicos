// PUT/DELETE /api/admin/usuarios/[id] - editar/apagar usuario (somente ADMIN)
// Regra: somente usuarios com role PROFESSOR possuem registro em professores.
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin, normalizeMatricula } from '@/lib/auth-guard'
import { runWithAuditContext } from '@/lib/audit-context'
import {
  createProfessorForUser,
  deleteProfessorIfUnused,
  generateUniqueLogin,
  normalizeIdList,
  updateProfessorForUser,
} from '@/lib/user-professor-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['ADMIN', 'COORDENADOR', 'PROFESSOR'] as const
type UserRole = (typeof ROLES)[number]

function parseRole(value: unknown): UserRole | null {
  const role = String(value || '').toUpperCase()
  return ROLES.includes(role as UserRole) ? (role as UserRole) : null
}

function parseId(value: string): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  return runWithAuditContext(request, guard.token, async () => {
    const { id } = await params
    const userId = parseId(id)
    if (!userId) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    try {
      const body = await request.json()
      const result = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.user.findUnique({
            where: { id: userId },
            include: {
              professor: {
                include: {
                  materias: { select: { id: true } },
                  turmas: { select: { id: true } },
                },
              },
            },
          })

          if (!existing) throw new Error('Usuario nao encontrado')

          const targetRole = body.role !== undefined ? parseRole(body.role) : existing.role
          if (!targetRole) throw new Error('Role invalida')

          const nome = body.nome !== undefined ? String(body.nome).trim() : existing.nome
          const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : existing.email
          const matricula = body.matricula !== undefined
            ? normalizeMatricula(String(body.matricula)) || String(body.matricula).trim()
            : existing.matricula
          const login = body.login !== undefined || !existing.login
            ? await generateUniqueLogin(tx, nome, body.login ?? existing.login, {
                excludeUserId: existing.id,
                excludeProfessorId: existing.professor?.id,
              })
            : existing.login

          const data: Record<string, unknown> = {
            nome,
            email,
            matricula,
            login,
            role: targetRole,
          }
          if (body.active !== undefined) data.active = Boolean(body.active)
          if (body.password) {
            data.password = await bcrypt.hash(String(body.password), 10)
            data.mustChangePassword = false
          }

          const user = await tx.user.update({
            where: { id: existing.id },
            data,
          })

          if (targetRole === 'PROFESSOR') {
            const materiaIds = Array.isArray(body.materiaIds)
              ? normalizeIdList(body.materiaIds)
              : existing.professor?.materias.map((m) => m.id) ?? []
            const turmaIds = Array.isArray(body.turmaIds)
              ? normalizeIdList(body.turmaIds)
              : existing.professor?.turmas.map((t) => t.id) ?? []

            if (existing.professor) {
              await updateProfessorForUser(tx, existing.professor.id, user, materiaIds, turmaIds)
            } else {
              await createProfessorForUser(tx, user, materiaIds, turmaIds)
            }
          } else if (existing.professor) {
            await tx.user.update({
              where: { id: existing.id },
              data: { idTbProfessor: null },
            })
            await deleteProfessorIfUnused(tx, existing.professor.id)
          }

          const updated = await tx.user.findUnique({
            where: { id: existing.id },
            select: {
              id: true,
              nome: true,
              email: true,
              matricula: true,
              login: true,
              role: true,
              active: true,
              idTbProfessor: true,
              mustChangePassword: true,
            },
          })

          return updated
        },
        { timeout: 60000 },
      )

      return NextResponse.json(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Usuario nao encontrado')) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
      }
      if (msg.includes('Role invalida')) {
        return NextResponse.json({ error: 'Role invalida' }, { status: 400 })
      }
      if (msg.includes('Nao e possivel remover')) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'Email, matricula ou login ja cadastrados' },
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
    const userId = parseId(id)
    if (!userId) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    if (guard.token.sub === id) {
      return NextResponse.json(
        { error: 'Voce nao pode excluir sua propria conta' },
        { status: 400 },
      )
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { professor: true },
          })
          if (!user) throw new Error('Usuario nao encontrado')

          if (user.professor) {
            await deleteProfessorIfUnused(tx, user.professor.id)
          }
          await tx.user.delete({ where: { id: userId } })
        },
        { timeout: 60000 },
      )

      return NextResponse.json({ ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro'
      if (msg.includes('Usuario nao encontrado') || msg.includes('Record to delete does not exist')) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
      }
      if (msg.includes('Nao e possivel remover')) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
