// src/app/api/exportar-ppis/route.ts - VERSÃO COM QUEBRA DE LINHA CORRIGIDA
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

// ✅ Função MELHORADA para quebrar texto em múltiplas linhas
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const lines: string[] = [];
  
  // Primeiro quebra por parágrafos (quebras de linha existentes)
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Testa a linha atual + nova palavra
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      
      // Se caber, adiciona a palavra na linha atual
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        // Se não caber, salva a linha atual e começa nova linha
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    // Adiciona a última linha do parágrafo
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Adiciona linha vazia entre parágrafos (exceto após o último)
    if (paragraphs.indexOf(paragraph) < paragraphs.length - 1) {
      lines.push('');
    }
  }
  
  return lines;
}

// ✅ Função para preencher o template PDF com coordenadas corrigidas
async function fillPdfTemplate(alunoData: any): Promise<Buffer> {
  try {
    // Carregar template PDF
    const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.pdf');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error('Template PDF não encontrado: ' + templatePath);
    }
    
    const templateBytes = fs.readFileSync(templatePath);
    
    // Carregar PDF
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Obter fontes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = firstPage.getSize();

    // ✅ COORDENADAS CORRIGIDAS PARA A ÁREA DE CONTEÚDO
    const campos = {
      // Nome do aluno
      nome: { x: 50, y: height - 155, size: 11 },
      
      // Ano escolar
      ano: { x: 50, y: height - 225, size: 11 },
      
      // Turma
      turma: { x: 150, y: height - 220, size: 11 },
      
      // Matéria
      materia: { x: 50, y: height - 220, size: 11 },
      
      // Professor
      professor: { x: 200, y: height - 285, size: 11 },
      
      // Bimestre - marcar X no 3º Bim
      bimestreX: { x: 495, y: height - 205, size: 11 },
      
      // ✅ CONTEÚDO DO RELATÓRIO - COORDENADAS CORRIGIDAS
      conteudo: { 
        x: 260, // Mais à esquerda
        y: height - 400, // Posição mais alta
        size: 9, // Fonte menor
        maxWidth: 300, // Largura máxima da área
        lineHeight: 10, // Espaçamento entre linhas
        maxLines: 25 // Número máximo de linhas
      }
    };
    
    // 🔹 PREENCHER CAMPOS TEXTUAIS
    
    // Nome do aluno
    if (alunoData.nome) {
      firstPage.drawText(alunoData.nome, {
        x: campos.nome.x,
        y: campos.nome.y,
        size: campos.nome.size,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Ano escolar
    if (alunoData.ano) {
      firstPage.drawText(alunoData.ano, {
        x: campos.ano.x,
        y: campos.ano.y,
        size: campos.ano.size,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Turma
    if (alunoData.turma) {
      firstPage.drawText(alunoData.turma, {
        x: campos.turma.x,
        y: campos.turma.y,
        size: campos.turma.size,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Matéria
    if (alunoData.materia) {
      firstPage.drawText(alunoData.materia, {
        x: campos.materia.x,
        y: campos.materia.y,
        size: campos.materia.size,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Professor
    if (alunoData.professor) {
      firstPage.drawText(alunoData.professor, {
        x: campos.professor.x,
        y: campos.professor.y,
        size: campos.professor.size,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // 🔹 MARCAR BIMESTRE COM "X" (3º Bimestre)
    firstPage.drawText('X', {
      x: campos.bimestreX.x,
      y: campos.bimestreX.y,
      size: campos.bimestreX.size,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    // 🔹 PREENCHER CONTEÚDO DO RELATÓRIO - CORRIGIDO
    if (alunoData.conteudo && alunoData.conteudo !== 'Relatório não informado.') {
      console.log('Texto original:', alunoData.conteudo);
      
      const lines = wrapText(alunoData.conteudo, campos.conteudo.maxWidth, font, campos.conteudo.size);
      
      console.log('Linhas geradas:', lines);
      console.log('Número de linhas:', lines.length);
      
      let currentY = campos.conteudo.y;
      
      // Limitar ao número máximo de linhas
      for (const line of lines.slice(0, campos.conteudo.maxLines)) {
        if (currentY < 200) break; // Parar antes das assinaturas
        
        // Só desenha se a linha não estiver vazia ou se for um parágrafo
        if (line.trim() !== '' || lines.indexOf(line) === 0) {
          firstPage.drawText(line, {
            x: campos.conteudo.x,
            y: currentY,
            size: campos.conteudo.size,
            font,
            color: rgb(0, 0, 0),
          });
        }
        
        currentY -= campos.conteudo.lineHeight;
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('Erro ao preencher template PDF:', error);
    return await generateSimplePdf(alunoData);
  }
}

// ✅ Fallback: Gerar PDF simples se o template falhar
async function generateSimplePdf(alunoData: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = 800;
  
  const drawText = (text: string, x: number, useBold = false, size = 12) => {
    if (!text) return;
    
    page.drawText(text, {
      x,
      y,
      size,
      font: useBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 3;
  };
  
  drawText(`RELATÓRIO PPI - ${alunoData.nome || 'Aluno'}`, 50, true, 16);
  y -= 10;
  drawText(`Turma: ${alunoData.turma || ''} | Ano: ${alunoData.ano || ''}`, 50);
  drawText(`Professor: ${alunoData.professor || ''} | Matéria: ${alunoData.materia || ''}`, 50);
  drawText(`Bimestre: 3º Bim`, 50);
  y -= 20;
  
  drawText('CONTEÚDO DO RELATÓRIO:', 50, true);
  y -= 10;
  
  if (alunoData.conteudo) {
    const lines = wrapText(alunoData.conteudo, 500, font, 11);
    lines.forEach(line => {
      if (y < 50) return;
      page.drawText(line, {
        x: 50,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 13;
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ✅ Função para criar nome de arquivo com acentos e espaços
function criarNomeArquivo(nome: string): string {
  const nomeLimpo = nome ? nome.trim() : 'Aluno';
  return `${nomeLimpo}.pdf`;
}

// ✅ Função principal da API
export async function POST(req: NextRequest) {
  try {
    const { alunos, quantidadeMinima = 0 } = await req.json();

    if (!Array.isArray(alunos)) {
      return NextResponse.json({ 
        error: 'Formato inválido de alunos. Esperado array de alunos.' 
      }, { status: 400 });
    }

    const zip = new JSZip();
    let nomeTurmaFinal = 'turma';
    let documentosGerados = 0;

    for (const aluno of alunos) {
      const nome = aluno.name?.trim();
      const turma = aluno.turma?.name?.trim() || '';
      const ano = getAnoEscolar(turma);
      
      if (turma && nomeTurmaFinal === 'turma') {
        nomeTurmaFinal = turma;
      }

      const relatorios = aluno.relatorios || [];

      if (relatorios.length < quantidadeMinima) continue;

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
          const pdfBuffer = await fillPdfTemplate(dados);
          const nomeArquivoPDF = criarNomeArquivo(nome);
          zip.file(nomeArquivoPDF, pdfBuffer);
          documentosGerados++;
          
        } catch (error) {
          console.error(`Erro ao gerar PDF para ${nome}:`, error);
          continue;
        }
      }
    }

    if (documentosGerados === 0) {
      return NextResponse.json(
        { error: 'Nenhum relatório atende aos critérios mínimos especificados' },
        { status: 400 }
      );
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipUint8Array = new Uint8Array(zipBuffer);

    console.log(`✅ ${documentosGerados} documentos gerados para turma ${nomeTurmaFinal}`);

    return new NextResponse(zipUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=PPIs ${nomeTurmaFinal}.zip`,
      },
    });
    
  } catch (err: any) {
    console.error('Erro ao gerar documentos:', err);
    return NextResponse.json(
      { 
        error: 'Erro interno ao gerar documentos',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
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