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

// POST - Criar nova matéria
export async function POST(request: Request) {
  try {
    const { name, codigo } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome da matéria é obrigatório' },
        { status: 400 }
      );
    }

    const materia = await prisma.materia.create({
      data: {
        name: name.trim(),
        codigo: codigo?.trim() || null
      }
    });

    return NextResponse.json(materia, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar matéria:', error);
    
    // Erro de nome duplicado
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe uma matéria com este nome' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Falha ao criar matéria' },
      { status: 500 }
    );
  }
}