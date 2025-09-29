import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import libre from 'libreoffice-convert';
import { Buffer } from 'buffer';
import { PDFDocument } from 'pdf-lib'; // ⬅️ novo

function convertToPDF(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libre.convert(buffer, '.pdf', undefined, (err, done) => {
      if (err) return reject(err);
      resolve(done);
    });
  });
}

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
  return horaBrasil.toLocaleString('pt-BR');
}

export async function POST(req: NextRequest) {
  try {
    const { alunos, quantidadeMinima = 0 } = await req.json();

    if (!Array.isArray(alunos)) {
      return NextResponse.json({ error: 'Formato inválido de alunos' }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.docx');
    const templateBinary = fs.readFileSync(templatePath);
    const zip = new JSZip();

    let nomeTurmaFinal = 'turma';

    for (const aluno of alunos) {
      const nome = aluno.name;
      const turma = aluno.turma?.name || '';
      const ano = getAnoEscolar(turma);
      if (turma && nomeTurmaFinal === 'turma') nomeTurmaFinal = turma;

      const relatorios = aluno.relatorios || [];

      if (relatorios.length < quantidadeMinima) continue;

      const pdfBuffers: Buffer[] = [];

      for (const relatorio of relatorios) {
        const professor = relatorio.professor?.name || '';
        const materia = relatorio.materia?.name || '';
        const conteudo = relatorio.conteudo || '';

        const doc = new Docxtemplater(new PizZip(templateBinary), {
          paragraphLoop: true,
          linebreaks: true,
        });

        const dados = {
          nome,
          turma,
          ano,
          professor,
          materia,
          conteudo,
          data: getHoraBrasilia(), // para mostrar data/hora correta no doc
        };

        try {
          doc.render(dados);
        } catch (err: any) {
          console.error('Erro ao renderizar modelo:', err);
          return NextResponse.json({ error: 'Erro ao renderizar modelo', detail: err.message }, { status: 500 });
        }

        const docBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        try {
          const pdfBuffer = await convertToPDF(docBuffer);
          pdfBuffers.push(pdfBuffer);
        } catch (convErr) {
          console.error('Erro na conversão para PDF:', convErr);
        }
      }

      // Unir todos os PDFs em um único PDF por aluno
      const mergedPdf = await PDFDocument.create();
      for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const finalPdfBuffer = await mergedPdf.save();

      const nomeArquivoPDF = `${nome.replace(/\s+/g, '_')}.pdf`;
      zip.file(nomeArquivoPDF, finalPdfBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=ppis_${nomeTurmaFinal}.zip`,
      },
    });
  } catch (err: any) {
    console.error('Erro ao gerar documentos:', err);
    return NextResponse.json({ error: 'Erro ao gerar documentos', detail: err.message }, { status: 500 });
  }
}
