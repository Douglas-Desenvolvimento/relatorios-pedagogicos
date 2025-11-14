// src/app/api/relatorios/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const relatorios = await prisma.relatorio.findMany({
      where: {
        status: 'ENVIADO',
      },
      include: {
        aluno: {
          include: {
            turma: true
          }
        },
        professor: true,
        materia: true,
        turma: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📊 Relatórios retornados:', relatorios.length);

    return NextResponse.json(relatorios);
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar relatórios' },
      { status: 500 }
    );
  }
}

// ✅ ADICIONAR ESTE MÉTODO POST
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validação dos campos obrigatórios
    if (!body.conteudo || body.conteudo.trim().length === 0) {
      return NextResponse.json(
        { error: 'O conteúdo do relatório não pode estar vazio.' },
        { status: 400 }
      );
    }

    if (!body.bimestreId) {
      return NextResponse.json(
        { error: 'Bimestre é obrigatório.' },
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
        bimestreId: body.bimestreId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um relatório para este aluno nesta matéria, turma e bimestre.' },
        { status: 400 }
      );
    }

    // Criar relatório com status ENVIADO
    const relatorio = await prisma.relatorio.create({
      data: {
        conteudo: body.conteudo.trim(),
        alunoId: parseInt(body.alunoId),
        professorId: parseInt(body.professorId),
        materiaId: parseInt(body.materiaId),
        turmaId: parseInt(body.turmaId),
        bimestreId: parseInt(body.bimestreId),
        status: 'ENVIADO',
      },
      include: {
        aluno: {
          include: {
            turma: true
          }
        },
        professor: true,
        materia: true,
        turma: true,
        bimestre: true,
      },
    });

    console.log('✅ Relatório criado com sucesso:', relatorio.id);
    return NextResponse.json(relatorio);
  } catch (error: any) {
    console.error('❌ Erro ao criar relatório:', error);
    console.error('Detalhes do erro:', error.message);
    return NextResponse.json(
      { error: error.message || 'Falha ao criar relatório' },
      { status: 500 }
    );
  }
}