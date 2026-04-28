// src/app/api/login/route.ts
// Login unificado: professor (sem senha, via login ou matricula),
// coordenador/admin (com matricula + senha).
// Toda tentativa é registrada na tabela login_audit.
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { gerarToken, salvarTokenNosCookies } from '@/lib/auth'
import { hashMatricula } from '@/lib/matriculaHash'
import {
  recordLoginAttempt,
  extractClientIp,
  extractUserAgent,
} from '@/lib/login-audit'
import { normalizeMatricula } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  try {
    const { matricula, login, password } = await request.json()
    console.log('🔐 Login request:', {
      matricula,
      login,
      hasPassword: Boolean(password),
    })

    if (!matricula && !login) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: '(vazio)',
        ip,
        userAgent,
        success: false,
        message: 'Matrícula/login obrigatório',
      })
      return NextResponse.json(
        { error: 'Matrícula ou login é obrigatório' },
        { status: 400 },
      )
    }

    // ========== Login de PROFESSOR (sem senha) ==========
    if (!password) {
      let professor = null

      if (login) {
        professor = await prisma.professor.findUnique({
          where: { login: String(login).toLowerCase().trim() },
          include: { turmas: true, materias: true },
        })
      }
      if (!professor && matricula) {
        const matriculaHash = hashMatricula(matricula)
        professor = await prisma.professor.findFirst({
          where: { matricula_hash: matriculaHash },
          include: { turmas: true, materias: true },
        })
      }

      if (!professor) {
        await recordLoginAttempt({
          role: 'PROFESSOR',
          identifier: String(login || matricula),
          ip,
          userAgent,
          success: false,
          message: 'Professor não encontrado',
        })
        return NextResponse.json(
          {
            error: login
              ? 'Login de professor não encontrado'
              : 'Matrícula de professor não encontrada',
          },
          { status: 401 },
        )
      }

      const token = gerarToken({
        sub: professor.id.toString(),
        role: 'PROFESSOR',
        matricula: professor.matricula ?? '',
        nome: professor.name,
      })
      await salvarTokenNosCookies(token)

      await recordLoginAttempt({
        professorId: professor.id,
        role: 'PROFESSOR',
        nome: professor.name,
        identifier: String(login || matricula),
        ip,
        userAgent,
        success: true,
        message: 'Login OK',
      })

      console.log('✅ Login professor:', professor.name)
      return NextResponse.json({
        success: true,
        role: 'PROFESSOR',
        nome: professor.name,
        isProfessor: true,
      })
    }

    // ========== Login de COORDENADOR/ADMIN (com senha) ==========
    // Aceita matricula com ou sem hífen (ex: "271952-4" ou "2719524").
    const matRaw = String(matricula).trim()
    const matNorm = normalizeMatricula(matRaw)

    const user = await prisma.user.findFirst({
      where: { OR: [{ matricula: matRaw }, { matricula: matNorm }] },
    })

    if (!user) {
      await recordLoginAttempt({
        role: 'UNKNOWN',
        identifier: matRaw,
        ip,
        userAgent,
        success: false,
        message: 'Usuário não encontrado',
      })
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 },
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      await recordLoginAttempt({
        userId: user.id,
        role: user.role,
        nome: user.nome,
        identifier: matRaw,
        ip,
        userAgent,
        success: false,
        message: 'Senha incorreta',
      })
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 },
      )
    }

    const token = gerarToken({
      sub: user.id.toString(),
      role: user.role,
      matricula: user.matricula,
      nome: user.nome,
    })
    await salvarTokenNosCookies(token)

    await recordLoginAttempt({
      userId: user.id,
      role: user.role,
      nome: user.nome,
      identifier: matRaw,
      ip,
      userAgent,
      success: true,
      message: 'Login OK',
    })

    // Atualiza last_login_at
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    } catch {
      // não-crítico
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      nome: user.nome,
    })
  } catch (error) {
    console.error('💥 Erro no login:', error)
    await recordLoginAttempt({
      role: 'UNKNOWN',
      identifier: '(erro)',
      ip,
      userAgent,
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
