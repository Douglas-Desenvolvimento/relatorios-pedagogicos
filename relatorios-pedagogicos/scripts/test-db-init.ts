// Script de teste local: roda ensureDatabaseInitialized contra o banco real
// Uso: node --env-file=.env.local -r ts-node/register scripts/test-db-init.ts
// Ou: npx tsx scripts/test-db-init.ts

import { ensureDatabaseInitialized } from '../src/lib/db-init'
import { prisma } from '../src/lib/db'

async function main() {
  console.log('===== TESTE DE INICIALIZACAO DO BANCO =====')
  console.log('DATABASE_URL host:', process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1])

  await ensureDatabaseInitialized()

  console.log('\n===== TABELAS CRIADAS =====')
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  for (const t of tables) console.log(' -', t.table_name)

  console.log('\n✅ Teste concluído.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Falha no teste:', e)
  await prisma.$disconnect()
  process.exit(1)
})
