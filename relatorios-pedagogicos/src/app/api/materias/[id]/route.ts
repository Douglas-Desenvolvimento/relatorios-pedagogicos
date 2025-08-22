// src/app/api/materias/[id]/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const materia = await prisma.materia.findUnique({
      where: { id: Number(params.id) },
      include: {
        professores: {
          include: {
            turmas: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!materia) {
      return NextResponse.json(
        { error: 'Matéria não encontrada' },
        { status: 404 }
      );
    }

    // Transforma os dados para o formato desejado
    const professoresComTurmas = materia.professores.map(professor => ({
      id: professor.id,
      name: professor.name,
      turmas: professor.turmas.map(turma => turma.name)
    }));

    // Calcula o total de turmas únicas em toda a matéria
    const todasTurmas = materia.professores.flatMap(professor => 
      professor.turmas.map(turma => turma.name)
    );
    const totalTurmas = new Set(todasTurmas).size;

    return NextResponse.json({
      id: materia.id,
      name: materia.name,
      codigo: materia.codigo,
      professores: professoresComTurmas,
      totalProfessores: materia.professores.length,
      totalTurmas: totalTurmas
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da matéria:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar detalhes da matéria' },
      { status: 500 }
    );
  }
}