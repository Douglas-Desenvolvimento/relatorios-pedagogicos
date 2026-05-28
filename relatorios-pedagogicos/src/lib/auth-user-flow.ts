import { prisma } from './db'
import { gerarToken, salvarTokenNosCookies } from './auth'
import { normalizeMatricula } from './auth-guard'

export async function findUserByIdentifier(identifier: string) {
  const idRaw = identifier.trim()
  const idNorm = normalizeMatricula(idRaw)
  const idLower = idRaw.toLowerCase()

  return prisma.user.findFirst({
    where: {
      OR: [
        { login: idLower },
        { email: idLower },
        { matricula: idRaw },
        { matricula: idNorm },
      ],
    },
    include: { professor: true },
  })
}

export async function ensureProfessorForAuth(user: any) {
  if (!user || user.role !== 'PROFESSOR') return null
  if (user.professor) return user.professor

  let professor = null

  if (user.idTbProfessor) {
    professor = await prisma.professor.findUnique({
      where: { id: user.idTbProfessor },
    })
  }

  if (!professor) {
    professor = await prisma.professor.findFirst({
      where: {
        role: 'PROFESSOR',
        userId: null,
        OR: [
          { login: user.login || undefined },
          { email: user.email },
          { matricula: user.matricula },
        ],
      },
    })
  }

  if (!professor || (professor.userId && professor.userId !== user.id)) {
    return null
  }

  const linked = await prisma.professor.update({
    where: { id: professor.id },
    data: {
      userId: user.id,
      role: 'PROFESSOR',
      name: professor.name || user.nome,
      email: professor.email || user.email,
      login: professor.login || user.login,
      matricula: professor.matricula || user.matricula,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { idTbProfessor: linked.id },
  })

  return linked
}

export async function issueAuthTokenForUser(user: any, firstAccess: boolean) {
  const professor = await ensureProfessorForAuth(user)

  if (user.role === 'PROFESSOR' && !professor) {
    throw new Error('Professor nao vinculado ao usuario')
  }

  const token = gerarToken({
    sub: user.role === 'PROFESSOR' ? professor.id.toString() : user.id.toString(),
    role: user.role,
    matricula: user.role === 'PROFESSOR'
      ? professor.matricula || user.matricula
      : user.matricula,
    nome: user.role === 'PROFESSOR'
      ? professor.name || user.nome
      : user.nome,
    firstAccess,
  })

  await salvarTokenNosCookies(token)
  return { token, professor }
}
