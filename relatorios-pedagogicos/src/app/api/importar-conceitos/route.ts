// src/app/api/importar-conceitos/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bimestreId = parseInt(formData.get('bimestreId') as string);

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    if (isNaN(bimestreId)) {
      return NextResponse.json(
        { error: 'Bimestre não especificado' },
        { status: 400 }
      );
    }

    // Verificar se o bimestre existe
    const bimestre = await prisma.bimestre.findUnique({
      where: { id: bimestreId }
    });

    if (!bimestre) {
      return NextResponse.json(
        { error: 'Bimestre não encontrado' },
        { status: 404 }
      );
    }

    // Ler o arquivo Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    interface AlunoRI {
      matricula: string;
      nome: string;
      turma: string;
    }

    const resultados = {
      processados: 0,
      atualizados: 0,
      erros: [] as string[],
      alunosComRI: [] as AlunoRI[]
    };

    // Processar cada aba (turma)
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

      // Pular linha de cabeçalho
      if (data.length < 2) continue;

      const headers = data[0] as unknown[];
      
      // Encontrar índices das colunas importantes
      const matriculaIdx = headers.findIndex((h: unknown) => 
        typeof h === 'string' && (
          h?.toLowerCase().includes('matrícula') || 
          h?.toLowerCase().includes('matricula') ||
          h?.toLowerCase().includes('nº aluno')
        )
      );
      
      // Procurar coluna AJ (índice 35) ou por nome
      let conceitoIdx = 35; // Coluna AJ é índice 35 (A=0, B=1, ..., AJ=35)
      if (conceitoIdx >= headers.length) {
        // Se não existir coluna AJ, procurar por nome
        conceitoIdx = headers.findIndex((h: unknown) => 
          typeof h === 'string' && (
            h?.toLowerCase().includes('conceito') ||
            h?.toLowerCase().includes('ri') ||
            h?.toLowerCase().includes('global')
          )
        );
      }

      if (matriculaIdx === -1) {
        resultados.erros.push(`Aba "${sheetName}": Coluna de matrícula não encontrada`);
        continue;
      }
      
      if (conceitoIdx === -1 || conceitoIdx >= headers.length) {
        resultados.erros.push(`Aba "${sheetName}": Coluna AJ (conceito) não encontrada`);
        continue;
      }

      // Processar cada linha (aluno)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as unknown[];
        const matriculaCell = row[matriculaIdx];
        const conceitoCell = row[conceitoIdx];
        
        const matricula = matriculaCell ? String(matriculaCell).trim() : '';
        const conceito = conceitoCell ? String(conceitoCell).trim().toUpperCase() : '';

        if (!matricula || !conceito) continue;

        // Validar conceito
        if (!['RI', 'MB', 'B', 'R'].includes(conceito)) {
          resultados.erros.push(`Aluno ${matricula}: Conceito inválido "${conceito}"`);
          continue;
        }

        try {
          // Buscar aluno pela matrícula
          const aluno = await prisma.aluno.findUnique({
            where: { matricule: matricula }
          });

          if (!aluno) {
            resultados.erros.push(`Matrícula ${matricula} não encontrada no sistema`);
            continue;
          }

          // Criar ou atualizar conceito do aluno no bimestre
          await prisma.conceitoAlunoBimestre.upsert({
            where: {
              alunoId_bimestreId: {
                alunoId: aluno.id,
                bimestreId: bimestreId
              }
            },
            update: {
              conceito: conceito as 'RI' | 'MB' | 'B' | 'R'
            },
            create: {
              alunoId: aluno.id,
              bimestreId: bimestreId,
              conceito: conceito as 'RI' | 'MB' | 'B' | 'R'
            }
          });

          resultados.processados++;
          resultados.atualizados++;

          // Se for RI, adicionar à lista
          if (conceito === 'RI') {
            resultados.alunosComRI.push({
              matricula,
              nome: aluno.name,
              turma: sheetName
            });
          }

        } catch (error) {
          console.error(`Erro ao processar aluno ${matricula}:`, error);
          resultados.erros.push(`Erro ao processar aluno ${matricula}`);
        }
      }
    }

    return NextResponse.json({
      sucesso: true,
      ...resultados
    });

  } catch (error) {
    console.error('Erro ao importar conceitos:', error);
    return NextResponse.json(
      { error: 'Falha ao importar arquivo' },
      { status: 500 }
    );
  }
}
