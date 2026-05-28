import { spawnSync } from 'node:child_process'

if (process.env.RUN_PRISMA_MIGRATE !== 'true') {
  console.log('[migrations] RUN_PRISMA_MIGRATE is not true; skipping prisma migrate deploy.')
  process.exit(0)
}

if (process.env.SKIP_PRISMA_MIGRATE === 'true') {
  console.log('[migrations] SKIP_PRISMA_MIGRATE=true; skipping prisma migrate deploy.')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  console.log('[migrations] DATABASE_URL is not configured; skipping prisma migrate deploy.')
  process.exit(0)
}

console.log('[migrations] Running prisma migrate deploy...')
const result = spawnSync('prisma', ['migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
})

if (result.error) {
  console.error('[migrations] Failed to run prisma migrate deploy:', result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
