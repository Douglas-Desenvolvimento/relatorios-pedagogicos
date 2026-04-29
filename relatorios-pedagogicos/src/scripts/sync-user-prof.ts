// Script: sincronização total User <-> Professor.
// - Para cada User SEM Professor vinculado: cria Professor com a role do
//   User e linka (idTbProfessor / userId).
// - Para cada Professor SEM User: já coberto por sync-prof-user.ts.
// - Sincroniza matrícula entre User e Professor (User é a fonte da verdade
//   pois é onde admin edita).
//
// Idempotente. Use após mudanças no schema.
//
// Uso:
//   cd relatorios-pedagogicos
//   npx tsx src/scripts/sync-user-prof.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Sincronizando User → Professor (todos os roles)...')

  const users = await prisma.user.findMany({
    include: { professor: true },
    orderBy: { id: 'asc' },
  })

  let criados = 0
  let atualizados = 0
  let pulados = 0

  for (const u of users) {
    if (u.professor) {
      // Já tem Professor — sincroniza role e matrícula.
      const updates: Record<string, unknown> = {}
      if (u.professor.role !== u.role) updates.role = u.role
      if (u.professor.matricula !== u.matricula) updates.matricula = u.matricula
      if (u.professor.email !== u.email) updates.email = u.email
      if (u.professor.login !== u.login) updates.login = u.login
      if (u.professor.name !== u.nome) updates.name = u.nome

      if (Object.keys(updates).length > 0) {
        await prisma.professor.update({
          where: { id: u.professor.id },
          data: updates,
        })
        atualizados++
        console.log(`   🔧 atualizado prof.id=${u.professor.id} (${u.nome}): ${Object.keys(updates).join(', ')}`)
      } else {
        pulados++
      }
      // Garante que User.idTbProfessor está apontando corretamente
      if (u.idTbProfessor !== u.professor.id) {
        await prisma.user.update({
          where: { id: u.id },
          data: { idTbProfessor: u.professor.id },
        })
      }
      continue
    }

    // Cria Professor para esse User (mesmo se for ADMIN/COORDENADOR)
    const login = u.login || `user.${u.id}`
    const newProf = await prisma.professor.create({
      data: {
        name: u.nome,
        email: u.email,
        login,
        matricula: u.matricula,
        userId: u.id,
        role: u.role,
      },
    })
    await prisma.user.update({
      where: { id: u.id },
      data: { idTbProfessor: newProf.id },
    })
    criados++
    console.log(`   ✅ criado prof.id=${newProf.id} para user "${u.nome}" (role=${u.role})`)
  }

  console.log('\n📊 RESUMO:')
  console.log(`   criados:     ${criados}`)
  console.log(`   atualizados: ${atualizados}`)
  console.log(`   já em sync:  ${pulados}`)
  console.log('✅ Concluído.')
}

main()
  .catch((err) => {
    console.error('❌ Falha:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
