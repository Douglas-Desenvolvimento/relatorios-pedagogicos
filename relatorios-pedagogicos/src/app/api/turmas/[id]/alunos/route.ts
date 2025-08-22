// src/app/api/turmas/[id]/alunos/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const alunos = await prisma.aluno.findMany({
      where: { turmaId: Number(params.id) },
      include: {
        relatorios: {
          where: {
            turmaId: Number(params.id)
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