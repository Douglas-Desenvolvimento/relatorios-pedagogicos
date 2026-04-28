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

function extractTurmaInfo(turmaRaw: string): { nome: string; ano: number } | null {
  const s = String(turmaRaw).replace(/\D/g, '')
  if (s.length < 4) return null
  const nome = s.slice(0, 4) // primeiros 4 dígitos
  const ano = parseInt(nome.charAt(1)) // 2º caractere
  if (isNaN(ano) || ano < 1 || ano > 9) return null
  return { nome, ano }
}

function parseSheet(workbook: XLSX.WorkBook): {
  turmaInfo: { nome: string; ano: number } | null
  alunos: AlunoRow[]
} {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { turmaInfo: null, alunos: [] }

  // R8 (coluna R = 18ª, linha 8)
  const r8Cell = sheet['R8']
  const turmaRaw = r8Cell ? String(r8Cell.v ?? '').trim() : ''
  const turmaInfo = extractTurmaInfo(turmaRaw)

  // Lê dados a partir da linha 12 (cabeçalho na linha 11). header:1 dá array of arrays.
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 10, // linha 11 (0-indexed = 10) — usar como cabeçalho
    raw: false,
    dateNF: 'dd/mm/yyyy',
  })

  if (data.length < 2) return { turmaInfo, alunos: [] }
  const headerRow = data[0] as string[]
  const idxNome = headerRow.findIndex((h) => /nome/i.test(String(h ?? '')))
  const idxMat = headerRow.findIndex((h) => /c[óo]digo|matr[íi]cula/i.test(String(h ?? '')))
  const idxDt = headerRow.findIndex((h) => /nascimento|dtnasc/i.test(String(h ?? '')))
  const idxCh = headerRow.findIndex((h) => /chamada/i.test(String(h ?? '')))

  const alunos: AlunoRow[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue
    const nome = String(row[idxNome] ?? '').trim()
    const mat = String(row[idxMat] ?? '').trim()
    if (!nome || !mat) continue
    alunos.push({
      chamada: idxCh >= 0 && row[idxCh] != null ? parseInt(String(row[idxCh])) : null,
      matricula: mat,
      nome,
      dataNascimento: idxDt >= 0 ? parseDateBR(row[idxDt]) : null,
    })
  }
  return { turmaInfo, alunos }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
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

    const summary: Array<{
      file: string
      turma: string | null
      ano?: number
      total: number
      criados: number
      atualizados: number
      erros: string[]
    }> = []

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
      const { turmaInfo, alunos } = parseSheet(wb)

      const entry = {
        file: file.name,
        turma: turmaInfo?.nome ?? null,
        ano: turmaInfo?.ano,
        total: alunos.length,
        criados: 0,
        atualizados: 0,
        erros: [] as string[],
      }
      summary.push(entry)

      if (!turmaInfo) {
        entry.erros.push('Não foi possível ler a célula R8 (turma).')
        continue
      }

      // Upsert da turma vinculada ao ano letivo ativo
      const turma = await prisma.turma.upsert({
        where: { name: turmaInfo.nome },
        update: { anoLetivoId: anoLetivo.id },
        create: { name: turmaInfo.nome, anoLetivoId: anoLetivo.id },
      })

      for (const a of alunos) {
        try {
          const existing = await prisma.aluno.findFirst({
            where: { OR: [{ matricule: a.matricula }, { name: a.nome, turmaId: turma.id }] },
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

    return NextResponse.json({ ok: true, anoLetivo: anoLetivo.ano, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[POST /api/admin/alunos/upload-excel]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
