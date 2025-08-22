import {
  Professor as PrismaProfessor,
  Materia as PrismaMateria,
  Turma as PrismaTurma,
  Aluno as PrismaAluno,
  Relatorio as PrismaRelatorio,
} from '@prisma/client';

// Tipos básicos
export type Professor = PrismaProfessor;
export type Materia = PrismaMateria;
export type Turma = PrismaTurma;
export type Aluno = PrismaAluno;
export type Relatorio = PrismaRelatorio;

// Relatório com todas as relações necessárias para exportação de PPI
export interface RelatorioCompleto extends Relatorio {
  aluno: Aluno;
  professor: Professor;
  materia: Materia;
  turma: Turma;
}

// Aluno com relatorios já completos
export interface AlunoComRelatorios extends Aluno {
  turma?: Turma; // importante para exportação de PPI (nome e ano escolar)
  relatorios: RelatorioCompleto[];
}

// Turma com tudo (professores e alunos com relatorios)
export interface TurmaCompleta extends Turma {
  alunos: AlunoComRelatorios[];
  professores: Professor[];
  materia: Materia;
}

// Matéria com suas turmas e professores
export interface MateriaCompleta extends Materia {
  turmas: TurmaCompleta[];
  professores: Professor[];
}

// Professor com suas turmas e matérias
export interface ProfessorCompleto extends Professor {
  materias: MateriaCompleta[];
  turmas: TurmaCompleta[];
}
