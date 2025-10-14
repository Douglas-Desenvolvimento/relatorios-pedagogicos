// src/app/api/materias/[id]/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Adicione Promise aqui
) {
  try {
    // Extraia os parâmetros com await
    const { id } = await params;
    
    const materia = await prisma.materia.findUnique({
      where: { id: Number(id) },
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

// PUT - Atualizar matéria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, codigo } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome da matéria é obrigatório' },
        { status: 400 }
      );
    }
    
    const materiaAtualizada = await prisma.materia.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        codigo: codigo?.trim() || null
      }
    });
    
    return NextResponse.json(materiaAtualizada);
  } catch (error: any) {
    console.error('Erro ao atualizar matéria:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Matéria não encontrada' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe uma matéria com este nome' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Falha ao atualizar matéria' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar matéria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar se a matéria tem relatórios ou professores vinculados
    const materia = await prisma.materia.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            relatorios: true,
            professores: true,
            turmas: true
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

    if (materia._count.relatorios > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir matéria com relatórios associados' },
        { status: 409 }
      );
    }

    if (materia._count.professores > 0 || materia._count.turmas > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir matéria com professores ou turmas associadas' },
        { status: 409 }
      );
    }
    
    await prisma.materia.delete({
      where: { id: Number(id) }
    });
    
    return NextResponse.json({ message: 'Matéria deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar matéria:', error);
    return NextResponse.json(
      { error: 'Falha ao deletar matéria' },
      { status: 500 }
    );
  }
}