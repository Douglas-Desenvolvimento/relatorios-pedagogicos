// src/app/api/exportar-conceitos-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bimestreId, turmaId, quantidadeMinima = 8 } = body;

    if (!bimestreId) {
      return NextResponse.json(
        { error: 'Bimestre não especificado' },
        { status: 400 }
      );
    }

    // Buscar alunos com conceito RI
    const conceitosRI = await prisma.conceitoAlunoBimestre.findMany({
      where: {
        bimestreId: parseInt(bimestreId),
        conceito: 'RI',
        ...(turmaId && turmaId !== 'todas' && {
          aluno: {
            turma: {
              name: turmaId
            }
          }
        })
      },
      include: {
        aluno: {
          include: {
            turma: true,
            relatorios: {
              where: {
                bimestreId: parseInt(bimestreId)
              },
              include: {
                materia: true,
                professor: true,
                bimestre: true
              }
            }
          }
        },
        bimestre: {
          include: {
            anoLetivo: true
          }
        }
      }
    });

    // Processar e filtrar alunos baseado na quantidade mínima
    const alunosComDados = conceitosRI
      .filter(conceito => conceito.aluno.relatorios.length >= quantidadeMinima)
      .map(conceito => ({
        id: conceito.aluno.id,
        name: conceito.aluno.name,
        matricule: conceito.aluno.matricule,
        turma: conceito.aluno.turma.name,
        relatorios: conceito.aluno.relatorios
      }));

    if (alunosComDados.length === 0) {
      return NextResponse.json(
        { 
          error: `Nenhum aluno com ${quantidadeMinima}+ relatórios encontrado`,
          alunosTotal: conceitosRI.length 
        },
        { status: 404 }
      );
    }

    // Preparar dados para exportação
    const exportData = {
      alunos: alunosComDados,
      bimestre: conceitosRI[0]?.bimestre,
      turma: turmaId && turmaId !== 'todas' ? turmaId : 'Todas',
      quantidadeMinima
    };

    return NextResponse.json(exportData);

  } catch (error) {
    console.error('Erro ao preparar exportação:', error);
    return NextResponse.json(
      { error: 'Falha ao preparar dados para exportação' },
      { status: 500 }
    );
  }
}
