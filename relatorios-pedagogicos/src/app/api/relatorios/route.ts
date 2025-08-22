import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const relatorios = await prisma.relatorio.findMany({
      where: {
        status: 'ENVIADO', // apenas relatórios enviados
      },
      include: {
        aluno: true,
        professor: true,
        materia: true,
        turma: true,
      },
    });

    return NextResponse.json(relatorios);
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar relatórios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validação do conteúdo do relatório (mínimo 100 caracteres)
    if (!body.conteudo || body.conteudo.trim().length < 100) {
      return NextResponse.json(
        { error: 'O conteúdo do relatório deve ter no mínimo 100 caracteres.' },
        { status: 400 }
      );
    }

    // Verificar se já existe um relatório para essa combinação
    const existing = await prisma.relatorio.findFirst({
      where: {
        alunoId: body.alunoId,
        professorId: body.professorId,
        materiaId: body.materiaId,
        turmaId: body.turmaId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um relatório para este aluno nesta matéria e turma.' },
        { status: 400 }
      );
    }

    // Criar relatório com status ENVIADO
    const relatorio = await prisma.relatorio.create({
      data: {
        conteudo: body.conteudo,
        alunoId: body.alunoId,
        professorId: body.professorId,
        materiaId: body.materiaId,
        turmaId: body.turmaId,
        status: 'ENVIADO',
      },
    });

    return NextResponse.json(relatorio);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    return NextResponse.json(
      { error: 'Falha ao criar relatório' },
      { status: 500 }
    );
  }
}
