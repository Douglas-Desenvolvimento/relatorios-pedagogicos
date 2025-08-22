import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/turmas
/* export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const professorId = searchParams.get('professorId')
  
  const where = professorId ? { professorId: Number(professorId) } : {}

  const turmas = await prisma.turma.findMany({
    where,
    include: {
      materia: true,
      professor: true
    }
  })
  
  return NextResponse.json(turmas)
} */
export async function GET() {
  try {
    const turmas = await prisma.turma.findMany({
      include: {
      
        alunos: true
      
      }
    })
    return NextResponse.json(turmas)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar turmas' },
      { status: 500 }
    )
  }
}