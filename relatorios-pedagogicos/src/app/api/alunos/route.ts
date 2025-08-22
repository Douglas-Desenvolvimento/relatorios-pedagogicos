// GET /api/alunos?turmaId=123
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turmaId = searchParams.get('turmaId');

  if (!turmaId) {
    return NextResponse.json(
      { error: 'turmaId é obrigatório' },
      { status: 400 }
    );
  }

  const alunos = await prisma.aluno.findMany({
    where: { turmaId: Number(turmaId) },
    include: {
      turma: true, // <-- importante
      relatorios: {
        where: {
          turmaId: Number(turmaId)
        },
        include: {
          professor: true,
          materia: true,
          turma: true,
        }
      }
    }
  });

  return NextResponse.json(alunos);
}
