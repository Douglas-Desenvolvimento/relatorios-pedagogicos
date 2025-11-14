// src/app/api/professores/[professorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashMatricula } from '@/lib/matriculaHash';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ professorId: string }> }
) {
  try {
    const { professorId } = await params;
    const professorIdNum = Number(professorId);

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    const professor = await prisma.professor.findUnique({
      where: { id: professorIdNum },
      include: {
        materias: {
          include: {
            turmas: {
              where: {
                professores: {
                  some: { id: professorIdNum },
                },
              },
              include: {
                alunos: {
                  include: {
                    relatorios: true,
                  },
                },
              },
            },
          },
        },
        turmas: {
          where: {
            professores: {
              some: { id: professorIdNum },
            },
          },
          include: {
            alunos: {
              include: {
                relatorios: true,
              },
            },
            materias: true,
          },
        },
        relatorios: {
          include: {
            aluno: {
              include: {
                turma: true
              }
            },
            materia: true,
            turma: true
          }
        },
        _count: {
          select: {
            relatorios: true
          }
        }
      },
    });

    if (!professor) {
      return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 });
    }

    return NextResponse.json(professor);
  } catch (error) {
    console.error('Erro ao buscar professor:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar professor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> }
) {
  try {
    const { professorId } = await params;
    const professorIdNum = Number(professorId);
    const { name, email, matricula, login, turmaIds, materiaIds } = await request.json();

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // Verificar se professor existe
    const professorExistente = await prisma.professor.findUnique({
      where: { id: professorIdNum }
    });

    if (!professorExistente) {
      return NextResponse.json(
        { error: 'Professor não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se email já existe (excluindo o próprio professor)
    if (email && email !== professorExistente.email) {
      const emailExistente = await prisma.professor.findFirst({
        where: {
          email,
          id: { not: professorIdNum }
        }
      });

      if (emailExistente) {
        return NextResponse.json(
          { error: 'Já existe um professor com este email' },
          { status: 400 }
        );
      }
    }

    // Verificar se matrícula já existe (excluindo o próprio professor)
    if (matricula && matricula !== professorExistente.matricula) {
      const matriculaExistente = await prisma.professor.findFirst({
        where: {
          matricula,
          id: { not: professorIdNum }
        }
      });

      if (matriculaExistente) {
        return NextResponse.json(
          { error: 'Já existe um professor com esta matrícula' },
          { status: 400 }
        );
      }
    }

    // Preparar dados de conexão - VERIFICAR se turmas e matérias existem
    const turmasConnect = [];
    if (turmaIds && turmaIds.length > 0) {
      for (const turmaId of turmaIds) {
        const turmaExistente = await prisma.turma.findUnique({
          where: { id: turmaId }
        });
        if (turmaExistente) {
          turmasConnect.push({ id: turmaId });
        }
      }
    }

    const materiasConnect = [];
    if (materiaIds && materiaIds.length > 0) {
      for (const materiaId of materiaIds) {
        const materiaExistente = await prisma.materia.findUnique({
          where: { id: materiaId }
        });
        if (materiaExistente) {
          materiasConnect.push({ id: materiaId });
        }
      }
    }

    // Criar hash da matrícula se fornecida
    const matriculaHash = matricula ? hashMatricula(matricula) : null;

    // Validar e gerar login se fornecido
    let loginFinal = professorExistente.login;
    if (login !== undefined && login !== professorExistente.login) {
      if (login.trim()) {
        // Verificar se login já existe
        const loginExistente = await prisma.professor.findFirst({
          where: {
            login: login.trim(),
            id: { not: professorIdNum }
          }
        });
        
        if (loginExistente) {
          return NextResponse.json(
            { error: 'Já existe um professor com este login' },
            { status: 400 }
          );
        }
        
        loginFinal = login.trim();
      } else {
        // Gerar novo login se vazio
        const { gerarLogin } = await import('@/lib/loginGenerator');
        loginFinal = await gerarLogin(name || professorExistente.name);
      }
    }

    // Atualizar professor com relacionamentos
    const professor = await prisma.professor.update({
      where: { id: professorIdNum },
      data: {
        name: name || professorExistente.name,
        email: email || professorExistente.email,
        matricula: matricula !== undefined ? matricula : professorExistente.matricula,
        matricula_hash: matriculaHash,
        login: loginFinal,
        turmas: {
          set: turmasConnect
        },
        materias: {
          set: materiasConnect
        }
      },
      include: {
        turmas: true,
        materias: true
      }
    });

    // 🔄 CRIAR/ATUALIZAR RELAÇÕES MATÉRIA-TURMA AUTOMATICAMENTE (como no script)
    for (const turma of turmasConnect) {
      for (const materia of materiasConnect) {
        // Verificar se a relação já existe
        const relacaoExistente = await prisma.turma.findFirst({
          where: { 
            id: turma.id,
            materias: {
              some: { id: materia.id }
            }
          }
        });

        if (!relacaoExistente) {
          await prisma.turma.update({
            where: { id: turma.id },
            data: {
              materias: {
                connect: { id: materia.id }
              }
            }
          });
          console.info(`🔗 Relação criada: Turma ${turma.id} ↔ Matéria ${materia.id}`);
        }
      }
    }

    return NextResponse.json(professor);
  } catch (error) {
    console.error('Erro ao atualizar professor:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar professor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ professorId: string }> }
) {
  try {
    const { professorId } = await params;
    const professorIdNum = Number(professorId);

    if (isNaN(professorIdNum)) {
      return NextResponse.json({ error: 'ID do professor inválido' }, { status: 400 });
    }

    // Verificar se professor existe
    const professor = await prisma.professor.findUnique({
      where: { id: professorIdNum }
    });

    if (!professor) {
      return NextResponse.json(
        { error: 'Professor não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se professor tem relatórios
    const relatoriosCount = await prisma.relatorio.count({
      where: { professorId: professorIdNum }
    });

    if (relatoriosCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir professor com relatórios vinculados' },
        { status: 400 }
      );
    }

    await prisma.professor.delete({
      where: { id: professorIdNum }
    });

    return NextResponse.json({ message: 'Professor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir professor' },
      { status: 500 }
    );
  }
}