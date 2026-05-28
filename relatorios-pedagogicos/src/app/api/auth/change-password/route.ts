// POST /api/auth/change-password - troca a senha do usuario logado
// Regra do projeto: must_change_password=false indica primeiro acesso pendente.
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getToken } from '@/lib/auth'
import { isPasswordCompliant, passwordPolicyMessage } from '@/lib/user-professor-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()
    const normalizedNewPassword = String(newPassword || '')

    if (!isPasswordCompliant(normalizedNewPassword)) {
      return NextResponse.json({ error: passwordPolicyMessage() }, { status: 400 })
    }

    let user = null
    if (token.role === 'PROFESSOR') {
      const professor = await prisma.professor.findUnique({
        where: { id: parseInt(token.sub) },
        include: { user: true },
      })
      user = professor?.user ?? null
    } else {
      user = await prisma.user.findUnique({ where: { id: parseInt(token.sub) } })
    }

    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    const isFirstAccess = user.mustChangePassword === false
    if (currentPassword) {
      const ok = await bcrypt.compare(String(currentPassword), user.password)
      if (!ok) {
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 401 },
        )
      }
    } else if (!isFirstAccess) {
      return NextResponse.json(
        { error: 'Senha atual obrigatoria' },
        { status: 400 },
      )
    }

    const hash = await bcrypt.hash(normalizedNewPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: true },
    })

    return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error('[change-password] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
