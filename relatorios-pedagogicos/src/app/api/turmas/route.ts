import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get('include') === 'counts';

    const turmas = await prisma.turma.findMany({
      include: {
        alunos: {
          where: { active: true }
        },
        professores: true,
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