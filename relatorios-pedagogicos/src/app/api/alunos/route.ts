// app/api/alunos/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Mantido COMPATÍVEL com serviços existentes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turmaId = searchParams.get('turmaId');
  const includeRelatorios = searchParams.get('include') === 'relatorios';
  const includeCount = searchParams.get('include') === 'count';

  if (!turmaId) {
    return NextResponse.json(
      { error: 'turmaId é obrigatório' },
      { status: 400 }
    );
  }

  // Configuração base para incluir relatórios (como estava originalmente)
  const includeConfig: any = {
    turma: true,
  };

  // Se for para a aba Relatórios, inclui relatórios completos
  if (includeRelatorios) {
    includeConfig.relatorios = {
      where: {
        turmaId: Number(turmaId)
      },
      include: {
        professor: true,
        materia: true,
        turma: true,
      }
    };
  }

  // Se for para a aba Alunos, inclui apenas a contagem
  if (includeCount) {
    includeConfig._count = {
      select: {
        relatorios: true,
      },
    };
  }

  const alunos = await prisma.aluno.findMany({
    where: { turmaId: Number(turmaId) },
    include: includeConfig,
    orderBy: {
      name: 'asc' // ✅ ORDENAÇÃO ALFABÉTICA
    }
  });

  return NextResponse.json(alunos);
}

// POST - Criar aluno (não afeta o GET)
export async function POST(request: NextRequest) {
  try {
    const { name, matricule, turmaId } = await request.json();

    // Validar dados obrigatórios
    if (!name || !matricule || !turmaId) {
      return NextResponse.json(
        { error: 'Nome, matrícula e turma são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se turma existe
    const turmaExistente = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turmaExistente) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 400 }
      );
    }

    // Verificar se matrícula já existe
    const matriculaExistente = await prisma.aluno.findFirst({
      where: { matricule }
    });

    if (matriculaExistente) {
      return NextResponse.json(
        { error: 'Já existe um aluno com esta matrícula' },
        { status: 400 }
      );
    }

    // Criar aluno
    const aluno = await prisma.aluno.create({
      data: {
        name,
        matricule,
        turmaId,
        active: true,
      },
      include: {
        turma: true,
        _count: {
          select: {
            relatorios: true,
          },
        },
      },
    });

    return NextResponse.json(aluno);
  } catch (error) {
    console.error('Erro ao criar aluno:', error);
    return NextResponse.json(
      { error: 'Falha ao criar aluno' },
      { status: 500 }
    );
  }
}