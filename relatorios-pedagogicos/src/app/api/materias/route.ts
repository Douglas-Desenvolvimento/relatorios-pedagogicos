// src/app/api/materias/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. Buscar todas as matérias com seus professores e contagem de relatórios
    const materias = await prisma.materia.findMany({
      include: {
        professores: {
          include: {
            turmas: {
              select: {
                id: true
              }
            }
          }
        },
        _count: {
          select: {
            relatorios: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 2. Processar os dados em memória
    const resultado = materias.map(materia => {
      // Coletar todas as turmas únicas dos professores desta matéria
      const turmasIds = new Set<number>();
      materia.professores.forEach(professor => {
        professor.turmas.forEach(turma => {
          turmasIds.add(turma.id);
        });
      });

      return {
        id: materia.id,
        name: materia.name,
        codigo: materia.codigo,
        totalProfessores: materia.professores.length,
        totalRelatorios: materia._count.relatorios,
        totalTurmas: turmasIds.size
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar matérias:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar matérias' },
      { status: 500 }
    );
  }
}