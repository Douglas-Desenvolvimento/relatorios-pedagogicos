// src/app/api/bimestre/[id]/ativar/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT - Ativar bimestre (desativa os outros do mesmo ano)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Buscar o bimestre para pegar o anoLetivoId
    const bimestre = await prisma.bimestre.findUnique({
      where: { id }
    });

    if (!bimestre) {
      return NextResponse.json(
        { error: 'Bimestre não encontrado' },
        { status: 404 }
      );
    }

    // Desativar todos os bimestres do mesmo ano
    await prisma.bimestre.updateMany({
      where: { anoLetivoId: bimestre.anoLetivoId },
      data: { ativo: false }
    });

    // Ativar o bimestre selecionado
    const bimestreAtivado = await prisma.bimestre.update({
      where: { id },
      data: { ativo: true }
    });

    return NextResponse.json(bimestreAtivado);
  } catch (error) {
    console.error('Erro ao ativar bimestre:', error);
    return NextResponse.json(
      { error: 'Falha ao ativar bimestre' },
      { status: 500 }
    );
  }
}
