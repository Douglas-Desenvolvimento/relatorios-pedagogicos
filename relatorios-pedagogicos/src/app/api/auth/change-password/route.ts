// POST /api/auth/change-password - troca a senha do usuário logado
// Apaga mustChangePassword=true ao salvar.
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LEN = 10

function isWeakPassword(password: string): boolean {
  return (
    password === '123@ppi' ||
    password === '123456' ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  )
}

export async function POST(request: Request) {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()
    const normalizedNewPassword = String(newPassword || '')

    if (normalizedNewPassword.length < MIN_PASSWORD_LEN || isWeakPassword(normalizedNewPassword)) {
      return NextResponse.json(
        {
          error:
            'A nova senha precisa ter pelo menos 10 caracteres, letras maiúsculas, minúsculas e números, e não pode ser uma senha padrão.',
        },
        { status: 400 },
      )
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
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    if (currentPassword) {
      const ok = await bcrypt.compare(currentPassword, user.password)
      if (!ok) {
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 401 },
        )
      }
    } else if (!user.mustChangePassword) {
      return NextResponse.json(
        { error: 'Senha atual obrigatória' },
        { status: 400 },
      )
    }

    const hash = await bcrypt.hash(normalizedNewPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    })

    return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error('[change-password] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
