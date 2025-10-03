// src/app/api/professores/[professorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashMatricula } from '@/lib/matriculaHash';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const professorId = Number(id);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const professorId = Number(id);
    const { name, email, matricula, turmaIds, materiaIds } = await request.json();

    if (isNaN(professorId)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // Verificar se professor existe
    const professorExistente = await prisma.professor.findUnique({
      where: { id: professorId }
    });

    if (!professorExistente) {
      return NextResponse.json(
        { error: 'Professor não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se email já existe (excluindo o próprio professor)
    if (email && email !== professorExistente.email) {
      const emailExistente = await prisma.professor.findFirst({
        where: {
          email,
          id: { not: professorId }
        }
      });

      if (emailExistente) {
        return NextResponse.json(
          { error: 'Já existe um professor com este email' },
          { status: 400 }
        );
      }
    }

    // Preparar dados de conexão - VERIFICAR se turmas e matérias existem
    const turmasConnect = [];
    if (turmaIds && turmaIds.length > 0) {
      for (const turmaId of turmaIds) {
        const turmaExistente = await prisma.turma.findUnique({
          where: { id: turmaId }
        });
        if (turmaExistente) {
          turmasConnect.push({ id: turmaId });
        }
      }
    }

    const materiasConnect = [];
    if (materiaIds && materiaIds.length > 0) {
      for (const materiaId of materiaIds) {
        const materiaExistente = await prisma.materia.findUnique({
          where: { id: materiaId }
        });
        if (materiaExistente) {
          materiasConnect.push({ id: materiaId });
        }
      }
    }

    // Criar hash da matrícula se fornecida
    const matriculaHash = matricula ? hashMatricula(matricula) : null;

    // Atualizar professor com relacionamentos
    const professor = await prisma.professor.update({
      where: { id: professorId },
      data: {
        name: name || professorExistente.name,
        email: email || professorExistente.email,
        matricula: matricula !== undefined ? matricula : professorExistente.matricula,
        matricula_hash: matriculaHash,
        turmas: {
          set: turmasConnect
        },
        materias: {
          set: materiasConnect
        }
      },
      include: {
        turmas: true,
        materias: true
      }
    });

    // 🔄 CRIAR/ATUALIZAR RELAÇÕES MATÉRIA-TURMA AUTOMATICAMENTE (como no script)
    for (const turma of turmasConnect) {
      for (const materia of materiasConnect) {
        // Verificar se a relação já existe
        const relacaoExistente = await prisma.turma.findFirst({
          where: { 
            id: turma.id,
            materias: {
              some: { id: materia.id }
            }
          }
        });

        if (!relacaoExistente) {
          await prisma.turma.update({
            where: { id: turma.id },
            data: {
              materias: {
                connect: { id: materia.id }
              }
            }
          });
          console.info(`🔗 Relação criada: Turma ${turma.id} ↔ Matéria ${materia.id}`);
        }
      }
    }

    return NextResponse.json(professor);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const professorId = Number(id);

    if (isNaN(professorId)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // Verificar se professor existe
    const professor = await prisma.professor.findUnique({
      where: { id: professorId }
    });

    if (!professor) {
      return NextResponse.json(
        { error: 'Professor não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se professor tem relatórios
    const relatoriosCount = await prisma.relatorio.count({
      where: { professorId: professorId }
    });

    if (relatoriosCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir professor com relatórios vinculados' },
        { status: 400 }
      );
    }

    await prisma.professor.delete({
      where: { id: professorId }
    });

    return NextResponse.json({ message: 'Professor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir professor' },
      { status: 500 }
    );
  }
}