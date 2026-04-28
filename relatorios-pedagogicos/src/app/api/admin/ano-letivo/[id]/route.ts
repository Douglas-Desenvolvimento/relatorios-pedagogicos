// DELETE /api/admin/ano-letivo/[id] - apaga ano letivo + bimestres + conceitos + relatórios
// (somente ADMIN). NÃO apaga turmas, alunos nem professores. As turmas
// vinculadas ao ano apagado precisam ser re-vinculadas a outro ano letivo
// pelo coordenador depois (até lá ficam apontando para anoLetivoId que
// não existe mais — UI deve filtrar ou alertar).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request)
  if ('response' in guard) return guard.response

  const { id } = await params
  const anoLetivoId = parseInt(id)
  if (isNaN(anoLetivoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const ano = await prisma.anoLetivo.findUnique({ where: { id: anoLetivoId } })
    if (!ano) {
      return NextResponse.json({ error: 'Ano letivo não encontrado' }, { status: 404 })
    }

    let deletedRelatorios = 0
    let deletedConceitos = 0
    let deletedBimestres = 0
    let turmasDesvinculadas = 0

    await prisma.$transaction(async (tx) => {
      const bimestres = await tx.bimestre.findMany({
        where: { anoLetivoId },
        select: { id: true },
      })
      const bimestreIds = bimestres.map((b) => b.id)

      if (bimestreIds.length > 0) {
        const r = await tx.relatorio.deleteMany({
          where: { bimestreId: { in: bimestreIds } },
        })
        deletedRelatorios = r.count

        const c = await tx.conceitoAlunoBimestre.deleteMany({
          where: { bimestreId: { in: bimestreIds } },
        })
        deletedConceitos = c.count

        const b = await tx.bimestre.deleteMany({ where: { anoLetivoId } })
        deletedBimestres = b.count
      }

      // Desvincula turmas (anoLetivoId aponta p/ ano que não existirá mais)
      // Como anoLetivoId é NOT NULL, precisamos transferir para outro ano OU
      // apagar o ano só se nenhuma turma referenciar. Estratégia: apagar
      // turmas órfãs causa cascata destrutiva — em vez disso, vinculamos
      // turmas ao primeiro outro ano letivo existente (se houver). Se não
      // houver, criamos um "ANO_ARQUIVADO".
      const outrosAnos = await tx.anoLetivo.findFirst({
        where: { id: { not: anoLetivoId } },
        orderBy: { ano: 'desc' },
      })

      let destinoId = outrosAnos?.id
      if (!destinoId) {
        const arquivado = await tx.anoLetivo.create({
          data: { ano: 'ARQ', ativo: false },
        })
        destinoId = arquivado.id
      }

      const upd = await tx.turma.updateMany({
        where: { anoLetivoId },
        data: { anoLetivoId: destinoId },
      })
      turmasDesvinculadas = upd.count

      await tx.anoLetivo.delete({ where: { id: anoLetivoId } })
    })

    return NextResponse.json({
      ok: true,
      message:
        `Ano letivo "${ano.ano}" excluído. ` +
        `Relatórios: ${deletedRelatorios}, conceitos: ${deletedConceitos}, ` +
        `bimestres: ${deletedBimestres}, turmas re-vinculadas: ${turmasDesvinculadas}.`,
      deletedRelatorios,
      deletedConceitos,
      deletedBimestres,
      turmasDesvinculadas,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    console.error('[DELETE /api/admin/ano-letivo/:id]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
