// src/app/api/professores/[professorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashMatricula } from '@/lib/matriculaHash';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ professorId: string }> } // CORRIGIDO: professorId
) {
  try {
    const { professorId } = await params; // CORRIGIDO: professorId
    const professorIdNum = Number(professorId); // CORRIGIDO: professorId

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    const professor = await prisma.professor.findUnique({
      where: { id: professorIdNum },
      include: {
        materias: {
          include: {
            turmas: {
              where: {
                professores: {
                  some: { id: professorIdNum },
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
              some: { id: professorIdNum },
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
        relatorios: {
          include: {
            aluno: {
              include: {
                turma: true
              }
            },
            materia: true,
            turma: true
          }
        },
        _count: {
          select: {
            relatorios: true
          }
        }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> } // CORRIGIDO: professorId
) {
  try {
    const { professorId } = await params; // CORRIGIDO: professorId
    const professorIdNum = Number(professorId); // CORRIGIDO: professorId
    const { name, email, matricula, turmaIds, materiaIds } = await request.json();

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // Verificar se professor existe
    const professorExistente = await prisma.professor.findUnique({
      where: { id: professorIdNum }
    });

    if (!professorExistente) {
      return NextResponse.json(
        { error: 'Professor não encontrado' },
        { status: 404 }
      );
    }

    // ... resto do código igual (mas usando professorIdNum)
  } catch (error) {
    console.error('Erro ao atualizar professor:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar professor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> } // CORRIGIDO: professorId
) {
  try {
    const { professorId } = await params; // CORRIGIDO: professorId
    const professorIdNum = Number(professorId); // CORRIGIDO: professorId

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // ... resto do código igual (mas usando professorIdNum)
  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir professor' },
      { status: 500 }
    );
  }
}