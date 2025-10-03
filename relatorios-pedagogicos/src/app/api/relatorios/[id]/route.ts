// app/api/relatorios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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