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
      // Coluna AJ (índice 35) = Conceito Global
      // A=0, B=1, C=2... Z=25, AA=26, AB=27, AC=28, AD=29, AE=30, AF=31, AG=32, AH=33, AI=34, AJ=35
      
      const matriculaIdx = 1; // Coluna B
      const conceitoIdx = 35; // Coluna AJ (CONFIRMADO: índice 35)
      
      console.log(`\n📋 Processando aba: "${sheetName}"`);
      console.log(`   Total de linhas: ${data.length}`);
      console.log(`   Total de colunas: ${headers.length}`);
      
      // Verificar se a coluna AJ existe
      if (headers.length <= 35) {
        console.log(`   ❌ Excel tem apenas ${headers.length} colunas, precisa ter pelo menos 36 para coluna AJ`);
        resultados.erros.push(`Aba "${sheetName}": Arquivo não tem coluna AJ (precisa ter 36+ colunas)`);
        continue;
      }
      
      // Log do header da coluna AJ
      const headerAJ = headers[35];
      console.log(`   Coluna AJ (índice 35): "${headerAJ}"`);
      
      // Log do header da coluna AI (deve ter "Conceito Global")
      const headerAI = headers[34];
      console.log(`   Coluna AI (índice 34): "${headerAI}"`);

      // Verificar se há dados válidos na linha 9+ (índice 8+)
      const primeiraLinhaDados = data[8];
      if (primeiraLinhaDados) {
        console.log(`   Primeira linha de dados (linha 9):`);
        console.log(`      Coluna B (matrícula): "${primeiraLinhaDados[1]}"`);
        console.log(`      Coluna AJ (conceito): "${primeiraLinhaDados[35]}"`);
      }
      
      const hasValidData = data.slice(8).some((row: any[]) => {
        const matricula = row[matriculaIdx];
        return matricula && String(matricula).trim();
      });

      if (!hasValidData) {
        console.log(`   ❌ Sem dados válidos a partir da linha 9`);
        resultados.erros.push(`Aba "${sheetName}": Sem dados de alunos (verificar se há dados a partir da linha 9)`);
        continue;
      }
      
      console.log(`   ✅ Estrutura validada, iniciando processamento...`);

      // Processar cada linha (aluno) - COMEÇAR NA LINHA 9 (índice 8)
      let processados = 0;
      let comConceito = 0;
      let comRI = 0;
      
      for (let i = 8; i < data.length; i++) {
        const row = data[i] as unknown[];
        const matriculaCell = row[matriculaIdx];
        
        const matricula = matriculaCell ? String(matriculaCell).trim() : '';
        if (!matricula) {
          console.log(`   Linha ${i + 1}: Sem matrícula, pulando...`);
          continue;
        }
        
        processados++;

        // Pegar conceito da coluna AJ (índice 35)
        let conceito = '';
        if (row.length > conceitoIdx) {
          const conceitoCell = row[conceitoIdx];
          conceito = conceitoCell ? String(conceitoCell).trim().toUpperCase() : '';
        }

        if (!conceito || conceito === '') {
          console.log(`   Linha ${i + 1} (${matricula}): Sem conceito na coluna AJ`);
          continue;
        }
        
        comConceito++;
        console.log(`   Linha ${i + 1} (${matricula}): Conceito = "${conceito}"`);

        // Validar conceito
        if (!['RI', 'MB', 'B', 'R'].includes(conceito)) {
          console.log(`   Linha ${i + 1} (${matricula}): Conceito "${conceito}" inválido, ignorando...`);
          continue;
        }
        
        if (conceito === 'RI') {
          comRI++;
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
      
      console.log(`\n   📊 Resumo da aba "${sheetName}":`);
      console.log(`      Total de linhas processadas: ${processados}`);
      console.log(`      Com conceito: ${comConceito}`);
      console.log(`      Com RI: ${comRI}`);
      console.log(`      Alunos atualizados nesta aba: ${comRI}\n`);
    }

    console.log(`\n🎉 IMPORTAÇÃO CONCLUÍDA`);
    console.log(`   Total processado: ${resultados.processados}`);
    console.log(`   Total atualizado: ${resultados.atualizados}`);
    console.log(`   Total de erros: ${resultados.erros.length}`);
    
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
