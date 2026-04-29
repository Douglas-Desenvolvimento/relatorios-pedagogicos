// POST /api/auth/change-password - troca a senha do usuário logado
// Apaga mustChangePassword=true ao salvar.
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LEN = 6

export async function POST(request: Request) {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (token.role === 'PROFESSOR') {
      return NextResponse.json(
        { error: 'Professor não usa senha — login direto por matrícula/login.' },
        { status: 400 },
      )
    }

    const { currentPassword, newPassword } = await request.json()
    if (!newPassword || String(newPassword).length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LEN} caracteres` },
        { status: 400 },
      )
    }
    if (newPassword === '123@ppi') {
      return NextResponse.json(
        { error: 'A nova senha não pode ser a senha padrão. Escolha outra.' },
        { status: 400 },
      )
    }

    const userId = parseInt(token.sub)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
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
      // Quando mustChangePassword=true (primeiro acesso/reset), não exige senha atual.
      // Caso contrário, exige.
      return NextResponse.json(
        { error: 'Senha atual obrigatória' },
        { status: 400 },
      )
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false },
    })

    return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error('[change-password] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
