// src/app/api/professores/me/route.ts - COM ORDENAÇÃO
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const token = await getToken();
    
    if (!token || token.role !== 'PROFESSOR') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const professorId = parseInt(token.sub);

    // Busca o professor com suas turmas e matérias RELACIONADAS E ORDENADAS
    const professor = await prisma.professor.findUnique({
      where: { 
        id: professorId 
      },
      include: {
        // Matérias que o professor realmente leciona - ORDENADAS
        materias: {
          orderBy: { name: 'asc' }, // ✅ ORDENA MATÉRIAS
          include: {
            // Turmas específicas onde o professor leciona essa matéria - ORDENADAS
            turmas: {
              where: {
                professores: {
                  some: {
                    id: professorId
                  }
                }
              },
              orderBy: { name: 'asc' }, // ✅ ORDENA TURMAS
              include: {
                alunos: {
                  where: { active: true },
                  orderBy: { name: 'asc' },
                  include: {
                    relatorios: {
                      where: {
                        professorId: professorId,
                        materiaId: { in: [] }
                      },
                      select: {
                        id: true,
                        status: true,
                        professorId: true,
                        materiaId: true,
                        createdAt: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        // Turmas diretas do professor (backup) - ORDENADAS
        turmas: {
          orderBy: { name: 'asc' }, // ✅ ORDENA TURMAS DIRETAS
          include: {
            alunos: {
              where: { active: true },
              orderBy: { name: 'asc' },
              include: {
                relatorios: {
                  where: {
                    professorId: professorId
                  },
                  select: {
                    id: true,
                    status: true,
                    professorId: true,
                    materiaId: true,
                    createdAt: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!professor) {
      return NextResponse.json({ error: "Professor não encontrado" }, { status: 404 });
    }

    // Processa os dados para garantir estrutura consistente E ORDENADA
    const professorProcessado = {
      ...professor,
      materias: professor.materias.map(materia => ({
        ...materia,
        turmas: (materia.turmas || []).sort((a, b) => a.name.localeCompare(b.name)) // ✅ ORDENAÇÃO EXTRA
      })).sort((a, b) => a.name.localeCompare(b.name)) // ✅ ORDENAÇÃO EXTRA MATÉRIAS
    };

    return NextResponse.json(professorProcessado);

  } catch (error) {
    console.error("Erro ao buscar dados do professor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}