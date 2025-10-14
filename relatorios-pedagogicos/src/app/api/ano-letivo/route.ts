// src/app/api/ano-letivo/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Listar anos letivos
export async function GET() {
  try {
    const anosLetivos = await prisma.anoLetivo.findMany({
      include: {
        _count: {
          select: {
            turmas: true,
            bimestres: true
          }
        }
      },
      orderBy: {
        ano: 'desc'
      }
    });

    return NextResponse.json(anosLetivos);
  } catch (error) {
    console.error('Erro ao buscar anos letivos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar anos letivos' },
      { status: 500 }
    );
  }
}

// POST - Criar novo ano letivo
export async function POST(request: Request) {
  try {
    const { ano } = await request.json();

    if (!ano || ano.length !== 4) {
      return NextResponse.json(
        { error: 'Ano inválido. Use formato YYYY (ex: 2025)' },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const existente = await prisma.anoLetivo.findUnique({
      where: { ano }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ano letivo já existe' },
        { status: 409 }
      );
    }

    // Criar ano letivo e seus 4 bimestres
    const anoLetivo = await prisma.anoLetivo.create({
      data: {
        ano,
        ativo: false,
        bimestres: {
          create: [
            { numero: 1, ativo: false },
            { numero: 2, ativo: false },
            { numero: 3, ativo: false },
            { numero: 4, ativo: false }
          ]
        }
      },
      include: {
        bimestres: true
      }
    });

    return NextResponse.json(anoLetivo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ano letivo:', error);
    return NextResponse.json(
      { error: 'Falha ao criar ano letivo' },
      { status: 500 }
    );
  }
}
