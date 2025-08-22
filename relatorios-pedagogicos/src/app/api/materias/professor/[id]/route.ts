// src/app/api/materias/professor/[professorId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ professorId: string }> }
) {
  try {
    // Extraia os parâmetros com await
    const params = await context.params;
    const professorId = params.professorId;
    
    const professorIdNum = Number(professorId);
    if (isNaN(professorIdNum)) {
      return NextResponse.json(
        { error: 'ID do professor inválido' },
        { status: 400 }
      );
    }

    // Resto do código permanece igual...
    const materias = await prisma.materia.findMany({
      where: {
        professores: {
          some: { id: professorIdNum },
        },
      },
      select: {
        id: true,
        name: true,
        codigo: true,
        professores: {
          where: {
            id: professorIdNum,
          },
          select: {
            id: true,
          },
        },
      },
    });

    const materiasComTurmas = await Promise.all(
      materias.map(async materia => ({
        ...materia,
        totalTurmas: await prisma.turma.count({
          where: {
            materias: {
              some: { id: materia.id },
            },
            professores: {
              some: { id: professorIdNum },
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