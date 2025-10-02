// seed-incremental.ts - VERSÃO SIMPLIFICADA
const { PrismaClient } = require('@prisma/client');
const { hashMatricula } = require('../lib/matriculaHash');

const prisma = new PrismaClient();

// Interfaces para tipagem
interface MateriaData {
  name: string;
  codigo: string;
}

interface ProfessorData {
  name: string;
  email: string;
  matricula: string | null;
  materias: string[];
  turmas: string[];
}

interface AlunosPorTurma {
  [turmaNome: string]: string[];
}

async function main() {
  console.info('🚀 Iniciando seed incremental do banco de dados...');
  console.info('📝 Este script NÃO limpa dados existentes - apenas adiciona novos registros');

  // =========================================================================
  // 1. APENAS OS DADOS QUE VOCÊ QUER ADICIONAR
  // =========================================================================

  // 🔹 NOVAS MATÉRIAS (adicione aqui)
  const novasMaterias: MateriaData[] = [
   // { name: 'Ciências', codigo: 'CIE-001' },
    // { name: 'Física', codigo: 'FIS-001' },
    // { name: 'Química', codigo: 'QUI-001' },
  ];

  // 🔹 NOVAS TURMAS (adicione aqui)
  const novasTurmas: string[] = [
    // '2001',
    // '2002',
  ];

  // 🔹 NOVOS PROFESSORES (adicione aqui)
  const novosProfessores: ProfessorData[] = [
    //{ 
    // name: 'Elisabete Farias da Silva', 
    //  email: 'elisabete.silva@escola.com', 
    //  matricula: '361.954-1',
    //  materias: ['Ciências'], 
   //   turmas: ['1601', '1602', '1701', '1702', '1801', '1802', '1803', '1901', '1902'] // ⚠️ Turmas devem existir
   // },
    // { 
    //   name: 'Novo Professor', 
    //   email: 'novo@escola.com', 
    //   matricula: '123/456.789-0',
    //   materias: ['Matemática'], 
    //   turmas: ['1801', '1902'] 
    // },
  ];

  // 🔹 NOVOS ALUNOS (adicione aqui)
  const novosAlunos: AlunosPorTurma = {
    // '1801': [
    //   "NOVO ALUNO 1",
    //   "NOVO ALUNO 2",
    // ],
    // '2001': [ // ⚠️ Turma deve existir ou ser criada acima
    //   "ALUNO TURMA NOVA",
    // ],
    '1602': ["Victor Hugo Flausino Paiva"],
    '1702': ["Lucas Rafael Lopes de Almeida"],


  };

  // =========================================================================
  // 2. PROCESSAMENTO AUTOMÁTICO (NÃO PRECISA MODIFICAR)
  // =========================================================================

  console.info('📚 Processando novas matérias...');
  const materiasMap: { [key: string]: any } = {};

  for (const materiaData of novasMaterias) {
    let materia = await prisma.materia.findFirst({ where: { name: materiaData.name } });
    
    if (!materia) {
      materia = await prisma.materia.create({ data: materiaData });
      console.info(`✅ Matéria criada: ${materiaData.name}`);
    } else {
      console.info(`📝 Matéria já existe: ${materiaData.name}`);
    }
    materiasMap[materiaData.name] = materia;
  }

  console.info('🏫 Processando novas turmas...');
  const turmasMap: { [key: string]: any } = {};

  for (const turmaNome of novasTurmas) {
    let turma = await prisma.turma.findFirst({ where: { name: turmaNome } });
    
    if (!turma) {
      turma = await prisma.turma.create({ data: { name: turmaNome, anoLetivo: '2025' } });
      console.info(`✅ Turma criada: ${turmaNome}`);
    } else {
      console.info(`📝 Turma já existe: ${turmaNome}`);
    }
    turmasMap[turmaNome] = turma;
  }

  console.info('👩‍🏫 Processando novos professores...');
  for (const profData of novosProfessores) {
    const professorExistente = await prisma.professor.findFirst({
      where: { email: profData.email }
    });

    if (professorExistente) {
      console.info(`📝 Professor já existe: ${profData.name}`);
      continue;
    }

    // Buscar ou criar matérias
    const materiasConnect = [];
    for (const materiaNome of profData.materias) {
      let materia = materiasMap[materiaNome];
      if (!materia) {
        materia = await prisma.materia.findFirst({ where: { name: materiaNome } });
        if (materia) materiasMap[materiaNome] = materia;
      }
      if (materia) {
        materiasConnect.push({ id: materia.id });
      } else {
        console.warn(`⚠️ Matéria não encontrada: ${materiaNome}`);
      }
    }

    // Buscar turmas
    const turmasConnect = [];
    for (const turmaNome of profData.turmas) {
      let turma = turmasMap[turmaNome];
      if (!turma) {
        turma = await prisma.turma.findFirst({ where: { name: turmaNome } });
        if (turma) turmasMap[turmaNome] = turma;
      }
      if (turma) {
        turmasConnect.push({ id: turma.id });
      } else {
        console.warn(`⚠️ Turma não encontrada: ${turmaNome}`);
      }
    }

    // Criar professor com todos os relacionamentos
    const matriculaHash = profData.matricula ? hashMatricula(profData.matricula) : null;
    
    await prisma.professor.create({
      data: {
        name: profData.name,
        email: profData.email,
        matricula: profData.matricula,
        matricula_hash: matriculaHash,
        materias: { connect: materiasConnect },
        turmas: { connect: turmasConnect },
      },
    });

    console.info(`✅ Professor criado: ${profData.name}`);

    // 🔄 CRIAR RELAÇÕES MATÉRIA-TURMA AUTOMATICAMENTE
    for (const turmaConnect of turmasConnect) {
      for (const materiaConnect of materiasConnect) {
        // Verificar se a relação já existe
        const relacaoExistente = await prisma.turma.findFirst({
          where: { 
            id: turmaConnect.id,
            materias: {
              some: { id: materiaConnect.id }
            }
          }
        });

        if (!relacaoExistente) {
          await prisma.turma.update({
            where: { id: turmaConnect.id },
            data: {
              materias: {
                connect: { id: materiaConnect.id }
              }
            }
          });
          console.info(`   🔗 Relação criada: Turma ${turmaConnect.id} ↔ Matéria ${materiaConnect.id}`);
        }
      }
    }
  }

  console.info('👧 Processando novos alunos...');
  for (const [turmaNome, alunos] of Object.entries(novosAlunos)) {
    let turma = turmasMap[turmaNome];
    if (!turma) {
      turma = await prisma.turma.findFirst({ where: { name: turmaNome } });
      if (turma) turmasMap[turmaNome] = turma;
    }

    if (!turma) {
      console.warn(`⚠️ Turma não encontrada: ${turmaNome}`);
      continue;
    }

    for (const alunoNome of alunos) {
      const alunoExistente = await prisma.aluno.findFirst({
        where: { name: alunoNome, turmaId: turma.id }
      });

      if (!alunoExistente) {
        await prisma.aluno.create({
          data: {
            name: alunoNome,
            turmaId: turma.id,
            matricule: `ALU-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            active: true,
          },
        });
        console.info(`✅ Aluno criado: ${alunoNome} (${turmaNome})`);
      } else {
        console.info(`📝 Aluno já existe: ${alunoNome} (${turmaNome})`);
      }
    }
  }

  console.info('');
  console.info('🎉 SEED CONCLUÍDO!');
  console.info('📊 RESUMO:');
  console.info(`• Matérias: ${novasMaterias.length} processadas`);
  console.info(`• Turmas: ${novasTurmas.length} processadas`);
  console.info(`• Professores: ${novosProfessores.length} processados`);
  console.info(`• Alunos: ${Object.values(novosAlunos).flat().length} processados`);
  console.info('');
  console.info('🔗 RELAÇÕES CRIADAS AUTOMATICAMENTE:');
  console.info('• Professor ↔ Matéria');
  console.info('• Professor ↔ Turma');
  console.info('• Matéria ↔ Turma (quando necessário)');
  console.info('• Aluno → Turma');
}

main()
  .catch(error => {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });