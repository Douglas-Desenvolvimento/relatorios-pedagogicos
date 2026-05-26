// src/app/api/exportar-ppis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { requireCoordOrAdmin } from '@/lib/auth-guard'
import { extractClientIp } from '@/lib/login-audit'
import { rateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_ALUNOS_EXPORT = 120
const MAX_RELATORIOS_POR_ALUNO = 16
const MAX_CONTEUDO_CHARS = 12000

const getAnoEscolar = (turma: string): string => {
  if (!turma) return ''
  const prefix = turma.slice(0, 2)
  switch (prefix) {
    case '16':
      return '6º'
    case '17':
      return '7º'
    case '18':
      return '8º'
    case '19':
      return '9º'
    default:
      return ''
  }
}

function cleanText(text: string): string {
  if (!text) return ''
  let cleaned = text.replace(/\n\s*\n/g, '\n\n')
  cleaned = cleaned.replace(/[^\x20-\x7E\u00C0-\u00FF\n]/g, ' ')
  cleaned = cleaned.replace(/[^\S\n]+/g, ' ')
  return cleaned.trim().slice(0, MAX_CONTEUDO_CHARS)
}

function dividirTextoEmPaginas(texto: string, maxCaracteresPorPagina = 1500): string[] {
  if (!texto) return ['']
  const paginas: string[] = []
  let textoRestante = cleanText(texto)

  while (textoRestante.length > 0) {
    if (textoRestante.length <= maxCaracteresPorPagina) {
      paginas.push(textoRestante)
      break
    }

    let pontoCorte = maxCaracteresPorPagina
    while (pontoCorte > 0 && textoRestante[pontoCorte] !== ' ' && textoRestante[pontoCorte] !== '\n') {
      pontoCorte--
    }
    if (pontoCorte === 0) pontoCorte = maxCaracteresPorPagina

    paginas.push(textoRestante.substring(0, pontoCorte).trim())
    textoRestante = textoRestante.substring(pontoCorte).trim()
  }

  return paginas
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return ['']

  const lines: string[] = []
  const paragraphs = cleanText(text).split('\n')

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim()
    if (!trimmedPara) {
      lines.push('')
      continue
    }

    const words = trimmedPara.split(' ')
    let currentLine = ''

    for (const word of words) {
      if (!word) continue
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) lines.push(currentLine.trim())
        currentLine = word
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim())
  }

  return lines
}

async function criarPaginaPdf(
  pdfDoc: PDFDocument,
  alunoData: any,
  conteudo: string,
  paginaAtual: number,
  totalPaginas: number,
): Promise<void> {
  const templatePath = path.join(process.cwd(), 'public/modelos/PPI_1_bim.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  const templateDoc = await PDFDocument.load(templateBytes)
  const [templatePage] = await pdfDoc.copyPages(templateDoc, [0])

  const page = pdfDoc.addPage(templatePage)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()

  const bimestreNumero = alunoData.bimestreNumero || 1
  const bimestreXPositions: Record<number, number> = { 1: 404, 2: 450, 3: 495, 4: 548 }

  const campos = {
    nome: { x: 50, y: height - 155, size: 11 },
    ano: { x: 50, y: height - 220, size: 11 },
    turma: { x: 150, y: height - 220, size: 11 },
    materia: { x: 50, y: height - 285, size: 11 },
    professor: { x: 200, y: height - 285, size: 11 },
    bimestreX: { x: bimestreXPositions[bimestreNumero] || 495, y: height - 205, size: 11 },
    conteudo: { x: 260, y: height - 350, size: 10, maxWidth: 300, lineHeight: 12 },
  }

  if (alunoData.nome) page.drawText(cleanText(alunoData.nome), { ...campos.nome, font, color: rgb(0, 0, 0) })
  if (alunoData.ano) page.drawText(cleanText(alunoData.ano), { ...campos.ano, font, color: rgb(0, 0, 0) })
  if (alunoData.turma) page.drawText(cleanText(alunoData.turma), { ...campos.turma, font, color: rgb(0, 0, 0) })
  if (alunoData.materia) page.drawText(cleanText(alunoData.materia), { ...campos.materia, font, color: rgb(0, 0, 0) })
  if (alunoData.professor) page.drawText(cleanText(alunoData.professor), { ...campos.professor, font, color: rgb(0, 0, 0) })

  page.drawText('X', { ...campos.bimestreX, font: fontBold, color: rgb(0, 0, 0) })

  if (conteudo && conteudo !== 'Relatório não informado.') {
    let textoParaDesenhar = conteudo
    const isPrimeiraPagina = paginaAtual === 1
    const isUltimaPagina = paginaAtual === totalPaginas

    if (isPrimeiraPagina && !isUltimaPagina) {
      textoParaDesenhar += `\n\n[...continua ${paginaAtual} de ${totalPaginas}]`
    } else if (!isPrimeiraPagina) {
      textoParaDesenhar = `[continuação ${paginaAtual} de ${totalPaginas}]\n\n${textoParaDesenhar}`
    }

    const lines = wrapText(textoParaDesenhar, campos.conteudo.maxWidth, font, campos.conteudo.size)
    let currentY = campos.conteudo.y

    for (const line of lines) {
      if (currentY < 120) break
      if (line.trim() !== '') {
        page.drawText(line, {
          x: campos.conteudo.x,
          y: currentY,
          size: campos.conteudo.size,
          font,
          color: rgb(0, 0, 0),
        })
      }
      currentY -= campos.conteudo.lineHeight
    }
  }
}

async function createCompletePdf(alunoData: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const paginasConteudo = dividirTextoEmPaginas(alunoData.conteudo, 1500)

  for (let i = 0; i < paginasConteudo.length; i++) {
    await criarPaginaPdf(pdfDoc, alunoData, paginasConteudo[i], i + 1, paginasConteudo.length)
  }

  return pdfDoc.save()
}

function criarNomeArquivo(nome: string): string {
  const safeName = (nome?.trim() || 'Aluno')
    .replace(/[\\/:*?"<>|]/g, '-')
    .slice(0, 120)
  return `${safeName}.pdf`
}

export async function POST(req: NextRequest) {
  const guard = await requireCoordOrAdmin(req)
  if ('response' in guard) return guard.response

  const limited = rateLimit({
    key: `export-ppis:${guard.token.sub}:${extractClientIp(req) || 'unknown'}`,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  })
  if (limited) return limited

  try {
    const { alunos, quantidadeMinima = 0 } = await req.json()

    if (!Array.isArray(alunos)) {
      return NextResponse.json({ error: 'Formato inválido de alunos' }, { status: 400 })
    }

    if (alunos.length > MAX_ALUNOS_EXPORT) {
      return NextResponse.json(
        { error: `Exportação limitada a ${MAX_ALUNOS_EXPORT} alunos por operação` },
        { status: 413 },
      )
    }

    const zip = new JSZip()
    let nomeTurmaFinal = 'turma'
    let bimestreDoZip: number | null = null
    let documentosGerados = 0

    for (const aluno of alunos) {
      const nome = String(aluno.name || '').trim()
      const turma = String(aluno.turma?.name || '').trim()
      const ano = getAnoEscolar(turma)

      if (turma && nomeTurmaFinal === 'turma') nomeTurmaFinal = turma

      const relatorios = Array.isArray(aluno.relatorios)
        ? aluno.relatorios.slice(0, MAX_RELATORIOS_POR_ALUNO)
        : []
      if (relatorios.length < Number(quantidadeMinima)) continue

      const mergedPdf = await PDFDocument.create()

      for (const relatorio of relatorios) {
        const professor = String(relatorio.professor?.name || '').trim()
        const materia = String(relatorio.materia?.name || '').trim()
        const conteudo = String(relatorio.conteudo || '').trim()
        const bimestreNumero = Number(relatorio.bimestre?.numero || 1)

        if (bimestreDoZip === null) bimestreDoZip = bimestreNumero

        const dados = {
          nome: nome || 'Nome não informado',
          turma: turma || 'Turma não informada',
          ano: ano || 'Ano não informado',
          professor: professor || 'Professor não informado',
          materia: materia || 'Matéria não informada',
          conteudo: conteudo || 'Relatório não informado.',
          bimestreNumero,
        }

        try {
          const completePdfBytes = await createCompletePdf(dados)
          const completePdfDoc = await PDFDocument.load(completePdfBytes)

          for (let i = 0; i < completePdfDoc.getPageCount(); i++) {
            const [copiedPage] = await mergedPdf.copyPages(completePdfDoc, [i])
            mergedPdf.addPage(copiedPage)
          }
        } catch (error) {
          console.error('Erro ao gerar relatório para exportação:', error)
        }
      }

      if (mergedPdf.getPageCount() > 0) {
        const finalPdfBytes = await mergedPdf.save()
        zip.file(criarNomeArquivo(nome), finalPdfBytes as any)
        documentosGerados++
      }
    }

    if (documentosGerados === 0) {
      return NextResponse.json(
        { error: 'Nenhum relatório atendendo aos critérios' },
        { status: 400 },
      )
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' })
    const zipBuffer = Buffer.from(zipBase64, 'base64')
    const nomeZip = `PPIs_${nomeTurmaFinal}_${bimestreDoZip || 1}Bim.zip`.replace(/[\\/:*?"<>|]/g, '-')

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${nomeZip}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Erro ao gerar documentos:', err)
    return NextResponse.json(
      { error: 'Erro interno ao gerar documentos' },
      { status: 500 },
    )
  }
}
