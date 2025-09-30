// scripts/popularMatriculaHash.ts
import { PrismaClient } from '@prisma/client';
import { hashMatricula } from '@/lib/matriculaHash';

const prisma = new PrismaClient();

async function popularMatriculaHash() {
  try {
    console.log('🔄 Populando coluna matricula_hash...');
    
    // Buscar todos os professores que têm matricula mas não têm matricula_hash
    const professores = await prisma.professor.findMany({
      where: {
        matricula: { not: null },
        OR: [
          { matricula_hash: null },
          { matricula_hash: '' },
          { matricula_hash: {not: null} }
        ]
      }
    });

    console.log(`📝 Encontrados ${professores.length} professores para atualizar`);

    for (const professor of professores) {
      if (professor.matricula) {
        const hash = hashMatricula(professor.matricula);
        
        await prisma.professor.update({
          where: { id: professor.id },
          data: { matricula_hash: hash }
        });
        
        console.log(`✅ ${professor.name}: ${professor.matricula} → ${hash.substring(0, 10)}...`);
      }
    }

    console.log('🎉 Matrículas hash populadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao popular matrículas hash:', error);
  } finally {
    await prisma.$disconnect();
  }
}

popularMatriculaHash();