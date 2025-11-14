// src/app/api/exportar-ppis/route.ts - VERSÃO COM INDICAÇÕES MAS SEM RODAPÉ
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

// ✅ Função para limpar texto mantendo quebras de linha
function cleanText(text: string): string {
  if (!text) return '';
  
  let cleaned = text.replace(/\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/\n/g, '\n');
  cleaned = cleaned.replace(/[^\x20-\x7E\u00C0-\u00FF\n]/g, ' ');
  cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
  
  return cleaned.trim();
}

// ✅ FUNÇÃO PARA DIVIDIR TEXTO EM PÁGINAS (1500 caracteres por página)
function dividirTextoEmPaginas(texto: string, maxCaracteresPorPagina: number = 1500): string[] {
  if (!texto) return [''];
  
  const paginas: string[] = [];
  let textoRestante = cleanText(texto);
  
  while (textoRestante.length > 0) {
    if (textoRestante.length <= maxCaracteresPorPagina) {
      paginas.push(textoRestante);
      break;
    }
    
    // Encontrar o último espaço dentro do limite
    let pontoCorte = maxCaracteresPorPagina;
    while (pontoCorte > 0 && textoRestante[pontoCorte] !== ' ' && textoRestante[pontoCorte] !== '\n') {
      pontoCorte--;
    }
    
    // Se não encontrou espaço, corta no limite exato
    if (pontoCorte === 0) {
      pontoCorte = maxCaracteresPorPagina;
    }
    
    const pagina = textoRestante.substring(0, pontoCorte).trim();
    paginas.push(pagina);
    textoRestante = textoRestante.substring(pontoCorte).trim();
  }
  
  return paginas;
}

// ✅ FUNÇÃO PARA QUEBRAR TEXTO EM LINHAS
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const cleanTextContent = cleanText(text);
  const lines: string[] = [];
  const paragraphs = cleanTextContent.split('\n');
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) {
      lines.push('');
      continue;
    }
    
    const paragraphWidth = font.widthOfTextAtSize(trimmedPara, fontSize);
    if (paragraphWidth <= maxWidth) {
      lines.push(trimmedPara);
      continue;
    }
    
    const words = trimmedPara.split(' ');
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        
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
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word;
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }
  
  return lines;
}

// ✅ FUNÇÃO PARA CRIAR PÁGINA DO PDF COM INDICAÇÕES MAS SEM RODAPÉ
async function criarPaginaPdf(
  pdfDoc: PDFDocument, 
  alunoData: any, 
  conteudo: string, 
  paginaAtual: number,
  totalPaginas: number
): Promise<void> {
  
  const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.pdf');
  const templateBytes = fs.readFileSync(templatePath);
  const templateDoc = await PDFDocument.load(templateBytes);
  const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
  
  const page = pdfDoc.addPage(templatePage);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  // Calcular posição X do bimestre (baseado no número do bimestre)
  // Posições aproximadas para cada bimestre no template
  const bimestreNumero = alunoData.bimestreNumero || 1;
  const bimestreXPositions: Record<number, number> = {
    1: 495,  // 1º Bimestre
    2: 515,  // 2º Bimestre
    3: 535,  // 3º Bimestre
    4: 555,  // 4º Bimestre
  };

  // Coordenadas
  const campos = {
    nome: { x: 50, y: height - 155, size: 11 },
    ano: { x: 50, y: height - 220, size: 11 },
    turma: { x: 150, y: height - 220, size: 11 },
    materia: { x: 50, y: height - 285, size: 11 },
    professor: { x: 200, y: height - 285, size: 11 },
    bimestreX: { x: bimestreXPositions[bimestreNumero] || 495, y: height - 205, size: 11 },
    conteudo: { 
      x: 260, 
      y: height - 350, 
      size: 10, 
      maxWidth: 300, 
      lineHeight: 12, 
      maxLines: 40
    }
  };
  
  // ✅ SEMPRE PREENCHER CABEÇALHO (igual em todas as páginas)
  if (alunoData.nome) {
    const cleanNome = cleanText(alunoData.nome);
    page.drawText(cleanNome, { x: campos.nome.x, y: campos.nome.y, size: campos.nome.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.ano) {
    const cleanAno = cleanText(alunoData.ano);
    page.drawText(cleanAno, { x: campos.ano.x, y: campos.ano.y, size: campos.ano.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.turma) {
    const cleanTurma = cleanText(alunoData.turma);
    page.drawText(cleanTurma, { x: campos.turma.x, y: campos.turma.y, size: campos.turma.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.materia) {
    const cleanMateria = cleanText(alunoData.materia);
    page.drawText(cleanMateria, { x: campos.materia.x, y: campos.materia.y, size: campos.materia.size, font, color: rgb(0, 0, 0) });
  }
  
  if (alunoData.professor) {
    const cleanProfessor = cleanText(alunoData.professor);
    page.drawText(cleanProfessor, { x: campos.professor.x, y: campos.professor.y, size: campos.professor.size, font, color: rgb(0, 0, 0) });
  }
  
  page.drawText('X', { x: campos.bimestreX.x, y: campos.bimestreX.y, size: campos.bimestreX.size, font: fontBold, color: rgb(0, 0, 0) });
  
  // ✅ CONTEÚDO COM INDICAÇÕES DE CONTINUAÇÃO (SEM RODAPÉ)
  if (conteudo && conteudo !== 'Relatório não informado.') {
    let textoParaDesenhar = conteudo;
    const isPrimeiraPagina = paginaAtual === 1;
    const isUltimaPagina = paginaAtual === totalPaginas;
    
    // ✅ NA PRIMEIRA PÁGINA: adicionar "[...continua X de Y]" se tiver mais páginas
    if (isPrimeiraPagina && !isUltimaPagina) {
      textoParaDesenhar += `\n\n[...continua ${paginaAtual} de ${totalPaginas}]`;
    }
    // ✅ NAS PÁGINAS INTERMEDIÁRIAS: adicionar "[continuação X de Y]" no início
    else if (!isPrimeiraPagina && !isUltimaPagina) {
      textoParaDesenhar = `[continuação ${paginaAtual} de ${totalPaginas}]\n\n${textoParaDesenhar}`;
    }
    // ✅ NA ÚLTIMA PÁGINA: adicionar "[continuação X de Y]" no início
    else if (!isPrimeiraPagina && isUltimaPagina) {
      textoParaDesenhar = `[continuação ${paginaAtual} de ${totalPaginas}]\n\n${textoParaDesenhar}`;
    }
    // ✅ PRIMEIRA E ÚNICA PÁGINA: sem indicações extras
    
    const lines = wrapText(textoParaDesenhar, campos.conteudo.maxWidth, font, campos.conteudo.size);
    
    let currentY = campos.conteudo.y;
    let linesDesenhadas = 0;
    
    for (const line of lines) {
      if (currentY < 120) break; // Parar antes de sobrepor as assinaturas
      if (line.trim() !== '') {
        page.drawText(line, { 
          x: campos.conteudo.x, 
          y: currentY, 
          size: campos.conteudo.size, 
          font, 
          color: rgb(0, 0, 0) 
        });
        linesDesenhadas++;
      }
      currentY -= campos.conteudo.lineHeight;
    }
    
    console.log(`   Página ${paginaAtual}/${totalPaginas}: ${linesDesenhadas} linhas desenhadas`);
  }
}

// ✅ FUNÇÃO PRINCIPAL PARA CRIAR PDF COMPLETO
async function createCompletePdf(alunoData: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Dividir conteúdo em páginas de 1500 caracteres
  const paginasConteudo = dividirTextoEmPaginas(alunoData.conteudo, 1500);
  const totalPaginas = paginasConteudo.length;
  
  console.log(`📄 ${alunoData.nome}: ${totalPaginas} página(s) gerada(s)`);
  
  // Criar uma página para cada parte do conteúdo
  for (let i = 0; i < totalPaginas; i++) {
    const paginaAtual = i + 1;
    await criarPaginaPdf(pdfDoc, alunoData, paginasConteudo[i], paginaAtual, totalPaginas);
    
    console.log(`   → Página ${paginaAtual}: ${paginasConteudo[i].length} caracteres`);
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ✅ Função para criar nome de arquivo
function criarNomeArquivo(nome: string): string {
  return `${nome?.trim() || 'Aluno'}.pdf`;
}

// ✅ Função principal
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

      const mergedPdf = await PDFDocument.create();

      for (const relatorio of relatorios) {
        const professor = relatorio.professor?.name?.trim() || '';
        const materia = relatorio.materia?.name?.trim() || '';
        const conteudo = relatorio.conteudo?.trim() || '';
        const bimestreNumero = relatorio.bimestre?.numero || 1;

        const dados = {
          nome: nome || 'Nome não informado',
          turma: turma || 'Turma não informada',
          ano: ano || 'Ano não informado',
          professor: professor || 'Professor não informado',
          materia: materia || 'Matéria não informada',
          conteudo: conteudo || 'Relatório não informado.',
          bimestreNumero,
        };

        try {
          // ✅ USAR A NOVA FUNÇÃO COM INDICAÇÕES MAS SEM RODAPÉ
          const completePdfBytes = await createCompletePdf(dados);
          const completePdfDoc = await PDFDocument.load(completePdfBytes);
          
          // Copiar TODAS as páginas para o PDF merged
          const pageCount = completePdfDoc.getPageCount();
          for (let i = 0; i < pageCount; i++) {
            const [copiedPage] = await mergedPdf.copyPages(completePdfDoc, [i]);
            mergedPdf.addPage(copiedPage);
          }
        } catch (error) {
          console.error(`Erro no relatório ${materia} para ${nome}:`, error);
          continue;
        }
      }

      if (mergedPdf.getPageCount() > 0) {
        const finalPdfBytes = await mergedPdf.save();
        const nomeArquivoPDF = criarNomeArquivo(nome);
        
        zip.file(nomeArquivoPDF, finalPdfBytes as any);
        documentosGerados++;
        console.log(`✅ ${nome}: ${mergedPdf.getPageCount()} página(s) totais`);
      }
    }

    if (documentosGerados === 0) {
      return NextResponse.json({ error: 'Nenhum relatório atendendo aos critérios' }, { status: 400 });
    }

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