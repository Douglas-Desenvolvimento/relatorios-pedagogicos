// src/app/api/relatorios/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const relatorios = await prisma.relatorio.findMany({
      where: {
        status: 'ENVIADO',
      },
      include: {
        aluno: {
          include: {
            turma: true // Garante que a turma seja incluída
          }
        },
        professor: true,
        materia: true,
        turma: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📊 Relatórios retornados:', relatorios.length); // DEBUG

    return NextResponse.json(relatorios);
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar relatórios' },
      { status: 500 }
    );
  }
}