// POST /api/admin/alunos/upload-excel - importa alunos do Excel "DocEscRelacaoAlunosTurma.xlsx"
// (somente ADMIN). Aceita 1+ arquivos .xlsx; cada arquivo = 1 turma (lê célula R8).
//
// Formato esperado por arquivo:
//  - Célula R8 contém o número da turma (ex: 1601, 1701)
//  - Linha 11: cabeçalhos (Chamada, Código, Nome, DtNascimento, Sexo, ...)
//  - Linha 12+: dados dos alunos
//  - Nome da turma = R8; ano = 2º caractere de R8 (ex: 1601 → 6º ano).
//
// Vincula aos alunos a turma do anoLetivo ATIVO. Se a turma não existir,
// cria. Importação é UPSERT por matricula (Código).
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'
import { recordAdminAction, extractClientIp, extractUserAgent } from '@/lib/login-audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AlunoRow = {
  chamada: number | null
  matricula: string
  nome: string
  dataNascimento: Date | null
}

function parseDateBR(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const s = String(value).trim()
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    const dt = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)))
    return isNaN(dt.getTime()) ? null : dt
  }
  // serial Excel
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const dt = new Date(epoch.getTime() + n * 86400000)
    return isNaN(dt.getTime()) ? null : dt
  }
  return null
}

/**
 * Extrai o número da turma (4 dígitos) e ano (2º caractere) a partir
 * de uma string. Aceita formatos como:
 *  - "6º ano 1601"
 *  - "1601"
 *  - "Turma 1701"
 *  - "9º ano 1903"
 */
function extractTurmaInfo(raw: string | undefined | null): { nome: string; ano: number } | null {
  if (!raw) return null
  const s = String(raw)
  // procura 4 dígitos consecutivos
  const m = s.match(/(\d{4})/)
  if (!m) return null
  const nome = m[1]
  const ano = parseInt(nome.charAt(1))
  if (isNaN(ano) || ano < 1 || ano > 9) return null
  return { nome, ano }
}

type SheetParseResult = {
  sheetName: string
  turmaInfo: { nome: string; ano: number } | null
  alunos: AlunoRow[]
}

function parseSingleSheet(sheet: XLSX.WorkSheet, sheetName: string): SheetParseResult {
  // Linha 10 é o cabeçalho (índice 9 em 0-based). range:9 faz sheet_to_json
  // tratar a linha 10 como header.
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 9,
    raw: false,
    dateNF: 'dd/mm/yyyy',
    blankrows: false,
    defval: null,
  })

  // Detecta turma a partir do nome da aba
  const turmaFromSheet = extractTurmaInfo(sheetName)
  // Fallback: tenta R8 e A1 (apenas se nome da aba não tiver número)
  let turmaInfo = turmaFromSheet
  if (!turmaInfo) {
    const r8 = sheet['R8'] ? String(sheet['R8'].v ?? '') : ''
    const a1 = sheet['A1'] ? String(sheet['A1'].v ?? '') : ''
    turmaInfo = extractTurmaInfo(r8) || extractTurmaInfo(a1)
  }

  if (data.length < 2) return { sheetName, turmaInfo, alunos: [] }

  const headerRow = data[0] as Array<string | null>
  // Mapeia colunas pelo nome do cabeçalho. Robusto contra colunas
  // mescladas/extras: cada índice de coluna na planilha é preservado
  // pois usamos defval:null e header:1.
  const idxNome = headerRow.findIndex((h) => /nome/i.test(String(h ?? '')))
  const idxMat = headerRow.findIndex((h) => /c[óo]digo|matr[íi]cula/i.test(String(h ?? '')))
  const idxDt = headerRow.findIndex((h) => /nascimento|dtnasc/i.test(String(h ?? '')))
  const idxCh = headerRow.findIndex((h) => /chamada/i.test(String(h ?? '')))

  // Defaults seguros (B/C/D) caso o header não corresponda
  const COL_NOME = idxNome >= 0 ? idxNome : 2
  const COL_MAT = idxMat >= 0 ? idxMat : 1
  const COL_DT = idxDt >= 0 ? idxDt : 3
  const COL_CH = idxCh >= 0 ? idxCh : 0

  const alunos: AlunoRow[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const nome = String(row[COL_NOME] ?? '').trim()
    const mat = String(row[COL_MAT] ?? '').trim()
    if (!nome || !mat) continue
    alunos.push({
      chamada: row[COL_CH] != null ? parseInt(String(row[COL_CH])) || null : null,
      matricula: mat,
      nome,
      dataNascimento: parseDateBR(row[COL_DT]),
    })
  }
  return { sheetName, turmaInfo, alunos }
}

function parseSheet(workbook: XLSX.WorkBook): SheetParseResult[] {
  // Itera TODAS as abas. Cada aba = 1 turma.
  const results: SheetParseResult[] = []
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    results.push(parseSingleSheet(sheet, name))
  }
  return results
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response
  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const dryRun = formData.get('dryRun') === '1'
    if (!files.length) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Garante ano letivo ATIVO; se não houver, usa o mais recente.
    const anoLetivo =
      (await prisma.anoLetivo.findFirst({ where: { ativo: true } })) ||
      (await prisma.anoLetivo.findFirst({ orderBy: { ano: 'desc' } }))
    if (!anoLetivo) {
      return NextResponse.json(
        { error: 'Nenhum ano letivo cadastrado. Crie um antes de importar alunos.' },
        { status: 400 },
      )
    }

    type FileSummary = {
      file: string
      sheet: string
      turma: string | null
      ano?: number
      total: number
      criados: number
      atualizados: number
      preview: AlunoRow[]
      erros: string[]
    }
    const summary: FileSummary[] = []

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
      const sheetsParsed = parseSheet(wb)

      // Cada sheet vira uma entrada de summary (= 1 turma)
      for (const { sheetName, turmaInfo, alunos } of sheetsParsed) {
        const entry: FileSummary = {
          file: file.name,
          sheet: sheetName,
          turma: turmaInfo?.nome ?? null,
          ano: turmaInfo?.ano,
          total: alunos.length,
          criados: 0,
          atualizados: 0,
          preview: alunos.slice(0, 1000),
          erros: [] as string[],
        }
        summary.push(entry)

        if (!turmaInfo) {
          entry.erros.push(
            `Não foi possível identificar o nº da turma na aba "${sheetName}". ` +
              `Esperado: nome de aba contendo 4 dígitos (ex: "6º ano 1601") ou R8 com a turma.`,
          )
          continue
        }
        if (alunos.length === 0) {
          entry.erros.push('Aba sem dados de alunos detectados.')
          continue
        }
        if (dryRun) continue // preview: não persiste

        // Upsert da turma vinculada ao ano letivo ativo
        const turma = await prisma.turma.upsert({
          where: { name: turmaInfo.nome },
          update: { anoLetivoId: anoLetivo.id },
          create: { name: turmaInfo.nome, anoLetivoId: anoLetivo.id },
        })

        for (const a of alunos) {
          try {
            const existing = await prisma.aluno.findFirst({
              where: {
                OR: [
                  { matricule: a.matricula },
                  { name: a.nome, turmaId: turma.id },
                ],
              },
            })
            if (existing) {
              await prisma.aluno.update({
                where: { id: existing.id },
                data: {
                  name: a.nome,
                  matricule: a.matricula,
                  dataNascimento: a.dataNascimento,
                  turmaId: turma.id,
                  active: true,
                  deletedAt: null,
                },
              })
              entry.atualizados++
            } else {
              await prisma.aluno.create({
                data: {
                  name: a.nome,
                  matricule: a.matricula,
                  dataNascimento: a.dataNascimento,
                  turmaId: turma.id,
                  active: true,
                },
              })
              entry.criados++
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            entry.erros.push(`${a.nome}: ${msg.slice(0, 120)}`)
          }
        }
      }
    }

    if (!dryRun) {
      await recordAdminAction({
        actorUserId: parseInt(guard.token.sub),
        actorRole: guard.token.role,
        actorNome: guard.token.nome,
        ip,
        userAgent,
        action: 'UPLOAD_ALUNOS_EXCEL',
        success: true,
        executedData: {
          anoLetivo: anoLetivo.ano,
          // não salva o preview (pode ser grande); só métricas
          summary: summary.map((s) => ({
            file: s.file,
            turma: s.turma,
            total: s.total,
            criados: s.criados,
            atualizados: s.atualizados,
            erros: s.erros.length,
          })),
        },
        message: `Importação concluída: ${summary.reduce((acc, s) => acc + s.criados, 0)} criados, ${summary.reduce((acc, s) => acc + s.atualizados, 0)} atualizados`,
      })
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      anoLetivo: anoLetivo.ano,
      summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[POST /api/admin/alunos/upload-excel]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
