// src/app/api/dashboard/alunos-ri/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bimestreId = searchParams.get('bimestreId');
    const quantidadeMinima = parseInt(searchParams.get('quantidadeMinima') || '8');

    if (!bimestreId) {
      return NextResponse.json(
        { error: 'Bimestre não especificado' },
        { status: 400 }
      );
    }

    // Buscar alunos com conceito RI no bimestre especificado
    const conceitosRI = await prisma.conceitoAlunoBimestre.findMany({
      where: {
        bimestreId: parseInt(bimestreId),
        conceito: 'RI'
      },
      include: {
        aluno: {
          include: {
            turma: {
              include: {
                materias: {
                  include: {
                    professores: true
                  }
                }
              }
            },
            relatorios: {
              where: {
                bimestreId: parseInt(bimestreId)
              },
              include: {
                materia: true,
                professor: true
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

    // Processar dados para facilitar visualização
    const alunosComRI = conceitosRI.map(conceito => {
      const aluno = conceito.aluno;
      const turma = aluno.turma;
      
      // Mapear matérias da turma com seus professores
      const materiasEsperadas = turma.materias.map(materia => ({
        id: materia.id,
        nome: materia.name,
        professores: materia.professores.map(p => ({
          id: p.id,
          nome: p.name
        }))
      }));

      // Verificar quais relatórios foram criados
      const relatoriosCriados = aluno.relatorios.map(rel => ({
        materiaId: rel.materiaId,
        materiaNome: rel.materia.name,
        professorId: rel.professorId,
        professorNome: rel.professor.name,
        status: rel.status,
        criadoEm: rel.createdAt
      }));

      // Identificar relatórios faltantes
      const relatoriosFaltantes = materiasEsperadas.filter(materia => {
        return !relatoriosCriados.some(rel => rel.materiaId === materia.id);
      });

      // Status baseado na quantidade mínima configurada
      const temMinimoRelatorios = relatoriosCriados.length >= quantidadeMinima;
      const faltantesParaMinimo = Math.max(0, quantidadeMinima - relatoriosCriados.length);

      return {
        conceito: {
          id: conceito.id,
          bimestre: `${conceito.bimestre.numero}º Bimestre`,
          anoLetivo: conceito.bimestre.anoLetivo.ano
        },
        aluno: {
          id: aluno.id,
          nome: aluno.name,
          matricula: aluno.matricule,
          turma: turma.name
        },
        relatorios: {
          esperados: quantidadeMinima,
          criados: relatoriosCriados.length,
          faltantes: faltantesParaMinimo,
          detalheCriados: relatoriosCriados,
          detalheFaltantes: relatoriosFaltantes
        },
        statusGeral: temMinimoRelatorios ? 'COMPLETO' : 'PENDENTE'
      };
    });

    // Estatísticas gerais
    const stats = {
      totalAlunosRI: alunosComRI.length,
      comRelatoriosCompletos: alunosComRI.filter(a => a.statusGeral === 'COMPLETO').length,
      comRelatoriosPendentes: alunosComRI.filter(a => a.statusGeral === 'PENDENTE').length,
      totalRelatoriosFaltantes: alunosComRI.reduce((sum, a) => sum + a.relatorios.faltantes, 0)
    };

    return NextResponse.json({
      stats,
      alunos: alunosComRI
    });

  } catch (error) {
    console.error('Erro ao buscar alunos com RI:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar dados do dashboard' },
      { status: 500 }
    );
  }
}
