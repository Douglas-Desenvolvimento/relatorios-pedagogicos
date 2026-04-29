// Script: para cada Professor sem User vinculado, cria um User com:
//  - login = professor.login
//  - email = professor.email
//  - matricula = professor.matricula
//  - password = bcrypt('123@ppi')
//  - role = PROFESSOR
//  - mustChangePassword = true
//  - idTbProfessor = professor.id
// Atualiza Professor.userId = user.id.
//
// Idempotente: pula se já houver vínculo.
//
// Uso:
//   cd relatorios-pedagogicos
//   npx tsx src/scripts/sync-prof-user.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = '123@ppi'

async function main() {
  console.log('🔄 Sincronizando Professor → User...')
  const professores = await prisma.professor.findMany()
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  let criados = 0
  let vinculados = 0
  let pulados = 0

  for (const p of professores) {
    if (p.userId) {
      pulados++
      continue
    }
    // Se já existe um User com esse email/login, só vincula.
    let user = null
    if (p.email) user = await prisma.user.findUnique({ where: { email: p.email } })
    if (!user && p.login) user = await prisma.user.findUnique({ where: { login: p.login } })

    if (user) {
      // Vincula
      await prisma.user.update({
        where: { id: user.id },
        data: { idTbProfessor: p.id, role: 'PROFESSOR' },
      })
      await prisma.professor.update({
        where: { id: p.id },
        data: { userId: user.id, role: 'PROFESSOR' },
      })
      vinculados++
      console.log(`   🔗 vinculado: ${p.name} -> userId=${user.id}`)
      continue
    }

    // Cria novo
    if (!p.login) {
      console.warn(`   ⚠️  Pulando ${p.name}: sem login`)
      continue
    }
    const matricula = p.matricula || `PROF-${p.id.toString().padStart(4, '0')}`
    const email = p.email || `${p.login}@escola.com`
    const newUser = await prisma.user.create({
      data: {
        nome: p.name,
        email,
        matricula,
        login: p.login,
        password: hash,
        role: 'PROFESSOR',
        idTbProfessor: p.id,
        mustChangePassword: true,
      },
    })
    await prisma.professor.update({
      where: { id: p.id },
      data: { userId: newUser.id, role: 'PROFESSOR' },
    })
    criados++
    console.log(`   ✅ criado: ${p.name} (login=${p.login}) -> userId=${newUser.id}`)
  }

  console.log(`\n📊 RESUMO:`)
  console.log(`   criados:   ${criados}`)
  console.log(`   vinculados: ${vinculados}`)
  console.log(`   pulados:   ${pulados}`)
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
