// src/components/AdminDashboard/AdministracaoDadosSection/index.tsx
// Seção de "Administração de Dados" - apaga em massa professores, turmas,
// alunos; apaga ano letivo; importa alunos via Excel com preview.
'use client'

import { useEffect, useState } from 'react'
import { FiTrash2, FiAlertTriangle, FiCalendar, FiEye, FiCheck, FiX } from 'react-icons/fi'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'react-toastify'
import Button from '@/components/ui/button/Button'

type AnoLetivo = { id: number; ano: string; ativo: boolean }
type Counts = { professores: number; turmas: number; alunos: number }

type PreviewAluno = {
  chamada: number | null
  matricula: string
  nome: string
  dataNascimento: string | Date | null
}
type PreviewFile = {
  file: string
  sheet: string
  turma: string | null
  ano?: number
  total: number
  preview: PreviewAluno[]
  erros: string[]
}
type PreviewResponse = { ok: boolean; dryRun: boolean; anoLetivo: string; summary: PreviewFile[] }

export default function AdministracaoDadosSection() {
  const [counts, setCounts] = useState<Counts>({ professores: 0, turmas: 0, alunos: 0 })
  const [anos, setAnos] = useState<AnoLetivo[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    description: string
    targetLabel: string // texto que precisa ser digitado para confirmar
    onConfirm: () => Promise<void>
  } | null>(null)
  const [confirmInput, setConfirmInput] = useState('')

  // Preview de upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const [countsRes, anosRes] = await Promise.all([
        fetch('/api/admin/counts'),
        fetch('/api/ano-letivo'),
      ])
      if (countsRes.ok) {
        const c = await countsRes.json()
        setCounts({
          professores: c.professores || 0,
          turmas: c.turmas || 0,
          alunos: c.alunos || 0,
        })
      }
      const anosList = anosRes.ok ? await anosRes.json() : []
      setAnos(Array.isArray(anosList) ? anosList : [])
    } catch (err) {
      console.error(err)
    }
  }

  async function bulkDelete(target: 'professores' | 'turmas' | 'alunos') {
    setBusy(target)
    try {
      const res = await fetch(`/api/admin/${target}/bulk-delete`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Concluído')
        await refresh()
      } else {
        toast.error(data.error || 'Erro')
      }
    } catch {
      toast.error('Falha de rede')
    } finally {
      setBusy(null)
    }
  }

  async function deleteAno(ano: AnoLetivo) {
    setBusy(`ano-${ano.id}`)
    try {
      const res = await fetch(`/api/admin/ano-letivo/${ano.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Ano letivo apagado')
        await refresh()
      } else toast.error(data.error || 'Erro')
    } finally {
      setBusy(null)
    }
  }

  // === Upload de alunos com preview obrigatório ===
  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    setPendingFiles(Array.from(files))
    runPreview(Array.from(files))
  }

  async function runPreview(files: File[]) {
    setPreviewBusy(true)
    try {
      const fd = new FormData()
      for (const f of files) fd.append('files', f)
      fd.append('dryRun', '1')
      const res = await fetch('/api/admin/alunos/upload-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao ler arquivos')
        setPreviewData(null)
        return
      }
      setPreviewData(data)
    } catch {
      toast.error('Falha de rede ao pré-visualizar')
    } finally {
      setPreviewBusy(false)
    }
  }

  async function confirmImport() {
    if (pendingFiles.length === 0) return
    setBusy('upload-alunos')
    try {
      const fd = new FormData()
      for (const f of pendingFiles) fd.append('files', f)
      const res = await fetch('/api/admin/alunos/upload-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        toast.success('Importação concluída com sucesso')
        setPreviewData(null)
        setPendingFiles([])
        await refresh()
      } else toast.error(data.error || 'Erro')
    } catch {
      toast.error('Falha de rede')
    } finally {
      setBusy(null)
    }
  }

  function cancelImport() {
    setPreviewData(null)
    setPendingFiles([])
  }

  function openConfirm(target: 'professores' | 'turmas' | 'alunos', label: string, count: number) {
    setConfirmInput('')
    const targetLabel = `APAGAR ${label.toUpperCase()}`
    setConfirmAction({
      title: `⚠️ ATENÇÃO — Você está prestes a apagar TODOS os ${label}!`,
      description:
        `Esta operação é IRREVERSÍVEL e afetará ${count} registro(s) de ${label}, ` +
        `assim como todos os relatórios e conceitos vinculados. ` +
        `Para confirmar, digite EXATAMENTE: ${targetLabel}`,
      targetLabel,
      onConfirm: async () => bulkDelete(target),
    })
  }

  function openConfirmAno(ano: AnoLetivo) {
    setConfirmInput('')
    const targetLabel = `APAGAR ANO ${ano.ano}`
    setConfirmAction({
      title: `⚠️ Apagar o ano letivo "${ano.ano}"?`,
      description:
        `Todos os relatórios, conceitos e bimestres deste ano serão apagados. ` +
        `Turmas, alunos e professores são preservados. ` +
        `Para confirmar, digite EXATAMENTE: ${targetLabel}`,
      targetLabel,
      onConfirm: async () => deleteAno(ano),
    })
  }

  return (
    <div className="space-y-6" data-testid="admin-administracao-dados">
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-4 rounded-lg flex items-start gap-3">
        <FiAlertTriangle size={24} className="flex-shrink-0 mt-1" />
        <div className="text-sm">
          <strong>Atenção:</strong> as ações desta seção são <strong>destrutivas</strong>.
          Cada operação requer confirmação digitada. Todas as ações são registradas na auditoria.
        </div>
      </div>

      {/* Cards de contagem (SEM RELATÓRIOS) */}
      <div className="grid grid-cols-3 gap-4">
        <CountCard label="Professores" value={counts.professores} />
        <CountCard label="Turmas" value={counts.turmas} />
        <CountCard label="Alunos" value={counts.alunos} />
      </div>

      {/* Bloco Professores (apenas apagar — upload em backlog) */}
      <BulkCard
        title="Professores"
        description="Apaga TODOS os professores, vínculos M:N e relatórios."
        count={counts.professores}
        busy={busy === 'professores'}
        onDelete={() => openConfirm('professores', 'professores', counts.professores)}
        testId="bulk-professores"
      />

      {/* Bloco Turmas (apenas apagar — upload em backlog) */}
      <BulkCard
        title="Turmas"
        description="Apaga TODAS as turmas, alunos vinculados (soft-delete), relatórios e conceitos."
        count={counts.turmas}
        busy={busy === 'turmas'}
        onDelete={() => openConfirm('turmas', 'turmas', counts.turmas)}
        testId="bulk-turmas"
      />

      {/* Bloco Alunos com upload ACIMA */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800" data-testid="bulk-alunos">
        <h3 className="text-lg font-semibold mb-1">Alunos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Soft-delete (active=false + deleted_at). Relatórios marcados com data de deleção.
        </p>

        {/* IMPORTAR (acima) */}
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 mb-4">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">📥 Importar alunos via Excel</h4>
          <p className="text-xs text-gray-500 mb-3">
            Aceita 1+ arquivos. <strong>Cada aba (sheet) do arquivo = 1 turma.</strong>
            O nº da turma é detectado automaticamente do <strong>nome da aba</strong>
            (ex: &ldquo;6º ano 1601&rdquo; → turma 1601, 6º ano). Cabeçalho na linha 10,
            dados a partir da linha 11. Você verá um <strong>preview</strong> antes da importação.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={previewBusy || busy === 'upload-alunos'}
            className="block w-full text-sm border rounded p-2"
            data-testid="bulk-alunos-upload-input"
          />
          {previewBusy ? <p className="text-sm text-gray-500 mt-2">📑 Lendo arquivos...</p> : null}
        </div>

        {/* APAGAR (abaixo) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
          <div className="text-sm">
            Total ativo: <strong>{counts.alunos}</strong>
          </div>
          <Button
            onClick={() => openConfirm('alunos', 'alunos', counts.alunos)}
            disabled={busy === 'alunos' || counts.alunos === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="bulk-alunos-delete-btn"
          >
            <FiTrash2 className="inline mr-1" />
            {busy === 'alunos' ? 'Apagando...' : 'Apagar TODOS os alunos'}
          </Button>
        </div>
      </div>

      {/* Anos letivos */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <FiCalendar size={20} />
          <h3 className="text-lg font-semibold">Anos Letivos</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Apaga apenas <strong>relatórios, conceitos e bimestres</strong> do ano. Turmas/alunos/professores são preservados.
        </p>
        <div className="space-y-2">
          {anos.map((a) => (
            <div key={a.id} className="flex items-center justify-between border rounded p-2 bg-gray-50 dark:bg-gray-700">
              <div>
                <span className="font-mono font-semibold">{a.ano}</span>
                {a.ativo ? <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">ATIVO</span> : null}
              </div>
              <Button
                onClick={() => openConfirmAno(a)}
                disabled={busy === `ano-${a.id}`}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                data-testid={`btn-delete-ano-${a.id}`}
              >
                <FiTrash2 className="inline mr-1" /> Apagar
              </Button>
            </div>
          ))}
          {anos.length === 0 ? <p className="text-sm text-gray-400">Nenhum ano letivo cadastrado.</p> : null}
        </div>
      </div>

      {/* === Modal de PREVIEW de upload === */}
      <Dialog.Root open={!!previewData} onOpenChange={(o) => !o && cancelImport()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg w-[95%] max-w-5xl max-h-[90vh] flex flex-col z-50">
            <div className="p-4 border-b flex items-center justify-between">
              <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                <FiEye /> Pré-visualização da importação
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-500"><FiX size={20} /></button>
              </Dialog.Close>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Confira os dados abaixo. Nada foi gravado ainda. Ao confirmar, todos os
                alunos serão criados ou atualizados (upsert por matrícula).
              </p>
              {previewData?.summary?.map((file, idx) => (
                <div key={idx} className="mb-5 border rounded">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 text-sm flex justify-between items-center">
                    <span>
                      <strong>📄 {file.file}</strong>
                      <span className="ml-2 text-gray-500">→ aba <code>{file.sheet}</code></span>
                      {file.turma ? (
                        <span className="ml-3 text-blue-700">Turma <strong>{file.turma}</strong> ({file.ano}º ano)</span>
                      ) : (
                        <span className="ml-3 text-red-600">⚠️ Turma não detectada</span>
                      )}
                    </span>
                    <span className="text-gray-600">{file.total} alunos</span>
                  </div>
                  {file.erros.length > 0 ? (
                    <div className="bg-red-50 text-red-700 p-2 text-xs">
                      Erros: {file.erros.join('; ')}
                    </div>
                  ) : null}
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-600 sticky top-0">
                        <tr>
                          <th className="p-1 text-left">#</th>
                          <th className="p-1 text-left">Matrícula</th>
                          <th className="p-1 text-left">Nome</th>
                          <th className="p-1 text-left">Data Nasc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.preview.map((a, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1">{a.chamada ?? '-'}</td>
                            <td className="p-1 font-mono">{a.matricula}</td>
                            <td className="p-1">{a.nome}</td>
                            <td className="p-1">
                              {a.dataNascimento
                                ? new Date(a.dataNascimento).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
              <button onClick={cancelImport} className="px-4 py-2 rounded bg-gray-300 text-gray-800" data-testid="btn-cancel-import">
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={busy === 'upload-alunos'}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                data-testid="btn-confirm-import"
              >
                <FiCheck className="inline mr-1" />
                {busy === 'upload-alunos' ? 'Importando...' : 'Confirmar e importar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* === Confirmação ALARMANTE para deletes === */}
      <AlertDialog.Root
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmAction(null)
            setConfirmInput('')
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-50 dark:bg-red-950 border-4 border-red-500 p-6 rounded-lg max-w-lg w-[92%] z-50 shadow-2xl">
            <AlertDialog.Title className="text-2xl font-extrabold text-red-700 flex items-center gap-2">
              <FiAlertTriangle size={32} className="animate-pulse" />
              {confirmAction?.title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-red-900 dark:text-red-200 mt-3 leading-relaxed">
              {confirmAction?.description}
            </AlertDialog.Description>
            <div className="mt-4">
              <label className="block text-xs font-bold text-red-800 mb-1">
                Digite <code className="bg-red-200 px-1 rounded">{confirmAction?.targetLabel}</code> para liberar o botão:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full p-2 border-2 border-red-400 rounded font-mono text-sm bg-white"
                autoFocus
                data-testid="confirm-text-input"
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800" data-testid="btn-cancel-destructive">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
              <button
                disabled={confirmInput.trim() !== confirmAction?.targetLabel}
                className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                onClick={async () => {
                  const action = confirmAction
                  setConfirmAction(null)
                  setConfirmInput('')
                  if (action) await action.onConfirm()
                }}
                data-testid="confirm-destructive-action"
              >
                CONFIRMAR EXCLUSÃO
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}

function BulkCard({
  title,
  description,
  count,
  busy,
  onDelete,
  testId,
}: {
  title: string
  description: string
  count: number
  busy: boolean
  onDelete: () => void
  testId: string
}) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800" data-testid={testId}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
          <p className="text-xs text-gray-400 italic mt-1">
            (Upload via Excel: em desenvolvimento — modelo de planilha pendente)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Total: <strong>{count}</strong></span>
          <Button
            onClick={onDelete}
            disabled={busy || count === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid={`${testId}-delete-btn`}
          >
            <FiTrash2 className="inline mr-1" />
            {busy ? 'Apagando...' : 'Apagar todos'}
          </Button>
        </div>
      </div>
    </div>
  )
}
