import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeMatricula, withAudit } from '@/lib/auth-guard'
import { issueProfessorAccessCode } from '@/lib/professor-access-code'
import { noStore, rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ISSUE_WINDOW_MS = 60 * 60 * 1000
const ISSUE_LIMIT_PER_ACTOR = 30

function parsePositiveId(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: NextRequest) {
  return withAudit(request, ['ADMIN', 'COORDENADOR'], async (token) => {
    try {
      const { professorId, login, matricula } = await request.json()
      const id = parsePositiveId(professorId)
      const identifier = String(login || matricula || '').trim()

      if (!id && !identifier) {
        return NextResponse.json(
          { error: 'Informe professorId, login ou matricula do professor' },
          { status: 400 },
        )
      }

      const limited = rateLimit({
        key: `professor-code:issue:${token.sub}:${id || identifier.toLowerCase()}`,
        limit: ISSUE_LIMIT_PER_ACTOR,
        windowMs: ISSUE_WINDOW_MS,
      })
      if (limited) return limited

      const normalizedIdentifier = normalizeMatricula(identifier)
      const professor = await prisma.professor.findFirst({
        where: id
          ? { id }
          : {
              role: 'PROFESSOR',
              OR: [
                { login: identifier.toLowerCase() },
                { email: identifier.toLowerCase() },
                { matricula: identifier },
                { matricula: normalizedIdentifier },
              ],
            },
        include: { user: true },
      })

      if (!professor || professor.role !== 'PROFESSOR') {
        return NextResponse.json({ error: 'Professor nao encontrado' }, { status: 404 })
      }

      if (professor.user && !professor.user.active) {
        return NextResponse.json(
          { error: 'Conta do professor esta desativada' },
          { status: 403 },
        )
      }

      const actorId = parsePositiveId(token.sub)
      const { code, expiresAt } = await issueProfessorAccessCode({
        professorId: professor.id,
        createdByUserId: actorId,
      })

      return noStore(
        NextResponse.json({
          code,
          expiresAt: expiresAt.toISOString(),
          professor: {
            id: professor.id,
            name: professor.name,
            login: professor.login,
            matricula: professor.matricula,
          },
          message: 'Codigo temporario emitido. Entregue ao professor por canal institucional.',
        }),
      )
    } catch (error) {
      console.error('Erro ao emitir codigo de acesso do professor:', error)
      return NextResponse.json(
        { error: 'Erro interno ao emitir codigo de acesso' },
        { status: 500 },
      )
    }
  })
}
