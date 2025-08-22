import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import libre from 'libreoffice-convert';
import { Buffer } from 'buffer';

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
    case '16':
      return '6º';
    case '17':
      return '7º';
    case '18':
      return '8º';
    case '19':
      return '9º';
    default:
      return '';
  }
};

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
      console.log('📦 Aluno recebido:', aluno);

      const nome = aluno.name;
      const turma = aluno.turma?.name || '';
      const ano = getAnoEscolar(turma);

      if (turma && nomeTurmaFinal === 'turma') nomeTurmaFinal = turma;

      const relatorios = aluno.relatorios || [];

      if (relatorios.length < quantidadeMinima) {
        console.log(`⏭️ Ignorando ${nome} - tem apenas ${relatorios.length} relatório(s)`);
        continue;
      }

      console.log(`🧾 Gerando documentos para: ${nome} (${relatorios.length} relatório(s))`);

      for (let i = 0; i < relatorios.length; i++) {
        const relatorio = relatorios[i];
        console.log(`📑 Relatório ${i + 1}:`, relatorio);

        const professor = relatorio.professor?.name || '';
        const materia = relatorio.materia?.name || '';
        const conteudo = relatorio.conteudo || '';

        if (!professor || !materia) {
          console.warn(`⚠️ Dados incompletos do relatório ${i + 1} para aluno ${nome}`, {
            professor,
            materia,
            relatorio,
          });
        }

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
        };

        console.log('📄 Dados para o relatório:', dados);

        try {
          doc.render(dados);
        } catch (err: any) {
          console.error('❌ Erro ao renderizar modelo:', err);
          return NextResponse.json({ error: 'Erro ao renderizar modelo', detail: err.message }, { status: 500 });
        }

        const docBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        let pdfBuffer: Buffer;
        try {
          pdfBuffer = await convertToPDF(docBuffer);
        } catch (convErr) {
          console.error('❌ Erro na conversão para PDF:', convErr);
          continue;
        }

        const nomeArquivoPDF = `${nome.replace(/\s+/g, '_')}${relatorios.length > 1 ? `_relatorio${i + 1}` : ''}.pdf`;
        zip.file(nomeArquivoPDF, pdfBuffer);
        console.log(`✅ Adicionado ao ZIP: ${nomeArquivoPDF}`);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    console.log('📦 ZIP gerado com sucesso.');

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=ppis_${nomeTurmaFinal}.zip`,
      },
    });
  } catch (err: any) {
    console.error('❌ Erro ao gerar documentos:', err);
    return NextResponse.json({ error: 'Erro ao gerar documentos', detail: err.message }, { status: 500 });
  }
}
