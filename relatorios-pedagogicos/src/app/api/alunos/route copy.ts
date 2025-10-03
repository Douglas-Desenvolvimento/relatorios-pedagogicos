import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turmaId = searchParams.get('turmaId');
  const includeRelatorios = searchParams.get('include') === 'relatorios';

  // Se não tem turmaId, retorna todos os alunos
  if (!turmaId) {
    const alunos = await prisma.aluno.findMany({
      where: { active: true },
      include: {
        turma: true,
        ...(includeRelatorios && {
          _count: {
            select: { relatorios: true }
          }
        })
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(alunos);
  }

  // Se tem turmaId, filtra por turma
  const alunos = await prisma.aluno.findMany({
    where: { 
      turmaId: Number(turmaId),
      active: true 
    },
    include: {
      turma: true,
      ...(includeRelatorios && {
        _count: {
          select: { relatorios: true }
        }
      })
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json(alunos);
}