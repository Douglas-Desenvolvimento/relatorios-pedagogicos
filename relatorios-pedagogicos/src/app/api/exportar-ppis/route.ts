// src/app/api/exportar-ppis/route.ts - VERSÃO CORRIGIDA COM QUEBRAS DE LINHA
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// ✅ Função para determinar ano escolar baseado na turma
const getAnoEscolar = (turma: string): string => {
  if (!turma) return '';
  const prefix = turma.slice(0, 2);
  switch (prefix) {
    case '16': return '6º';
    case '17': return '7º';
    case '18': return '8º';
    case '19': return '9º';
    default: return '';
  }
};

// ✅ FUNÇÃO CORRIGIDA - Manter quebras de linha
function cleanText(text: string): string {
  if (!text) return '';
  
  // ✅ MANTER quebras de linha - substituir múltiplas quebras por uma única
  let cleaned = text.replace(/\n\s*\n/g, '\n\n'); // Manter parágrafos
  cleaned = cleaned.replace(/\n/g, '\n'); // Manter quebras simples
  
  // Remover caracteres não suportados pelo WinAnsi (exceto quebras de linha)
  cleaned = cleaned.replace(/[^\x20-\x7E\u00C0-\u00FF\n]/g, ' ');
  
  // Remover múltiplos espaços consecutivos (mas manter quebras)
  cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
  
  return cleaned.trim();
}

// ✅ FUNÇÃO MELHORADA - Respeitar quebras de linha existentes
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const cleanTextContent = cleanText(text);
  const lines: string[] = [];
  
  // ✅ SEPARAR por quebras de linha existentes primeiro
  const paragraphs = cleanTextContent.split('\n');
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) {
      // Linha vazia - manter como separador
      lines.push('');
      continue;
    }
    
    // Se a linha inteira já cabe, usar como está
    const paragraphWidth = font.widthOfTextAtSize(trimmedPara, fontSize);
    if (paragraphWidth <= maxWidth) {
      lines.push(trimmedPara);
      continue;
    }
    
    // Se não couber, quebrar por palavras
    const words = trimmedPara.split(' ');
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      
      // Testa se a palavra cabe sozinha na linha
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth) {
        // Se a palavra é muito longa, quebra ela
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        
        // Quebra a palavra longa em partes
        let tempWord = word;
        while (tempWord.length > 0) {
          let segment = '';
          for (let j = 0; j < tempWord.length; j++) {
            const testSegment = segment + tempWord[j];
            const segmentWidth = font.widthOfTextAtSize(testSegment, fontSize);
            if (segmentWidth <= maxWidth) {
              segment = testSegment;
            } else {
              break;
            }
          }
          if (segment) {
            lines.push(segment);
            tempWord = tempWord.slice(segment.length);
          } else {
            break;
          }
        }
        continue;
      }
      
      // Testa a linha atual + nova palavra
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // Se não couber, quebra a linha
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word;
      }
    }
    
    // Adiciona a última linha do parágrafo
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }
  
  return lines;
}

// ✅ Função para criar nome de arquivo
function criarNomeArquivo(nome: string): string {
  return `${nome?.trim() || 'Aluno'}.pdf`;
}

// ✅ Função para criar um PDF individual
async function createSinglePdf(alunoData: any): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.pdf');
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const firstPage = pdfDoc.getPages()[0];
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = firstPage.getSize();

  // Coordenadas - AJUSTADAS PARA CABER MAIS CONTEÚDO
  const campos = {
    nome: { x: 50, y: height - 155, size: 11 },
    ano: { x: 50, y: height - 220, size: 11 },
    turma: { x: 150, y: height - 220, size: 11 },
    materia: { x: 50, y: height - 285, size: 11 },
    professor: { x: 200, y: height - 285, size: 11 },
    bimestreX: { x: 495, y: height - 205, size: 11 },
    conteudo: { 
      x: 260, 
      y: height - 350, 
      size: 9, // ✅ REDUZIDO para caber mais
      maxWidth: 300, 
      lineHeight: 10, // ✅ REDUZIDO para caber mais
      maxLines: 45 // ✅ AJUSTADO para número real
    }
  };
  
  // Preencher campos
  if (alunoData.nome) {
    const cleanNome = cleanText(alunoData.nome);
    firstPage.drawText(cleanNome, { x: campos.nome.x, y: campos.nome.y, size: campos.nome.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.ano) {
    const cleanAno = cleanText(alunoData.ano);
    firstPage.drawText(cleanAno, { x: campos.ano.x, y: campos.ano.y, size: campos.ano.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.turma) {
    const cleanTurma = cleanText(alunoData.turma);
    firstPage.drawText(cleanTurma, { x: campos.turma.x, y: campos.turma.y, size: campos.turma.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.materia) {
    const cleanMateria = cleanText(alunoData.materia);
    firstPage.drawText(cleanMateria, { x: campos.materia.x, y: campos.materia.y, size: campos.materia.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.professor) {
    const cleanProfessor = cleanText(alunoData.professor);
    firstPage.drawText(cleanProfessor, { x: campos.professor.x, y: campos.professor.y, size: campos.professor.size, font, color: rgb(0, 0, 0) });
  }
  
  firstPage.drawText('X', { x: campos.bimestreX.x, y: campos.bimestreX.y, size: campos.bimestreX.size, font: fontBold, color: rgb(0, 0, 0) });
  
  // Conteúdo - COM SUPORTE A QUEBRAS DE LINHA
  if (alunoData.conteudo && alunoData.conteudo !== 'Relatório não informado.') {
    const lines = wrapText(alunoData.conteudo, campos.conteudo.maxWidth, font, campos.conteudo.size);
    
    let currentY = campos.conteudo.y;
    let linesDrawn = 0;
    
    for (const line of lines) {
      // Parar quando atingir o limite máximo OU chegar no final da página
      if (linesDrawn >= campos.conteudo.maxLines || currentY < 150) {
        break;
      }
      
      // Desenhar linha (linhas vazias são espaçamentos)
      if (line.trim() !== '') {
        firstPage.drawText(line, { 
          x: campos.conteudo.x, 
          y: currentY, 
          size: campos.conteudo.size, 
          font, 
          color: rgb(0, 0, 0) 
        });
        linesDrawn++;
      }
      
      currentY -= campos.conteudo.lineHeight;
    }
    
    console.log(`📝 ${alunoData.nome}: ${linesDrawn}/${lines.length} linhas desenhadas`);
    
    // Indicar se conteúdo foi truncado
    if (linesDrawn < lines.length) {
      firstPage.drawText('...[continua]', { 
        x: campos.conteudo.x, 
        y: currentY, 
        size: 8, 
        font, 
        color: rgb(0.5, 0.5, 0.5) 
      });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ✅ Função principal (mantida igual)
export async function POST(req: NextRequest) {
  try {
    const { alunos, quantidadeMinima = 0 } = await req.json();

    if (!Array.isArray(alunos)) {
      return NextResponse.json({ error: 'Formato inválido de alunos' }, { status: 400 });
    }

    const zip = new JSZip();
    let nomeTurmaFinal = 'turma';
    let documentosGerados = 0;

    for (const aluno of alunos) {
      const nome = aluno.name?.trim();
      const turma = aluno.turma?.name?.trim() || '';
      const ano = getAnoEscolar(turma);
      
      if (turma && nomeTurmaFinal === 'turma') nomeTurmaFinal = turma;

      const relatorios = aluno.relatorios || [];
      if (relatorios.length < quantidadeMinima) continue;

      // ✅ ESTRATÉGIA: 1 PDF por aluno com múltiplas páginas
      const mergedPdf = await PDFDocument.create();

      for (const relatorio of relatorios) {
        const professor = relatorio.professor?.name?.trim() || '';
        const materia = relatorio.materia?.name?.trim() || '';
        const conteudo = relatorio.conteudo?.trim() || '';

        const dados = {
          nome: nome || 'Nome não informado',
          turma: turma || 'Turma não informada',
          ano: ano || 'Ano não informado',
          professor: professor || 'Professor não informado',
          materia: materia || 'Matéria não informada',
          conteudo: conteudo || 'Relatório não informado.',
        };

        try {
          // Criar PDF individual para este relatório
          const singlePdfBytes = await createSinglePdf(dados);
          const singlePdfDoc = await PDFDocument.load(singlePdfBytes);
          
          // Copiar página para o PDF merged
          const [copiedPage] = await mergedPdf.copyPages(singlePdfDoc, [0]);
          mergedPdf.addPage(copiedPage);
        } catch (error) {
          console.error(`Erro no relatório ${materia} para ${nome}:`, error);
          continue;
        }
      }

      // Salvar PDF merged se tiver páginas
      if (mergedPdf.getPageCount() > 0) {
        const finalPdfBytes = await mergedPdf.save();
        const nomeArquivoPDF = criarNomeArquivo(nome);
        
        zip.file(nomeArquivoPDF, finalPdfBytes as any);
        documentosGerados++;
        console.log(`✅ ${nome}: ${mergedPdf.getPageCount()} página(s)`);
      }
    }

    if (documentosGerados === 0) {
      return NextResponse.json({ error: 'Nenhum relatório atendendo aos critérios' }, { status: 400 });
    }

    // ✅ SOLUÇÃO FINAL: Base64
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const zipBuffer = Buffer.from(zipBase64, 'base64');
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=PPIs_${nomeTurmaFinal}.zip`,
      },
    });
    
  } catch (err: any) {
    console.error('Erro ao gerar documentos:', err);
    return NextResponse.json({ 
      error: 'Erro interno ao gerar documentos',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};