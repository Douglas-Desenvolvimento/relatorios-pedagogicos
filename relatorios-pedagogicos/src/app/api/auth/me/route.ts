// GET /api/auth/me - retorna dados do usuário/professor logado
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const id = parseInt(token.sub)
    if (token.role === 'PROFESSOR') {
      const prof = await prisma.professor.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          login: true,
          matricula: true,
          role: true,
        },
      })
      if (!prof) return NextResponse.json({ authenticated: false }, { status: 401 })
      return NextResponse.json({
        authenticated: true,
        id: prof.id,
        nome: prof.name,
        email: prof.email,
        login: prof.login,
        matricula: prof.matricula,
        role: 'PROFESSOR',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        lastLoginAt: true,
      },
    })
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })
    return NextResponse.json({
      authenticated: true,
      id: user.id,
      nome: user.nome,
      email: user.email,
      matricula: user.matricula,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    })
  } catch (err) {
    console.error('[/api/auth/me] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
