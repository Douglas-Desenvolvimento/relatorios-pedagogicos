// app/api/relatorios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Nova sintaxe do Next.js - o params vem como propriedade separada
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // params agora é uma Promise
) {
  try {
    // Aguardar o params ser resolvido
    const params = await context.params;
    const { conteudo, status } = await request.json();
    
    const relatorio = await prisma.relatorio.update({
      where: { id: parseInt(params.id) },
      data: {
        conteudo,
        status,
      },
    });

    return NextResponse.json(relatorio);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar relatório' },
      { status: 500 }
    );
  }
}

// Também corrigir o DELETE
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    await prisma.relatorio.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Relatório excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir relatório:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir relatório' },
      { status: 500 }
    );
  }
}

// Se precisar do GET também, corrigir:
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: parseInt(params.id) },
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
    });

    if (!relatorio) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(relatorio);
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar relatório' },
      { status: 500 }
    );
  }
}