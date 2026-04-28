// src/components/AdminDashboard/AdministracaoDadosSection/index.tsx
// Seção de "Administração de Dados" - apaga em massa professores, turmas,
// alunos; apaga ano letivo; importa alunos via Excel.
'use client'

import { useEffect, useState } from 'react'
import { FiTrash2, FiUpload, FiAlertTriangle, FiCalendar } from 'react-icons/fi'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { toast } from 'react-toastify'
import Button from '@/components/ui/button/Button'

type AnoLetivo = { id: number; ano: string; ativo: boolean }
type Counts = { professores: number; turmas: number; alunos: number; relatorios: number }

export default function AdministracaoDadosSection() {
  const [counts, setCounts] = useState<Counts>({ professores: 0, turmas: 0, alunos: 0, relatorios: 0 })
  const [anos, setAnos] = useState<AnoLetivo[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    description: string
    onConfirm: () => Promise<void>
  } | null>(null)
  const [uploadResult, setUploadResult] = useState<unknown>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const [profsRes, turmasRes, alunosRes, anosRes, relatoriosRes] = await Promise.all([
        fetch('/api/professores'),
        fetch('/api/turmas'),
        fetch('/api/alunos?turmaId=__all__').catch(() => null),
        fetch('/api/ano-letivo'),
        fetch('/api/relatorios?count=1').catch(() => null),
      ])
      const profs = profsRes.ok ? await profsRes.json() : []
      const turmas = turmasRes.ok ? await turmasRes.json() : []
      // alunos: API exige turmaId — usamos soma das turmas
      let totalAlunos = 0
      if (Array.isArray(turmas)) {
        for (const t of turmas) {
          totalAlunos += t._count?.alunos || 0
        }
      }
      const anosList = anosRes.ok ? await anosRes.json() : []
      const relatorios = relatoriosRes && relatoriosRes.ok ? await relatoriosRes.json() : []
      setCounts({
        professores: profs.length || 0,
        turmas: turmas.length || 0,
        alunos: totalAlunos,
        relatorios: Array.isArray(relatorios) ? relatorios.length : (relatorios.total || 0),
      })
      setAnos(anosList)
    } catch (err) {
      console.error(err)
    }
  }

  async function bulkDelete(target: 'professores' | 'turmas' | 'alunos', label: string) {
    setBusy(target)
    try {
      const res = await fetch(`/api/admin/${target}/bulk-delete`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `${label} apagados com sucesso`)
        await refresh()
      } else {
        toast.error(data.error || 'Erro ao apagar')
      }
    } catch (err) {
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
      } else {
        toast.error(data.error || 'Erro')
      }
    } finally {
      setBusy(null)
    }
  }

  async function uploadAlunos(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy('upload-alunos')
    setUploadResult(null)
    try {
      const fd = new FormData()
      for (const f of Array.from(files)) fd.append('files', f)
      const res = await fetch('/api/admin/alunos/upload-excel', { method: 'POST', body: fd })
      const data = await res.json()
      setUploadResult(data)
      if (res.ok) {
        toast.success('Importação concluída')
        await refresh()
      } else {
        toast.error(data.error || 'Erro na importação')
      }
    } catch (err) {
      toast.error('Falha de rede no upload')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6" data-testid="admin-administracao-dados">
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-4 rounded-lg flex items-start gap-3">
        <FiAlertTriangle size={24} className="flex-shrink-0 mt-1" />
        <div className="text-sm">
          <strong>Atenção:</strong> as ações desta seção são <strong>destrutivas</strong> e <strong>não podem ser desfeitas</strong>.
          Todas as exclusões em massa removem dados vinculados (relatórios, conceitos, vínculos).
        </div>
      </div>

      {/* Cards de contagem */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CountCard label="Professores" value={counts.professores} />
        <CountCard label="Turmas" value={counts.turmas} />
        <CountCard label="Alunos" value={counts.alunos} />
        <CountCard label="Relatórios" value={counts.relatorios} />
      </div>

      {/* Apagar professores */}
      <BulkCard
        title="Professores"
        description="Apaga TODOS os professores, seus vínculos com matérias/turmas e relatórios."
        count={counts.professores}
        busy={busy === 'professores'}
        onDelete={() => setConfirmAction({
          title: 'Apagar todos os professores?',
          description: `Esta ação remove ${counts.professores} professor(es), todos os vínculos M:N e os relatórios escritos por eles. Não pode ser desfeita.`,
          onConfirm: () => bulkDelete('professores', 'Professores'),
        })}
        uploadEnabled={false}
        testId="bulk-professores"
      />

      {/* Apagar turmas */}
      <BulkCard
        title="Turmas"
        description="Apaga TODAS as turmas e, em cascata, alunos, relatórios, conceitos e vínculos."
        count={counts.turmas}
        busy={busy === 'turmas'}
        onDelete={() => setConfirmAction({
          title: 'Apagar todas as turmas?',
          description: `Remove ${counts.turmas} turma(s) e em cascata: alunos, relatórios, conceitos e vínculos M:N. Operação destrutiva.`,
          onConfirm: () => bulkDelete('turmas', 'Turmas'),
        })}
        uploadEnabled={false}
        testId="bulk-turmas"
      />

      {/* Apagar alunos + upload Excel */}
      <BulkCard
        title="Alunos"
        description="Apaga TODOS os alunos (relatórios e conceitos junto). Use o upload abaixo para repopular via Excel."
        count={counts.alunos}
        busy={busy === 'alunos'}
        onDelete={() => setConfirmAction({
          title: 'Apagar todos os alunos?',
          description: `Remove ${counts.alunos} aluno(s) e em cascata seus relatórios e conceitos. Operação destrutiva.`,
          onConfirm: () => bulkDelete('alunos', 'Alunos'),
        })}
        uploadEnabled
        uploadLabel="Importar alunos via Excel (DocEscRelacaoAlunosTurma.xlsx)"
        uploadHint="Aceita múltiplos arquivos. Cada arquivo = 1 turma (célula R8 = nº da turma; ano = 2º caractere)."
        onUpload={uploadAlunos}
        testId="bulk-alunos"
      />

      {/* Resultado do upload */}
      {uploadResult ? (
        <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2">Resultado da importação:</div>
          <pre className="text-xs overflow-auto max-h-72">{JSON.stringify(uploadResult, null, 2)}</pre>
        </div>
      ) : null}

      {/* Anos letivos */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <FiCalendar size={20} />
          <h3 className="text-lg font-semibold">Anos Letivos</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Apagar um ano letivo remove apenas os <strong>relatórios, conceitos e bimestres</strong> daquele ano.
          Turmas, alunos e professores são preservados (apenas re-vinculados a outro ano letivo).
        </p>
        <div className="space-y-2">
          {anos.map((a) => (
            <div key={a.id} className="flex items-center justify-between border rounded p-2 bg-gray-50 dark:bg-gray-700">
              <div>
                <span className="font-mono font-semibold">{a.ano}</span>
                {a.ativo ? <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">ATIVO</span> : null}
              </div>
              <Button
                onClick={() => setConfirmAction({
                  title: `Apagar ano letivo "${a.ano}"?`,
                  description: 'Todos os relatórios, conceitos e bimestres deste ano serão apagados. Turmas/alunos/professores são preservados.',
                  onConfirm: () => deleteAno(a),
                })}
                disabled={busy === `ano-${a.id}`}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                data-testid={`btn-delete-ano-${a.id}`}
              >
                <FiTrash2 className="inline mr-1" /> Apagar
              </Button>
            </div>
          ))}
          {anos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ano letivo cadastrado.</p>
          ) : null}
        </div>
      </div>

      {/* AlertDialog de confirmação */}
      <AlertDialog.Root open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-[92%] z-50 shadow-xl">
            <AlertDialog.Title className="text-lg font-bold flex items-center gap-2 text-red-700">
              <FiAlertTriangle /> {confirmAction?.title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 mt-2">
              {confirmAction?.description}
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">Cancelar</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    const action = confirmAction
                    setConfirmAction(null)
                    if (action) await action.onConfirm()
                  }}
                  data-testid="confirm-destructive-action"
                >
                  Sim, apagar
                </button>
              </AlertDialog.Action>
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
  uploadEnabled,
  uploadLabel,
  uploadHint,
  onUpload,
  testId,
}: {
  title: string
  description: string
  count: number
  busy: boolean
  onDelete: () => void
  uploadEnabled?: boolean
  uploadLabel?: string
  uploadHint?: string
  onUpload?: (files: FileList | null) => void
  testId: string
}) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800" data-testid={testId}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
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
      {uploadEnabled ? (
        <div className="mt-4 border-t pt-3">
          <label className="block text-sm font-medium mb-1">{uploadLabel}</label>
          {uploadHint ? <p className="text-xs text-gray-400 mb-2">{uploadHint}</p> : null}
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => onUpload?.(e.target.files)}
            disabled={busy}
            className="block w-full text-sm border rounded p-2"
            data-testid={`${testId}-upload-input`}
          />
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-400 italic">
          (Upload via Excel: em desenvolvimento — modelo de planilha pendente)
        </div>
      )}
    </div>
  )
}
