// src/app/api/exportar-ppis/route.ts - CORRIGIDO
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const getAnoEscolar = (turma: string): string => {
  const prefix = turma.slice(0, 2);
  switch (prefix) {
    case '16': return '6º';
    case '17': return '7º';
    case '18': return '8º';
    case '19': return '9º';
    default: return '';
  }
};

function getHoraBrasilia(): string {
  const agora = new Date();
  const offsetMs = -3 * 60 * 60 * 1000;
  const horaBrasil = new Date(agora.getTime() + offsetMs);
  return horaBrasil.toLocaleDateString('pt-BR');
}

// ✅ Função para preencher o template PDF
async function fillPdfTemplate(alunoData: any): Promise<Buffer> {
  try {
    // Carregar template PDF
    const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    
    // Carregar PDF
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Obter fontes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = firstPage.getSize();
    
    // ✅ COORDENADAS DOS CAMPOS (ajuste conforme seu template)
    const campos = {
      nome: { x: 100, y: height - 150, size: 11 },
      turma: { x: 300, y: height - 200, size: 11 },
      ano: { x: 100, y: height - 200, size: 11 },
      materia: { x: 100, y: height - 250, size: 11 },
      professor: { x: 400, y: height - 250, size: 11 },
      conteudo: { x: 300, y: height - 400, size: 10, maxWidth: 250 },
      data: { x: 450, y: height - 50, size: 10 }
    };
    
    // Preencher campos
    firstPage.drawText(alunoData.nome, {
      x: campos.nome.x,
      y: campos.nome.y,
      size: campos.nome.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(alunoData.turma, {
      x: campos.turma.x,
      y: campos.turma.y,
      size: campos.turma.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(alunoData.ano, {
      x: campos.ano.x,
      y: campos.ano.y,
      size: campos.ano.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(alunoData.materia, {
      x: campos.materia.x,
      y: campos.materia.y,
      size: campos.materia.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(alunoData.professor, {
      x: campos.professor.x,
      y: campos.professor.y,
      size: campos.professor.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(alunoData.data, {
      x: campos.data.x,
      y: campos.data.y,
      size: campos.data.size,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Preencher conteúdo (com quebra de linha se necessário)
    const lines = wrapText(alunoData.conteudo, campos.conteudo.maxWidth, font, campos.conteudo.size);
    let currentY = campos.conteudo.y;
    
    for (const line of lines.slice(0, 20)) { // Limitar a 20 linhas
      firstPage.drawText(line, {
        x: campos.conteudo.x,
        y: currentY,
        size: campos.conteudo.size,
        font,
        color: rgb(0, 0, 0),
      });
      currentY -= campos.conteudo.size + 2;
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Erro ao preencher template PDF:', error);
    // Fallback: gerar PDF simples
    return await generateSimplePdf(alunoData);
  }
}

// ✅ Função para quebrar texto em múltiplas linhas
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + ' ' + word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// ✅ Fallback: Gerar PDF simples se o template falhar
async function generateSimplePdf(alunoData: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = 800;
  
  const drawText = (text: string, x: number, useBold = false, size = 12) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: useBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 3;
  };
  
  // Cabeçalho
  drawText(`RELATÓRIO PPI - ${alunoData.nome}`, 50, true, 16);
  y -= 10;
  drawText(`Turma: ${alunoData.turma} | Ano: ${alunoData.ano}`, 50);
  drawText(`Professor: ${alunoData.professor} | Matéria: ${alunoData.materia}`, 50);
  drawText(`Data: ${alunoData.data}`, 50);
  y -= 20;
  
  // Conteúdo
  drawText('CONTEÚDO DO RELATÓRIO:', 50, true);
  y -= 10;
  
  const lines = wrapText(alunoData.conteudo, 500, font, 11);
  lines.forEach(line => {
    page.drawText(line, {
      x: 50,
      y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 13;
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: NextRequest) {
  try {
    const { alunos, quantidadeMinima = 0 } = await req.json();

    if (!Array.isArray(alunos)) {
      return NextResponse.json({ error: 'Formato inválido de alunos' }, { status: 400 });
    }

    const zip = new JSZip();
    let nomeTurmaFinal = 'turma';

    for (const aluno of alunos) {
      const nome = aluno.name;
      const turma = aluno.turma?.name || '';
      const ano = getAnoEscolar(turma);
      if (turma && nomeTurmaFinal === 'turma') nomeTurmaFinal = turma;

      const relatorios = aluno.relatorios || [];

      if (relatorios.length < quantidadeMinima) continue;

      for (const relatorio of relatorios) {
        const professor = relatorio.professor?.name || '';
        const materia = relatorio.materia?.name || '';
        const conteudo = relatorio.conteudo || '';

        const dados = {
          nome,
          turma,
          ano,
          professor,
          materia,
          conteudo,
          data: getHoraBrasilia(),
        };

        try {
          // ✅ Usar template PDF
          const pdfBuffer = await fillPdfTemplate(dados);
          const nomeArquivoPDF = `${nome.replace(/\s+/g, '_')}_${materia.replace(/\s+/g, '_')}.pdf`;
          zip.file(nomeArquivoPDF, pdfBuffer);
        } catch (error) {
          console.error(`Erro ao gerar PDF para ${nome}:`, error);
          continue;
        }
      }
    }

    if (Object.keys(zip.files).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum relatório atende aos critérios mínimos' },
        { status: 400 }
      );
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // ✅ CORREÇÃO: Converter Buffer para Uint8Array
    const zipUint8Array = new Uint8Array(zipBuffer);

    return new NextResponse(zipUint8Array, { // ✅ Agora usa Uint8Array
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=ppis_${nomeTurmaFinal}.zip`,
      },
    });
  } catch (err: any) {
    console.error('Erro ao gerar documentos:', err);
    return NextResponse.json(
      { error: 'Erro ao gerar documentos', detail: err.message },
      { status: 500 }
    );
  }
}