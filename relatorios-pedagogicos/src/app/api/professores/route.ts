import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const professores = await prisma.professor.findMany({
      include: {
        materias: true,
        turmas: true
      }
    })
    return NextResponse.json(professores)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar professores' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Implementar se necessário
  return NextResponse.json({ message: 'Method not implemented' }, { status: 501 })
}