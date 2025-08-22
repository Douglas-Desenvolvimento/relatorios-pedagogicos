// src/app/api/materias/professor/[professorId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { professorId: string } }
) {
  try {
    const professorId = Number(params.professorId);
    if (isNaN(professorId)) {
      return NextResponse.json(
        { error: 'ID do professor inválido' },
        { status: 400 }
      );
    }

    const materias = await prisma.materia.findMany({
      where: {
        professores: {
          some: { id: professorId },
        },
      },
      select: {
        id: true,
        name: true,
        codigo: true,
        professores: {
          where: {
            id: professorId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    // Adiciona contagem de turmas para cada matéria, filtrando turmas que contenham a matéria e o professor
    const materiasComTurmas = await Promise.all(
      materias.map(async materia => ({
        ...materia,
        totalTurmas: await prisma.turma.count({
          where: {
            materias: {
              some: { id: materia.id }, // <-- aqui o ajuste principal
            },
            professores: {
              some: { id: professorId },
            },
          },
        }),
      }))
    );

    return NextResponse.json(materiasComTurmas);
  } catch (error) {
    console.error('Erro ao buscar matérias do professor:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar matérias do professor' },
      { status: 500 }
    );
  }
}
