// src/app/api/turmas/[id]/alunos/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Adicione Promise aqui
) {
  try {
    // Extraia os parâmetros com await
    const { id } = await params;
    
    const alunos = await prisma.aluno.findMany({
      where: { turmaId: Number(id) },
      include: {
        relatorios: {
          where: {
            turmaId: Number(id)
          }
        }
      }
    })

    return NextResponse.json(alunos)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar alunos' },
      { status: 500 }
    )
  }
}