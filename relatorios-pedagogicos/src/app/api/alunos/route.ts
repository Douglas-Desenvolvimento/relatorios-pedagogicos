// app/api/alunos/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET - COM SUPORTE PARA FILTRAR RELATÓRIOS POR PROFESSOR E MATÉRIA
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turmaId = searchParams.get('turmaId');
  const includeParams = searchParams.get('include') || '';
  const includeRelatorios = includeParams.includes('relatorios');
  const includeConceitos = includeParams.includes('conceitos');
  const includeCount = includeParams === 'count';
  
  // NOVOS PARÂMETROS PARA FILTRAR RELATÓRIOS
  const professorId = searchParams.get('professorId');
  const materiaId = searchParams.get('materiaId');
  const bimestreId = searchParams.get('bimestreId');
  const status = searchParams.get('status') || 'ENVIADO';

  const includeConfig: any = {
    turma: true,
  };

  // Incluir conceitos se solicitado
  if (includeConceitos) {
    includeConfig.conceitos = {
      include: {
        bimestre: true
      }
    };
  }

  // Se for para a aba Relatórios, inclui relatórios com filtros
  if (includeRelatorios) {
    // CONSTRUIR FILTRO DINÂMICO PARA RELATÓRIOS
    const relatorioWhere: any = {
      status: status // Sempre filtrar por status ENVIADO por padrão
    };

    if (turmaId) relatorioWhere.turmaId = Number(turmaId);

    // ADICIONAR FILTROS SE FORNECIDOS
    if (professorId) relatorioWhere.professorId = Number(professorId);
    if (materiaId) relatorioWhere.materiaId = Number(materiaId);
    if (bimestreId) relatorioWhere.bimestreId = Number(bimestreId);

    includeConfig.relatorios = {
      where: relatorioWhere,
      include: {
        professor: true,
        materia: true,
        turma: true,
        bimestre: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
  }

  // Se for para a aba Alunos, inclui apenas a contagem
  if (includeCount) {
    includeConfig._count = {
      select: {
        relatorios: true,
      },
    };
  }

  try {
    const whereClause: any = {
      active: true // Só retorna alunos ativos
    };
    
    if (turmaId) {
      whereClause.turmaId = Number(turmaId);
    }

    const alunos = await prisma.aluno.findMany({
      where: whereClause,
      include: includeConfig,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(alunos);
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar alunos' },
      { status: 500 }
    );
  }
}

// POST - Criar aluno (mantido igual)
export async function POST(request: NextRequest) {
  try {
    const { name, matricule, turmaId } = await request.json();

    if (!name || !matricule || !turmaId) {
      return NextResponse.json(
        { error: 'Nome, matrícula e turma são obrigatórios' },
        { status: 400 }
      );
    }

    const turmaExistente = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turmaExistente) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 400 }
      );
    }

    const matriculaExistente = await prisma.aluno.findFirst({
      where: { matricule }
    });

    if (matriculaExistente) {
      return NextResponse.json(
        { error: 'Já existe um aluno com esta matrícula' },
        { status: 400 }
      );
    }

    const aluno = await prisma.aluno.create({
      data: {
        name,
        matricule,
        turmaId,
        active: true,
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
    console.error('Erro ao criar aluno:', error);
    return NextResponse.json(
      { error: 'Falha ao criar aluno' },
      { status: 500 }
    );
  }
}