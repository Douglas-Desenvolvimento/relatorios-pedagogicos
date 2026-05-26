const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const WEAK_PASSWORDS = new Set(['123456', '123@ppi', 'password', 'senha123']);

function requireStrongPassword(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} deve ser definido no ambiente. Senhas de seed nao devem ser versionadas.`);
  }

  const strong =
    value.length >= 12 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value) &&
    !WEAK_PASSWORDS.has(value.toLowerCase());

  if (!strong) {
    throw new Error(`${name} deve ter 12+ caracteres com maiuscula, minuscula, numero e simbolo.`);
  }

  return value;
}

async function upsertMateria(name, codigo) {
  return prisma.materia.upsert({
    where: { codigo },
    update: { name },
    create: { name, codigo },
  });
}

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    console.info('Seed de demonstracao ignorado. Defina ALLOW_DEMO_SEED=true para executar.');
    return;
  }

  const year = process.env.SEED_DEMO_YEAR?.trim() || '2026';
  const professorPassword = requireStrongPassword('SEED_PROFESSOR_PASSWORD');

  console.info('Criando dados ficticios de demonstracao...');

  const anoLetivo = await prisma.anoLetivo.upsert({
    where: { ano: year },
    update: { ativo: true },
    create: { ano: year, ativo: true },
  });

  const bimestres = [];
  for (const numero of [1, 2, 3, 4]) {
    bimestres.push(
      await prisma.bimestre.upsert({
        where: { numero_anoLetivoId: { numero, anoLetivoId: anoLetivo.id } },
        update: { ativo: numero === 1 },
        create: { numero, anoLetivoId: anoLetivo.id, ativo: numero === 1 },
      }),
    );
  }

  const matematica = await upsertMateria('Matematica Demo', 'MAT-DEM');
  const portugues = await upsertMateria('Lingua Portuguesa Demo', 'POR-DEM');

  const turma = await prisma.turma.upsert({
    where: { name: 'D601' },
    update: {
      anoLetivoId: anoLetivo.id,
      materias: { connect: [{ id: matematica.id }, { id: portugues.id }] },
    },
    create: {
      name: 'D601',
      anoLetivoId: anoLetivo.id,
      materias: { connect: [{ id: matematica.id }, { id: portugues.id }] },
    },
  });

  const professorEmail = process.env.SEED_PROFESSOR_EMAIL?.trim() || 'professor.demo@example.test';
  const professorUser = await prisma.user.upsert({
    where: { email: professorEmail },
    update: {
      nome: 'Professor Demo',
      login: 'professor.demo',
      matricula: 'PROF-DEMO',
      password: await bcrypt.hash(professorPassword, 12),
      role: 'PROFESSOR',
      active: true,
      mustChangePassword: true,
    },
    create: {
      nome: 'Professor Demo',
      email: professorEmail,
      login: 'professor.demo',
      matricula: 'PROF-DEMO',
      password: await bcrypt.hash(professorPassword, 12),
      role: 'PROFESSOR',
      active: true,
      mustChangePassword: true,
    },
  });

  const professor = await prisma.professor.upsert({
    where: { email: professorEmail },
    update: {
      name: 'Professor Demo',
      login: 'professor.demo',
      matricula: 'PROF-DEMO',
      userId: professorUser.id,
      materias: { set: [{ id: matematica.id }, { id: portugues.id }] },
      turmas: { set: [{ id: turma.id }] },
    },
    create: {
      name: 'Professor Demo',
      email: professorEmail,
      login: 'professor.demo',
      matricula: 'PROF-DEMO',
      userId: professorUser.id,
      materias: { connect: [{ id: matematica.id }, { id: portugues.id }] },
      turmas: { connect: [{ id: turma.id }] },
    },
  });

  await prisma.user.update({
    where: { id: professorUser.id },
    data: { idTbProfessor: professor.id },
  });

  const alunos = [];
  for (const [index, name] of ['Aluno Demo 001', 'Aluno Demo 002', 'Aluno Demo 003'].entries()) {
    alunos.push(
      await prisma.aluno.upsert({
        where: { matricule: `DEMO-A00${index + 1}` },
        update: { name, turmaId: turma.id, active: true, deletedAt: null },
        create: { name, matricule: `DEMO-A00${index + 1}`, turmaId: turma.id, active: true },
      }),
    );
  }

  await prisma.relatorio.upsert({
    where: {
      alunoId_professorId_materiaId_turmaId_bimestreId: {
        alunoId: alunos[0].id,
        professorId: professor.id,
        materiaId: matematica.id,
        turmaId: turma.id,
        bimestreId: bimestres[0].id,
      },
    },
    update: {
      conteudo: 'Relatorio ficticio para validacao de fluxo. Nao usar dados reais em seeds.',
      status: 'RASCUNHO',
    },
    create: {
      conteudo: 'Relatorio ficticio para validacao de fluxo. Nao usar dados reais em seeds.',
      status: 'RASCUNHO',
      alunoId: alunos[0].id,
      professorId: professor.id,
      materiaId: matematica.id,
      turmaId: turma.id,
      bimestreId: bimestres[0].id,
    },
  });

  console.info('Seed de demonstracao concluido com dados ficticios.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
