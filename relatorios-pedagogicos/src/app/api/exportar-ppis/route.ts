// src/app/api/exportar-ppis/route.ts - SOLUÇÃO QUE IGNORA TIPOS
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

// ✅ Função SIMPLIFICADA para quebrar texto
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
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

  // Coordenadas
  const campos = {
    nome: { x: 50, y: height - 155, size: 11 },
    ano: { x: 50, y: height - 220, size: 11 },
    turma: { x: 150, y: height - 220, size: 11 },
    materia: { x: 50, y: height - 285, size: 11 },
    professor: { x: 200, y: height - 285, size: 11 },
    bimestreX: { x: 495, y: height - 205, size: 11 },
    conteudo: { x: 260, y: height - 400, size: 10, maxWidth: 390, lineHeight: 12, maxLines: 25 }
  };
  
  // Preencher campos
  if (alunoData.nome) firstPage.drawText(alunoData.nome, { x: campos.nome.x, y: campos.nome.y, size: campos.nome.size, font, color: rgb(0, 0, 0) });
  if (alunoData.ano) firstPage.drawText(alunoData.ano, { x: campos.ano.x, y: campos.ano.y, size: campos.ano.size, font, color: rgb(0, 0, 0) });
  if (alunoData.turma) firstPage.drawText(alunoData.turma, { x: campos.turma.x, y: campos.turma.y, size: campos.turma.size, font, color: rgb(0, 0, 0) });
  if (alunoData.materia) firstPage.drawText(alunoData.materia, { x: campos.materia.x, y: campos.materia.y, size: campos.materia.size, font, color: rgb(0, 0, 0) });
  if (alunoData.professor) firstPage.drawText(alunoData.professor, { x: campos.professor.x, y: campos.professor.y, size: campos.professor.size, font, color: rgb(0, 0, 0) });
  
  firstPage.drawText('X', { x: campos.bimestreX.x, y: campos.bimestreX.y, size: campos.bimestreX.size, font: fontBold, color: rgb(0, 0, 0) });
  
  // Conteúdo
  if (alunoData.conteudo && alunoData.conteudo !== 'Relatório não informado.') {
    const lines = wrapText(alunoData.conteudo, campos.conteudo.maxWidth, font, campos.conteudo.size);
    let currentY = campos.conteudo.y;
    
    for (const line of lines.slice(0, campos.conteudo.maxLines)) {
      if (currentY < 200) break;
      firstPage.drawText(line, { x: campos.conteudo.x, y: currentY, size: campos.conteudo.size, font, color: rgb(0, 0, 0) });
      currentY -= campos.conteudo.lineHeight;
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ✅ Função para criar nome de arquivo
function criarNomeArquivo(nome: string): string {
  return `${nome?.trim() || 'Aluno'}.pdf`;
}

// ✅ Função principal - SOLUÇÃO QUE FUNCIONA
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
        
        // ✅ Ignorar tipos - usar any
        zip.file(nomeArquivoPDF, finalPdfBytes as any);
        documentosGerados++;
        console.log(`✅ ${nome}: ${mergedPdf.getPageCount()} página(s)`);
      }
    }

    if (documentosGerados === 0) {
      return NextResponse.json({ error: 'Nenhum relatório atendendo aos critérios' }, { status: 400 });
    }

    // ✅ SOLUÇÃO FINAL: Usar base64 que sempre funciona
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    
    // ✅ Converter base64 para buffer universal
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