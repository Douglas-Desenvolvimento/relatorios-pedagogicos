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

      if (data.length < 9) {
        resultados.erros.push(`Aba "${sheetName}": Sem dados suficientes (precisa ter pelo menos 9 linhas)`);
        continue;
      }

      // O Excel tem estrutura especial:
      // Linhas 1-6: Títulos e informações da escola
      // Linha 7: Cabeçalhos das matérias
      // Linha 8: Sub-cabeçalhos (N e F)
      // Linha 9+: Dados dos alunos
      
      // Ignoramos as primeiras 8 linhas e pegamos os dados a partir da linha 9
      const headers = data[7] as unknown[]; // Linha 8 (índice 7) tem os cabeçalhos
      
      // Encontrar índices das colunas importantes
      // Coluna B (índice 1) = Matrícula
      // Coluna AD (índice 29) = Conceito Global
      // A=0, B=1, C=2... Z=25, AA=26, AB=27, AC=28, AD=29
      
      const matriculaIdx = 1; // Coluna B
      let conceitoIdx = 29; // Coluna AD (A=0, B=1... AD=29)
      
      // Verificar se a coluna AD existe e tem o header esperado
      if (headers.length > 29) {
        const headerAD = headers[29];
        if (typeof headerAD === 'string') {
          const lower = headerAD.toLowerCase().trim();
          if (lower.includes('conceito') || lower.includes('global')) {
            console.log(`✅ Aba "${sheetName}": Encontrou "Conceito Global" na coluna AD (índice 29)`);
          }
        }
      } else {
        console.log(`⚠️  Aba "${sheetName}": Excel tem apenas ${headers.length} colunas, esperado pelo menos 30 para coluna AD`);
        conceitoIdx = -1;
      }

      // Verificar se há dados válidos na linha 9+ (índice 8+)
      const hasValidData = data.slice(8).some((row: any[]) => {
        const matricula = row[matriculaIdx];
        return matricula && String(matricula).trim();
      });

      if (!hasValidData) {
        resultados.erros.push(`Aba "${sheetName}": Sem dados de alunos (verificar se há dados a partir da linha 9)`);
        continue;
      }
      
      if (conceitoIdx === -1) {
        resultados.erros.push(`Aba "${sheetName}": Coluna AD (Conceito Global) não encontrada`);
        continue;
      }

      // Processar cada linha (aluno) - COMEÇAR NA LINHA 9 (índice 8)
      for (let i = 8; i < data.length; i++) {
        const row = data[i] as unknown[];
        const matriculaCell = row[matriculaIdx];
        
        const matricula = matriculaCell ? String(matriculaCell).trim() : '';
        if (!matricula) continue;

        // Pegar conceito da coluna AD
        let conceito = '';
        if (conceitoIdx !== -1 && row.length > conceitoIdx) {
          const conceitoCell = row[conceitoIdx];
          conceito = conceitoCell ? String(conceitoCell).trim().toUpperCase() : '';
        }

        if (!conceito || conceito === '') continue;

        // Validar conceito
        if (!['RI', 'MB', 'B', 'R'].includes(conceito)) {
          continue; // Ignora conceitos inválidos silenciosamente
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
