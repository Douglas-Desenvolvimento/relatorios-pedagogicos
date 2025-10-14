// src/app/api/conceitos-bimestre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/conceitos-bimestre
 * Retorna conceitos dos alunos para um bimestre específico
 * Query params: turmaId (opcional), bimestreId (obrigatório)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const turmaId = searchParams.get('turmaId');
    const bimestreId = searchParams.get('bimestreId');

    if (!bimestreId) {
      return NextResponse.json(
        { error: 'bimestreId é obrigatório' },
        { status: 400 }
      );
    }

    const where: any = {
      bimestreId: parseInt(bimestreId),
    };

    // Se turmaId fornecido, filtrar por alunos dessa turma
    if (turmaId) {
      where.aluno = {
        turmaId: parseInt(turmaId),
      };
    }

    const conceitos = await prisma.conceitoAlunoBimestre.findMany({
      where,
      include: {
        aluno: {
          select: {
            id: true,
            name: true,
            matricule: true,
            turmaId: true,
          },
        },
        bimestre: {
          select: {
            id: true,
            numero: true,
            anoLetivo: {
              select: {
                id: true,
                ano: true,
              },
            },
          },
        },
      },
      orderBy: {
        aluno: {
          name: 'asc',
        },
      },
    });

    // Formatar resposta
    const response = conceitos.map((c) => ({
      id: c.id,
      alunoId: c.alunoId,
      aluno: c.aluno,
      bimestreId: c.bimestreId,
      bimestre: c.bimestre,
      conceito: c.conceito,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar conceitos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conceitos do bimestre' },
      { status: 500 }
    );
  }
}
