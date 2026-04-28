import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// IMPORTANTE: NÃO passar `datasources.db.url` aqui.
// O Prisma já lê `env("DATABASE_URL")` definido em prisma/schema.prisma
// de forma LAZY (na primeira query). Setar `url: process.env.DATABASE_URL`
// força validação no momento do `new PrismaClient(...)`, e durante o
// build do Next.js (page data collection) a env var pode estar ausente,
// causando: "Invalid value undefined for datasource 'db'".
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Função para verificar conexão
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}