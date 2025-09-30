// scripts/verificarHashes.ts
import { PrismaClient } from '@prisma/client';
import { hashMatricula, verifyMatricula } from '@/lib/matriculaHash';

const prisma = new PrismaClient();

async function verificarHashes() {
  try {
    console.log('🔍 Verificando hashes...');
    
    const professores = await prisma.professor.findMany({
      where: { matricula: { not: null } }
    });

    for (const professor of professores) {
      if (professor.matricula && professor.matricula_hash) {
        const isValid = verifyMatricula(professor.matricula, professor.matricula_hash);
        console.log(`✅ ${professor.name}: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
        
        if (!isValid) {
          console.log(`   Matrícula: ${professor.matricula}`);
          console.log(`   Hash: ${professor.matricula_hash}`);
        }
      }
    }

    console.log('🎉 Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarHashes();