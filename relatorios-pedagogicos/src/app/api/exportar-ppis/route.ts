// src/app/api/exportar-ppis/route.ts - VERSÃO COMPLETA ATUALIZADA
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

// ✅ Função para obter data no formato brasileiro
function getDataBrasilia(): string {
  const agora = new Date();
  const offsetMs = -3 * 60 * 60 * 1000;
  const dataBrasil = new Date(agora.getTime() + offsetMs);
  return dataBrasil.toLocaleDateString('pt-BR');
}

// ✅ Função para quebrar texto em múltiplas linhas
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = words[0] || '';
  
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

// ✅ Função para preencher o template PDF com coordenadas precisas
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
    
    // ✅ COORDENADAS PRECISAS BASEADAS NO TEMPLATE
    const campos = {
      // Dados do aluno - PRIMEIRA LINHA
      nome: { x: 130, y: height - 175, size: 11 },
      
      // Dados do aluno - SEGUNDA LINHA  
      ano: { x: 130, y: height - 205, size: 11 },
      turma: { x: 300, y: height - 205, size: 11 },
      
      // Dados do aluno - TERCEIRA LINHA
      materia: { x: 130, y: height - 235, size: 11 },
      professor: { x: 400, y: height - 235, size: 11 },
      
      // Bimestre - marcar X no correto (3º Bim)
      bimestreX: { x: 555, y: height - 205, size: 14 },
      
      // Conteúdo do relatório
      conteudo: { 
        x: 50, 
        y: height - 400, 
        size: 10, 
        maxWidth: 500, 
        lineHeight: 12 
      },
      
      // Data do documento
      data: { x: 450, y: height - 140, size: 10 }
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
    
    // Data
    if (alunoData.data) {
      firstPage.drawText(alunoData.data, {
        x: campos.data.x,
        y: campos.data.y,
        size: campos.data.size,
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
    
    // 🔹 PREENCHER CONTEÚDO DO RELATÓRIO
    if (alunoData.conteudo) {
      const lines = wrapText(alunoData.conteudo, campos.conteudo.maxWidth, font, campos.conteudo.size);
      let currentY = campos.conteudo.y;
      
      for (const line of lines.slice(0, 25)) { // Limitar a 25 linhas
        if (currentY < 100) break; // Não passar do final da página
        
        firstPage.drawText(line, {
          x: campos.conteudo.x,
          y: currentY,
          size: campos.conteudo.size,
          font,
          color: rgb(0, 0, 0),
        });
        currentY -= campos.conteudo.lineHeight;
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('Erro ao preencher template PDF:', error);
    // Fallback para PDF simples em caso de erro
    return await generateSimplePdf(alunoData);
  }
}

// ✅ Fallback: Gerar PDF simples se o template falhar
async function generateSimplePdf(alunoData: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
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
  
  // Cabeçalho
  drawText(`RELATÓRIO PPI - ${alunoData.nome || 'Aluno'}`, 50, true, 16);
  y -= 10;
  drawText(`Turma: ${alunoData.turma || ''} | Ano: ${alunoData.ano || ''}`, 50);
  drawText(`Professor: ${alunoData.professor || ''} | Matéria: ${alunoData.materia || ''}`, 50);
  drawText(`Data: ${alunoData.data || ''}`, 50);
  drawText(`Bimestre: 3º Bim`, 50);
  y -= 20;
  
  // Conteúdo
  drawText('CONTEÚDO DO RELATÓRIO:', 50, true);
  y -= 10;
  
  if (alunoData.conteudo) {
    const lines = wrapText(alunoData.conteudo, 500, font, 11);
    lines.forEach(line => {
      if (y < 50) return; // Não ultrapassar o final da página
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

    // Processar cada aluno
    for (const aluno of alunos) {
      const nome = aluno.name?.trim();
      const turma = aluno.turma?.name?.trim() || '';
      const ano = getAnoEscolar(turma);
      
      if (turma && nomeTurmaFinal === 'turma') {
        nomeTurmaFinal = turma;
      }

      const relatorios = aluno.relatorios || [];

      // Pular aluno se não tiver relatórios suficientes
      if (relatorios.length < quantidadeMinima) continue;

      // Processar cada relatório do aluno
      for (const relatorio of relatorios) {
        const professor = relatorio.professor?.name?.trim() || '';
        const materia = relatorio.materia?.name?.trim() || '';
        const conteudo = relatorio.conteudo?.trim() || '';

        // Preparar dados para o PDF
        const dados = {
          nome: nome || 'Nome não informado',
          turma: turma || 'Turma não informada',
          ano: ano || 'Ano não informado',
          professor: professor || 'Professor não informado',
          materia: materia || 'Matéria não informada',
          conteudo: conteudo || 'Relatório não informado.',
          data: getDataBrasilia(),
        };

        try {
          // Gerar PDF com template
          const pdfBuffer = await fillPdfTemplate(dados);
          
          // Criar nome do arquivo seguro
          const nomeSeguro = nome?.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_') || 'aluno';
          const materiaSegura = materia?.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_') || 'materia';
          const nomeArquivoPDF = `${nomeSeguro}_${materiaSegura}.pdf`;
          
          zip.file(nomeArquivoPDF, pdfBuffer);
          documentosGerados++;
          
        } catch (error) {
          console.error(`Erro ao gerar PDF para ${nome}:`, error);
          continue;
        }
      }
    }

    // Verificar se algum documento foi gerado
    if (documentosGerados === 0) {
      return NextResponse.json(
        { error: 'Nenhum relatório atende aos critérios mínimos especificados' },
        { status: 400 }
      );
    }

    // Gerar arquivo ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipUint8Array = new Uint8Array(zipBuffer);

    // Log de sucesso
    console.log(`✅ ${documentosGerados} documentos gerados para turma ${nomeTurmaFinal}`);

    return new NextResponse(zipUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=ppis_${nomeTurmaFinal}_${getDataBrasilia().replace(/\//g, '-')}.zip`,
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

// ✅ Configuração para evitar timeout no Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60, // 60 segundos (máximo do Vercel Hobby)
};