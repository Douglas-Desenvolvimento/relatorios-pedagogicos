// app/api/professores/route.ts
import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { hashMatricula } from '@/lib/matriculaHash'
import { gerarLogin } from '@/lib/loginGenerator'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRelatorios = searchParams.get('include') === 'relatorios';

    const professores = await prisma.professor.findMany({
      include: {
        materias: true,
        turmas: true,
        ...(includeRelatorios && {
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
            select: { relatorios: true }
          }
        })
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(professores)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar professores' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, matricula, turmaIds, materiaIds } = await request.json();

    // Validar dados obrigatórios
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const professorExistente = await prisma.professor.findFirst({
      where: { email }
    });

    if (professorExistente) {
      return NextResponse.json(
        { error: 'Já existe um professor com este email' },
        { status: 400 }
      );
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

    // Gerar login automaticamente
    const login = await gerarLogin(name);

    // Criar professor com relacionamentos
    const professor = await prisma.professor.create({
      data: {
        name,
        email,
        matricula,
        matricula_hash: matriculaHash,
        login,
        turmas: {
          connect: turmasConnect
        },
        materias: {
          connect: materiasConnect
        }
      },
      include: {
        turmas: true,
        materias: true
      }
    });

    // 🔄 CRIAR RELAÇÕES MATÉRIA-TURMA AUTOMATICAMENTE (como no script)
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
    console.error('Erro ao criar professor:', error);
    return NextResponse.json(
      { error: 'Falha ao criar professor' },
      { status: 500 }
    );
  }
}