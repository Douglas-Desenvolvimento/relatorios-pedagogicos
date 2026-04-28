// app/api/alunos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const alunoId = parseInt(params.id);

    if (isNaN(alunoId)) {
      return NextResponse.json(
        { error: 'ID do aluno inválido' },
        { status: 400 }
      );
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: {
        turma: true,
        relatorios: {
          include: {
            professor: true,
            materia: true,
            turma: true,
          },
        },
        _count: {
          select: {
            relatorios: true,
          },
        },
      },
    });

    if (!aluno) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(aluno);
  } catch (error) {
    console.error('Erro ao buscar aluno:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar aluno' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const alunoId = parseInt(params.id);
    const { name, matricule, turmaId, dataNascimento, active } = await request.json();

    if (isNaN(alunoId)) {
      return NextResponse.json(
        { error: 'ID do aluno inválido' },
        { status: 400 }
      );
    }

    // Verificar se aluno existe
    const alunoExistente = await prisma.aluno.findUnique({
      where: { id: alunoId }
    });

    if (!alunoExistente) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se matrícula já existe (excluindo o próprio aluno)
    if (matricule && matricule !== alunoExistente.matricule) {
      const matriculaExistente = await prisma.aluno.findFirst({
        where: {
          matricule,
          id: { not: alunoId }
        }
      });

      if (matriculaExistente) {
        return NextResponse.json(
          { error: 'Já existe um aluno com esta matrícula' },
          { status: 400 }
        );
      }
    }

    // Verificar se turma existe (se for fornecida)
    if (turmaId) {
      const turmaExistente = await prisma.turma.findUnique({
        where: { id: turmaId }
      });

      if (!turmaExistente) {
        return NextResponse.json(
          { error: 'Turma não encontrada' },
          { status: 400 }
        );
      }
    }

    // Atualizar aluno
    const aluno = await prisma.aluno.update({
      where: { id: alunoId },
      data: {
        name: name || alunoExistente.name,
        matricule: matricule || alunoExistente.matricule,
        turmaId: turmaId || alunoExistente.turmaId,
        dataNascimento:
          dataNascimento === undefined
            ? alunoExistente.dataNascimento
            : dataNascimento
            ? new Date(dataNascimento)
            : null,
        active: active === undefined ? alunoExistente.active : Boolean(active),
      },
      include: {
        turma: true,
        _count: {
          select: {
            relatorios: true,
          },
        },
      },
    });

    return NextResponse.json(aluno);
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar aluno' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const alunoId = parseInt(params.id);

    if (isNaN(alunoId)) {
      return NextResponse.json(
        { error: 'ID do aluno inválido' },
        { status: 400 }
      );
    }

    // Verificar se aluno existe
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId }
    });

    if (!aluno) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se aluno tem relatórios
    const relatoriosCount = await prisma.relatorio.count({
      where: { alunoId: alunoId }
    });

    if (relatoriosCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir aluno com relatórios vinculados' },
        { status: 400 }
      );
    }

    await prisma.aluno.delete({
      where: { id: alunoId }
    });

    return NextResponse.json({ message: 'Aluno excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir aluno:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir aluno' },
      { status: 500 }
    );
  }
}