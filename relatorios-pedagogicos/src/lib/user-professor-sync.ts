import type { Prisma, Role } from '@prisma/client'
import { hashMatricula } from './matriculaHash'

export const DEFAULT_INITIAL_PASSWORD = '123@ppi'

export type IdListInput = unknown

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

export async function generateUniqueLogin(
  tx: Prisma.TransactionClient,
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
  tx: Prisma.TransactionClient,
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
}

export async function createProfessorForUser(
  tx: Prisma.TransactionClient,
  user: SyncUser,
  materiaIds: number[],
  turmaIds: number[],
) {
  if (user.role !== 'PROFESSOR') return null

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
    data: { idTbProfessor: professor.id },
  })
  await ensureTurmaMateriaLinks(tx, turmaIds, materiaIds)

  return professor
}

export async function updateProfessorForUser(
  tx: Prisma.TransactionClient,
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

export async function deleteProfessorIfUnused(
  tx: Prisma.TransactionClient,
  professorId: number,
): Promise<void> {
  const relatoriosCount = await tx.relatorio.count({ where: { professorId } })
  if (relatoriosCount > 0) {
    throw new Error('Nao e possivel remover o registro de professor porque existem relatorios vinculados a ele.')
  }

  await tx.professor.delete({ where: { id: professorId } })
}
