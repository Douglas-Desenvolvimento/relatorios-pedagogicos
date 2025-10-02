// src/app/api/relatorios/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validação do conteúdo do relatório
    if (!body.conteudo || body.conteudo.trim().length < 100) {
      return NextResponse.json(
        { error: 'O conteúdo do relatório deve ter no mínimo 100 caracteres.' },
        { status: 400 }
      );
    }

    const relatorio = await prisma.relatorio.update({
      where: { id: parseInt(params.id) },
      data: { 
        conteudo: body.conteudo,
        status: body.status || 'ENVIADO'
      },
      include: {
        aluno: { include: { turma: true } },
        professor: true,
        materia: true,
        turma: true
      }
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.relatorio.delete({
      where: { id: parseInt(params.id) }
    });

    return NextResponse.json({ message: "Relatório excluído com sucesso" });
  } catch (error) {
    console.error('Erro ao excluir relatório:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir relatório' },
      { status: 500 }
    );
  }
}