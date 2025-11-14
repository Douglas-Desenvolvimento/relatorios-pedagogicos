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
      let matriculaIdx = -1;
      let conceitoIdx = -1;
      
      // Procurar coluna de matrícula (primeira coluna geralmente)
      for (let i = 0; i < Math.min(headers.length, 5); i++) {
        const h = headers[i];
        if (typeof h === 'string') {
          const lower = h.toLowerCase().trim();
          if (lower.includes('matrícula') || lower.includes('matricula') || 
              lower.includes('nº') || lower.includes('numero') ||
              lower.includes('aluno') || lower === 'mat' || lower === 'n°') {
            matriculaIdx = i;
            break;
          }
        }
      }
      
      // Se não encontrou, assume coluna A (índice 0)
      if (matriculaIdx === -1 && headers.length > 0) {
        matriculaIdx = 0;
      }
      
      // Procurar coluna de "Conceito Global" (coluna P = índice 15)
      // Baseado no Excel real: Coluna A = matrícula, Coluna P = Conceito Global
      if (headers.length > 15) {
        const headerP = headers[15];
        if (typeof headerP === 'string' && 
            (headerP.toLowerCase().includes('conceito') || headerP.toLowerCase().includes('global'))) {
          conceitoIdx = 15;
        }
      }
      
      // Se não encontrou na coluna P, procurar por nome em qualquer coluna
      if (conceitoIdx === -1) {
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i];
          if (typeof h === 'string') {
            const lower = h.toLowerCase().trim();
            if ((lower.includes('conceito') && lower.includes('global')) || 
                lower === 'conceito global' || lower.includes('cg')) {
              conceitoIdx = i;
              break;
            }
          }
        }
      }

      // Verificar se há dados válidos antes de rejeitar
      const hasValidData = data.slice(1).some((row: any[]) => {
        const matricula = row[matriculaIdx];
        return matricula && String(matricula).trim();
      });

      if (matriculaIdx === -1 || !hasValidData) {
        resultados.erros.push(`Aba "${sheetName}": Coluna de matrícula não encontrada ou sem dados`);
        continue;
      }
      
      if (conceitoIdx === -1) {
        console.log(`⚠️  Aba "${sheetName}": Coluna "Conceito Global" não encontrada (coluna P). Procurando conceitos nas matérias...`);
        // Não rejeitar a aba, apenas avisar que não tem conceito global
        // Continue processando para ver se algum aluno tem RI nas matérias
      }

      // Processar cada linha (aluno)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as unknown[];
        const matriculaCell = row[matriculaIdx];
        
        const matricula = matriculaCell ? String(matriculaCell).trim() : '';
        if (!matricula) continue;

        // Verificar conceito global
        let conceito = '';
        if (conceitoIdx !== -1) {
          const conceitoCell = row[conceitoIdx];
          conceito = conceitoCell ? String(conceitoCell).trim().toUpperCase() : '';
        }
        
        // Se não tem conceito global, verificar se há RI em alguma matéria (colunas C em diante)
        if (!conceito || conceito === '') {
          for (let colIdx = 2; colIdx < Math.min(row.length, 20); colIdx++) {
            const cellValue = row[colIdx];
            if (cellValue) {
              const value = String(cellValue).trim().toUpperCase();
              if (value === 'RI') {
                conceito = 'RI';
                break;
              }
            }
          }
        }

        if (!conceito) continue;

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
