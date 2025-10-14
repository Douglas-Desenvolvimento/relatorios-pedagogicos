// src/app/api/ano-letivo/[id]/ativar/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT - Ativar ano letivo (desativa os outros)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Desativar todos os anos letivos
    await prisma.anoLetivo.updateMany({
      where: {},
      data: { ativo: false }
    });

    // Ativar o ano selecionado
    const anoLetivo = await prisma.anoLetivo.update({
      where: { id },
      data: { ativo: true },
      include: {
        bimestres: true
      }
    });

    return NextResponse.json(anoLetivo);
  } catch (error) {
    console.error('Erro ao ativar ano letivo:', error);
    return NextResponse.json(
      { error: 'Falha ao ativar ano letivo' },
      { status: 500 }
    );
  }
}
