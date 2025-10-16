// src/app/api/turmas/route.ts
import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get('include') === 'counts';

    const turmas = await prisma.turma.findMany({
      include: {
        anoLetivo: true,
        alunos: {
          where: { active: true }
        },
        professores: true,
        materias: true,
        ...(includeCounts && {
          _count: {
            select: {
              alunos: true,
              relatorios: true
            }
          }
        })
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(turmas)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar turmas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    // Validar dados obrigatórios - APENAS nome
    if (!name) {
      return NextResponse.json(
        { error: 'Nome da turma é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se nome já existe
    const turmaExistente = await prisma.turma.findFirst({
      where: { name }
    });

    if (turmaExistente) {
      return NextResponse.json(
        { error: 'Já existe uma turma com este nome' },
        { status: 400 }
      );
    }

    // Buscar ano letivo ativo ou usar o primeiro disponível
    const anoLetivoAtivo = await prisma.anoLetivo.findFirst({
      where: { ativo: true }
    });

    if (!anoLetivoAtivo) {
      return NextResponse.json(
        { error: 'Nenhum ano letivo ativo encontrado. Configure um ano letivo primeiro.' },
        { status: 400 }
      );
    }

    // Criar turma vinculada ao ano letivo ativo
    const turma = await prisma.turma.create({
      data: {
        name: name.toString(),
        anoLetivoId: anoLetivoAtivo.id
      },
      include: {
        alunos: true,
        professores: true,
        materias: true
      }
    });

    return NextResponse.json(turma);
  } catch (error) {
    console.error('Erro ao criar turma:', error);
    return NextResponse.json(
      { error: 'Falha ao criar turma' },
      { status: 500 }
    );
  }
}