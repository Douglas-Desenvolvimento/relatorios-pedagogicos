// src/components/AdminDashboard/AuditoriaLoginSection/index.tsx
'use client'

import { useEffect, useState } from 'react'
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiFilter } from 'react-icons/fi'
import Button from '@/components/ui/button/Button'

type AuditItem = {
  id: number
  userId: number | null
  professorId: number | null
  nome: string | null
  role: string
  identifier: string
  ip: string | null
  userAgent: string | null
  success: boolean
  message: string | null
  executedData: string | null
  createdAt: string
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  COORDENADOR: 'bg-blue-100 text-blue-800',
  PROFESSOR: 'bg-green-100 text-green-800',
  UNKNOWN: 'bg-gray-100 text-gray-700',
}

export default function AuditoriaLoginSection() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<string>('')
  const [onlyFailures, setOnlyFailures] = useState(false)

  useEffect(() => {
    load()
  }, [filterRole, onlyFailures])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '200')
      if (filterRole) params.set('role', filterRole)
      if (onlyFailures) params.set('failures', '1')
      const res = await fetch(`/api/admin/login-audit?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="admin-auditoria-section">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border rounded p-2 text-sm"
            data-testid="audit-role-filter"
          >
            <option value="">Todas as roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="COORDENADOR">COORDENADOR</option>
            <option value="PROFESSOR">PROFESSOR</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFailures} onChange={(e) => setOnlyFailures(e.target.checked)} data-testid="audit-only-fail" />
          Só falhas
        </label>
        <Button onClick={load} className="ml-auto" data-testid="btn-refresh-audit">
          <FiRefreshCw className="inline mr-1" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="p-2">Data/hora</th>
                <th className="p-2">Status</th>
                <th className="p-2">Role</th>
                <th className="p-2">Identifier / Ação</th>
                <th className="p-2">Nome</th>
                <th className="p-2">IP</th>
                <th className="p-2">Mensagem</th>
                <th className="p-2">Executado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <AuditRow key={it.id} item={it} />
              ))}
              {items.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AuditRow({ item }: { item: AuditItem }) {
  const [open, setOpen] = useState(false)
  const isAction = item.identifier?.startsWith('BULK_') || item.identifier?.startsWith('UPLOAD_') || item.identifier?.startsWith('DELETE_') || item.identifier?.startsWith('CREATE_')
  return (
    <>
      <tr className="border-t">
        <td className="p-2 text-xs text-gray-600">
          {new Date(item.createdAt).toLocaleString('pt-BR')}
        </td>
        <td className="p-2">
          {item.success ? (
            <span className="inline-flex items-center gap-1 text-green-700">
              <FiCheckCircle /> OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-700">
              <FiXCircle /> Falha
            </span>
          )}
        </td>
        <td className="p-2">
          <span className={`text-xs px-2 py-1 rounded ${roleColors[item.role] || 'bg-gray-100'}`}>{item.role}</span>
        </td>
        <td className="p-2 font-mono text-xs">
          {isAction ? (
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800">{item.identifier}</span>
          ) : item.identifier}
        </td>
        <td className="p-2">{item.nome || '-'}</td>
        <td className="p-2 font-mono text-xs">{item.ip || '-'}</td>
        <td className="p-2 text-xs text-gray-500">{item.message || '-'}</td>
        <td className="p-2 text-xs">
          {item.executedData ? (
            <button
              onClick={() => setOpen(!open)}
              className="text-blue-600 hover:underline"
              data-testid={`audit-toggle-${item.id}`}
            >
              {open ? 'ocultar' : 'ver detalhes'}
            </button>
          ) : '-'}
        </td>
      </tr>
      {open && item.executedData ? (
        <tr className="bg-gray-50 dark:bg-gray-900">
          <td colSpan={8} className="p-3">
            <pre className="text-xs overflow-auto max-h-72 bg-white dark:bg-gray-800 border rounded p-2">
              {(() => {
                try { return JSON.stringify(JSON.parse(item.executedData), null, 2) }
                catch { return item.executedData }
              })()}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  )
}
