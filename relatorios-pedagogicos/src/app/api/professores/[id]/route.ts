// src/app/api/professores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const professorId = Number(context.params.id); // ✅ agora está certo

    if (isNaN(professorId)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    const professor = await prisma.professor.findUnique({
      where: { id: professorId },
      include: {
        materias: {
          include: {
            turmas: {
              where: {
                professores: {
                  some: { id: professorId },
                },
              },
              include: {
                alunos: {
                  include: {
                    relatorios: true,
                  },
                },
              },
            },
          },
        },
        turmas: {
          where: {
            professores: {
              some: { id: professorId },
            },
          },
          include: {
            alunos: {
              include: {
                relatorios: true,
              },
            },
            materias: true,
          },
        },
      },
    });

    if (!professor) {
      return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 });
    }

    return NextResponse.json(professor);
  } catch (error) {
    console.error('Erro ao buscar professor:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar professor' }, { status: 500 });
  }
}
