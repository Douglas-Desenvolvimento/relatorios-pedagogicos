import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRelatorios = searchParams.get('include') === 'relatorios';

    const professores = await prisma.professor.findMany({
      include: {
        materias: true,
        turmas: true,
        ...(includeRelatorios && {
          _count: {
            select: { relatorios: true }
          }
        })
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(professores)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar professores' },
      { status: 500 }
    )
  }
}