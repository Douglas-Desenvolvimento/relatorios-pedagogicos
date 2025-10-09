// src/app/api/turmas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const turmaId = Number(id);

    if (isNaN(turmaId)) {
      return NextResponse.json(
        { error: 'ID da turma inválido' },
        { status: 400 }
      );
    }

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
      include: {
        alunos: {
          where: { active: true },
          include: {
            _count: {
              select: {
                relatorios: true
              }
            }
          }
        },
        professores: {
          include: {
            materias: true
          }
        },
        materias: true,
        _count: {
          select: {
            alunos: true,
            relatorios: true
          }
        }
      }
    });

    if (!turma) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(turma);
  } catch (error) {
    console.error('Erro ao buscar turma:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar turma' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const turmaId = Number(id);
    const { name, anoLetivo, materiasIds } = await request.json();

    if (isNaN(turmaId)) {
      return NextResponse.json(
        { error: 'ID da turma inválido' },
        { status: 400 }
      );
    }

    // Verificar se turma existe
    const turmaExistente = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turmaExistente) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se nome já existe (excluindo a própria turma)
    if (name && name !== turmaExistente.name) {
      const nomeExistente = await prisma.turma.findFirst({
        where: {
          name,
          id: { not: turmaId }
        }
      });

      if (nomeExistente) {
        return NextResponse.json(
          { error: 'Já existe uma turma com este nome' },
          { status: 400 }
        );
      }
    }

    // Preparar dados de matérias
    const materiasConnect = [];
    if (materiasIds && materiasIds.length > 0) {
      for (const materiaId of materiasIds) {
        const materiaExistente = await prisma.materia.findUnique({
          where: { id: materiaId }
        });
        if (materiaExistente) {
          materiasConnect.push({ id: materiaId });
        }
      }
    }

    // Atualizar turma
    const turma = await prisma.turma.update({
      where: { id: turmaId },
      data: {
        name: name || turmaExistente.name,
        anoLetivo: anoLetivo || turmaExistente.anoLetivo,
        materias: {
          set: materiasConnect
        }
      },
      include: {
        alunos: {
          where: { active: true }
        },
        professores: true,
        materias: true,
        _count: {
          select: {
            alunos: true,
            relatorios: true
          }
        }
      }
    });

    return NextResponse.json(turma);
  } catch (error) {
    console.error('Erro ao atualizar turma:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar turma' },
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
    const turmaId = Number(id);

    if (isNaN(turmaId)) {
      return NextResponse.json(
        { error: 'ID da turma inválido' },
        { status: 400 }
      );
    }

    // Verificar se turma existe
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turma) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se turma tem alunos
    const alunosCount = await prisma.aluno.count({
      where: { turmaId: turmaId }
    });

    if (alunosCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir turma com alunos vinculados' },
        { status: 400 }
      );
    }

    // Verificar se turma tem relatórios
    const relatoriosCount = await prisma.relatorio.count({
      where: { turmaId: turmaId }
    });

    if (relatoriosCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir turma com relatórios vinculados' },
        { status: 400 }
      );
    }

    await prisma.turma.delete({
      where: { id: turmaId }
    });

    return NextResponse.json({ message: 'Turma excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir turma:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir turma' },
      { status: 500 }
    );
  }
}