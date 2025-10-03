// app/api/alunos/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET existente - mantido igual
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turmaId = searchParams.get('turmaId');
  const includeRelatorios = searchParams.get('include') === 'relatorios';

  if (!turmaId) {
    return NextResponse.json(
      { error: 'turmaId é obrigatório' },
      { status: 400 }
    );
  }

  const alunos = await prisma.aluno.findMany({
    where: { turmaId: Number(turmaId) },
    include: {
      turma: true, // <-- importante
      ...(includeRelatorios && {
        relatorios: {
          where: {
            turmaId: Number(turmaId)
          },
          include: {
            professor: true,
            materia: true,
            turma: true,
          }
        }
      }),
      _count: {
        select: {
          relatorios: true,
        },
      },
    }
  });

  return NextResponse.json(alunos);
}

// NOVO: POST para criar aluno
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
        active: true, // Sempre ativo por padrão
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