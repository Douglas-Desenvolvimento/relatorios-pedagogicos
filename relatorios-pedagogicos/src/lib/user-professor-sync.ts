import type { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { hashMatricula } from './matriculaHash'

export const DEFAULT_INITIAL_PASSWORD = '123@ppi'

export type IdListInput = unknown

type SyncDbClient = {
  user: any
  professor: any
  turma: any
  relatorio: any
}

export function normalizeIdList(value: IdListInput): number[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  )
}

export function isPasswordCompliant(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password !== DEFAULT_INITIAL_PASSWORD
  )
}

export function passwordPolicyMessage(): string {
  return 'A senha precisa ter no minimo 8 caracteres, 1 letra maiuscula, 1 numero e 1 caractere especial.'
}

function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function loginBaseFromName(name: string): string {
  const parts = removeAccents(name)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'usuario'
  if (parts.length === 1) return parts[0]
  return `${parts[0]}.${parts[parts.length - 1]}`
}

function cleanLogin(value: string): string {
  return removeAccents(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
}

function normalizeMatriculaValue(value: unknown): string {
  return String(value || '').trim().replace(/[-\s]/g, '')
}

async function generateUniqueEmail(
  tx: SyncDbClient,
  preferredEmail: string | null | undefined,
  professorId: number,
): Promise<string> {
  const preferred = String(preferredEmail || '').trim().toLowerCase()
  if (preferred) {
    const existing = await tx.user.findUnique({
      where: { email: preferred },
      select: { id: true },
    })
    if (!existing) return preferred
  }

  let suffix = 0
  while (true) {
    const candidate = suffix === 0
      ? `professor-${professorId}@default.local`
      : `professor-${professorId}-${suffix}@default.local`
    const existing = await tx.user.findUnique({
      where: { email: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    suffix += 1
  }
}

async function generateUniqueMatricula(
  tx: SyncDbClient,
  preferredMatricula: string | null | undefined,
  professorId: number,
): Promise<string> {
  const preferred = normalizeMatriculaValue(preferredMatricula)
  if (preferred) {
    const existing = await tx.user.findUnique({
      where: { matricula: preferred.slice(0, 20) },
      select: { id: true },
    })
    if (!existing) return preferred.slice(0, 20)
  }

  let suffix = 0
  while (true) {
    const candidate = suffix === 0
      ? `P${professorId}`.slice(0, 20)
      : `P${professorId}${suffix}`.slice(0, 20)
    const existing = await tx.user.findUnique({
      where: { matricula: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    suffix += 1
  }
}

export async function generateUniqueLogin(
  tx: SyncDbClient,
  name: string,
  preferredLogin?: string | null,
  options: { excludeUserId?: number; excludeProfessorId?: number } = {},
): Promise<string> {
  const base = cleanLogin(preferredLogin || loginBaseFromName(name)) || 'usuario'
  let candidate = base
  let suffix = 1

  while (true) {
    const [user, professor] = await Promise.all([
      tx.user.findFirst({
        where: {
          login: candidate,
          ...(options.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
        },
        select: { id: true },
      }),
      tx.professor.findFirst({
        where: {
          login: candidate,
          ...(options.excludeProfessorId ? { id: { not: options.excludeProfessorId } } : {}),
        },
        select: { id: true },
      }),
    ])

    if (!user && !professor) return candidate
    candidate = `${base}${suffix++}`
  }
}

export async function ensureTurmaMateriaLinks(
  tx: SyncDbClient,
  turmaIds: number[],
  materiaIds: number[],
): Promise<void> {
  for (const turmaId of turmaIds) {
    for (const materiaId of materiaIds) {
      const relacaoExistente = await tx.turma.findFirst({
        where: {
          id: turmaId,
          materias: { some: { id: materiaId } },
        },
        select: { id: true },
      })

      if (!relacaoExistente) {
        await tx.turma.update({
          where: { id: turmaId },
          data: { materias: { connect: { id: materiaId } } },
        })
      }
    }
  }
}

type SyncUser = {
  id: number
  nome: string
  email: string
  matricula: string
  login: string | null
  role: Role
  idTbProfessor?: number | null
}

async function findReusableProfessorForUser(tx: SyncDbClient, user: SyncUser) {
  const candidates = [
    user.idTbProfessor ? { id: user.idTbProfessor } : null,
    { userId: user.id },
    user.login ? { login: user.login } : null,
    user.email ? { email: user.email } : null,
    user.matricula ? { matricula: user.matricula } : null,
  ].filter(Boolean)

  if (candidates.length === 0) return null

  return tx.professor.findFirst({
    where: {
      AND: [
        { OR: candidates },
        { OR: [{ userId: null }, { userId: user.id }] },
      ],
    },
    select: { id: true, userId: true },
  })
}

async function findReusableUserForProfessor(tx: SyncDbClient, professor: any) {
  const candidates = [
    professor.userId ? { id: professor.userId } : null,
    { idTbProfessor: professor.id },
    professor.login ? { login: professor.login } : null,
    professor.email ? { email: String(professor.email).trim().toLowerCase() } : null,
    professor.matricula ? { matricula: normalizeMatriculaValue(professor.matricula).slice(0, 20) } : null,
  ].filter(Boolean)

  if (candidates.length === 0) return null

  const users = await tx.user.findMany({
    where: {
      role: 'PROFESSOR',
      OR: candidates,
    },
    include: { professor: { select: { id: true } } },
    orderBy: { id: 'asc' },
  })

  return users.find((user: any) => (
    (!user.idTbProfessor || user.idTbProfessor === professor.id) &&
    (!user.professor || user.professor.id === professor.id)
  )) ?? null
}

export async function createProfessorForUser(
  tx: SyncDbClient,
  user: SyncUser,
  materiaIds: number[],
  turmaIds: number[],
) {
  if (user.role !== 'PROFESSOR') return null

  const existingProfessor = await findReusableProfessorForUser(tx, user)
  if (existingProfessor) {
    return updateProfessorForUser(tx, existingProfessor.id, user, materiaIds, turmaIds)
  }

  const professor = await tx.professor.create({
    data: {
      name: user.nome,
      email: user.email,
      login: user.login,
      matricula: user.matricula,
      matricula_hash: hashMatricula(user.matricula),
      userId: user.id,
      role: 'PROFESSOR',
      materias: { connect: materiaIds.map((id) => ({ id })) },
      turmas: { connect: turmaIds.map((id) => ({ id })) },
    },
  })

  await tx.user.update({
    where: { id: user.id },
    data: { idTbProfessor: professor.id, mustChangePassword: false },
  })
  await ensureTurmaMateriaLinks(tx, turmaIds, materiaIds)

  return professor
}

export async function updateProfessorForUser(
  tx: SyncDbClient,
  professorId: number,
  user: SyncUser,
  materiaIds: number[],
  turmaIds: number[],
) {
  const professor = await tx.professor.update({
    where: { id: professorId },
    data: {
      name: user.nome,
      email: user.email,
      login: user.login,
      matricula: user.matricula,
      matricula_hash: hashMatricula(user.matricula),
      userId: user.id,
      role: 'PROFESSOR',
      materias: { set: materiaIds.map((id) => ({ id })) },
      turmas: { set: turmaIds.map((id) => ({ id })) },
    },
  })

  await tx.user.update({
    where: { id: user.id },
    data: { idTbProfessor: professor.id },
  })
  await ensureTurmaMateriaLinks(tx, turmaIds, materiaIds)

  return professor
}

export async function repairProfessorUserSync(tx: SyncDbClient) {
  const professores = await tx.professor.findMany({
    where: { role: 'PROFESSOR', userId: null },
    include: {
      materias: { select: { id: true } },
      turmas: { select: { id: true } },
    },
    orderBy: { id: 'asc' },
  })

  let linked = 0
  let created = 0

  for (const professor of professores) {
    let user = await findReusableUserForProfessor(tx, professor)

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          role: 'PROFESSOR',
          idTbProfessor: professor.id,
        },
      })
      linked += 1
    } else {
      const email = await generateUniqueEmail(tx, professor.email, professor.id)
      const matricula = await generateUniqueMatricula(tx, professor.matricula, professor.id)
      const login = await generateUniqueLogin(tx, professor.name, professor.login, {
        excludeProfessorId: professor.id,
      })
      const password = await bcrypt.hash(DEFAULT_INITIAL_PASSWORD, 10)

      user = await tx.user.create({
        data: {
          nome: professor.name,
          email,
          matricula,
          login,
          password,
          role: 'PROFESSOR',
          active: true,
          idTbProfessor: professor.id,
          mustChangePassword: false,
        },
      })
      created += 1
    }

    await tx.professor.update({
      where: { id: professor.id },
      data: {
        userId: user.id,
        role: 'PROFESSOR',
      },
    })
    await ensureTurmaMateriaLinks(
      tx,
      professor.turmas.map((turma: any) => turma.id),
      professor.materias.map((materia: any) => materia.id),
    )
  }

  return { linked, created }
}

export async function hideOrDeleteProfessorForFormerUser(
  tx: SyncDbClient,
  professorId: number,
  targetRole: Exclude<Role, 'PROFESSOR'>,
): Promise<void> {
  const relatoriosCount = await tx.relatorio.count({ where: { professorId } })
  if (relatoriosCount > 0) {
    await tx.professor.update({
      where: { id: professorId },
      data: {
        userId: null,
        role: targetRole,
      },
    })
    return
  }

  await tx.professor.delete({ where: { id: professorId } })
}

export async function deleteProfessorIfUnused(
  tx: SyncDbClient,
  professorId: number,
): Promise<void> {
  const relatoriosCount = await tx.relatorio.count({ where: { professorId } })
  if (relatoriosCount > 0) {
    throw new Error('Nao e possivel remover o registro de professor porque existem relatorios vinculados a ele.')
  }

  await tx.professor.delete({ where: { id: professorId } })
}
