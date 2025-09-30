// src/app/api/professores/me/route.ts
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

    // Busca o professor com suas turmas e matérias RELACIONADAS
    const professor = await prisma.professor.findUnique({
      where: { 
        id: professorId 
      },
      include: {
        // Matérias que o professor realmente leciona
        materias: {
          include: {
            // Turmas específicas onde o professor leciona essa matéria
            turmas: {
              where: {
                professores: {
                  some: {
                    id: professorId
                  }
                }
              },
              include: {
                alunos: {
                  where: { active: true },
                  orderBy: { name: 'asc' },
                  include: {
                    relatorios: {
                      where: {
                        professorId: professorId,
                        materiaId: { in: [] } // Será filtrado por matéria depois
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
        // Turmas diretas do professor (backup)
        turmas: {
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

    // Processa os dados para garantir estrutura consistente
    const professorProcessado = {
      ...professor,
      materias: professor.materias.map(materia => ({
        ...materia,
        turmas: materia.turmas || []
      }))
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