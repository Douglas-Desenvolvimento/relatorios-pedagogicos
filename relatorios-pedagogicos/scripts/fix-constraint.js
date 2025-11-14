// Script para corrigir o constraint do banco de dados
// Execute com: node scripts/fix-constraint.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixConstraint() {
  console.log('🔧 Iniciando correção do constraint...\n');

  try {
    // 1. Ver índices atuais
    console.log('📋 Índices únicos atuais:');
    const currentIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'relatorios' AND indexdef LIKE '%UNIQUE%'
    `;
    console.log(currentIndexes);
    console.log('');

    // 2. Remover índices antigos
    console.log('🗑️  Removendo índices antigos...');
    await prisma.$executeRaw`DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key"`;
    await prisma.$executeRaw`DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_created_at_key"`;
    await prisma.$executeRaw`DROP INDEX IF EXISTS "Relatorio_alunoId_professorId_materiaId_turmaId_key"`;
    console.log('✅ Índices antigos removidos\n');

    // 3. Criar novo índice
    console.log('📝 Criando novo índice com bimestreId...');
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
      ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId")
    `;
    console.log('✅ Novo índice criado\n');

    // 4. Verificar
    console.log('🔍 Verificando novo índice:');
    const newIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'relatorios' AND indexdef LIKE '%UNIQUE%'
    `;
    console.log(newIndexes);
    console.log('');

    console.log('✅ Correção concluída com sucesso!');
    console.log('🚀 Agora faça o redeploy na Vercel');

  } catch (error) {
    console.error('❌ Erro ao corrigir constraint:', error);
    console.error('\n💡 Dica: Execute os comandos SQL manualmente no painel da Vercel');
  } finally {
    await prisma.$disconnect();
  }
}

fixConstraint();
