// src/components/AdminDashboard/UsuariosSection/index.tsx
// CRUD de usuarios (admin / coordenador / professor) para perfil ADMIN.
'use client'

import { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { toast } from 'react-toastify'
import Button from '@/components/ui/button/Button'

type Role = 'ADMIN' | 'COORDENADOR' | 'PROFESSOR'

type Usuario = {
  id: number
  nome: string
  email: string
  matricula: string
  login: string | null
  role: Role
  active: boolean
  mustChangePassword: boolean
  idTbProfessor: number | null
  professor?: { id: number; materiaIds: number[]; turmaIds: number[] } | null
  lastLoginAt?: string | null
}

type Materia = { id: number; name: string }
type Turma = { id: number; name: string }

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  COORDENADOR: 'bg-blue-100 text-blue-800',
  PROFESSOR: 'bg-green-100 text-green-800',
}

const emptyForm = {
  nome: '',
  email: '',
  matricula: '',
  login: '',
  password: '',
  role: 'COORDENADOR' as Role,
  active: true,
  materiaIds: [] as number[],
  turmaIds: [] as number[],
}

export default function UsuariosSection() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState<Usuario | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    load()
    loadMateriasTurmas()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/usuarios')
      if (res.ok) setUsers(await res.json())
      else toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  async function loadMateriasTurmas() {
    try {
      const [materiasRes, turmasRes] = await Promise.all([
        fetch('/api/materias'),
        fetch('/api/turmas'),
      ])
      if (materiasRes.ok) setMaterias(await materiasRes.json())
      if (turmasRes.ok) setTurmas(await turmasRes.json())
    } catch {
      toast.error('Erro ao carregar matérias e turmas')
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(u: Usuario) {
    setEditing(u)
    setForm({
      nome: u.nome,
      email: u.email,
      matricula: u.matricula,
      login: u.login || '',
      password: '',
      role: u.role,
      active: u.active,
      materiaIds: u.professor?.materiaIds || [],
      turmaIds: u.professor?.turmaIds || [],
    })
    setShowModal(true)
  }

  function toggleId(field: 'materiaIds' | 'turmaIds', id: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], id]
        : current[field].filter((value) => value !== id),
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const url = editing ? `/api/admin/usuarios/${editing.id}` : '/api/admin/usuarios'
    const method = editing ? 'PUT' : 'POST'
    const body: Record<string, unknown> = {
      nome: form.nome,
      email: form.email,
      matricula: form.matricula,
      login: form.login || undefined,
      role: form.role,
      active: form.active,
    }
    if (form.password) body.password = form.password
    if (form.role === 'PROFESSOR') {
      body.materiaIds = form.materiaIds
      body.turmaIds = form.turmaIds
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      if (data.defaultPasswordUsed) {
        toast.success('Usuário criado. Senha inicial: 123@ppi; será exigida nova senha no primeiro login.')
      } else {
        toast.success(editing ? 'Usuário atualizado' : 'Usuário criado')
      }
      setShowModal(false)
      load()
    } else {
      toast.error(data.error || 'Erro ao salvar')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const res = await fetch(`/api/admin/usuarios/${deleting.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Usuário excluído')
      setDeleting(null)
      load()
    } else {
      toast.error(data.error || 'Erro ao excluir')
      setDeleting(null)
    }
  }

  return (
    <div data-testid="admin-usuarios-section">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Gerenciar coordenadores, admins e professores cadastrados em <code>users</code>.</p>
        <Button onClick={openCreate} data-testid="btn-novo-usuario">
          <FiPlus className="inline mr-1" /> Novo Usuário
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="p-2">Nome</th>
                <th className="p-2">Email</th>
                <th className="p-2">Login</th>
                <th className="p-2">Matrícula</th>
                <th className="p-2">Role</th>
                <th className="p-2">Ativo</th>
                <th className="p-2">Senha</th>
                <th className="p-2">Último login</th>
                <th className="p-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2 font-medium">{u.nome}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 font-mono text-xs">{u.login || '-'}</td>
                  <td className="p-2 font-mono text-xs">{u.matricula}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${roleColors[u.role] || 'bg-gray-100'}`}>{u.role}</span>
                  </td>
                  <td className="p-2">{u.active ? 'Ativo' : 'Inativo'}</td>
                  <td className="p-2 text-xs">
                    {u.mustChangePassword === false ? (
                      <span className="text-orange-600 font-medium">primeiro acesso</span>
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-gray-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800" data-testid={`btn-edit-user-${u.id}`}>
                      <FiEdit2 />
                    </button>
                    <button onClick={() => setDeleting(u)} className="text-red-600 hover:text-red-800" data-testid={`btn-delete-user-${u.id}`}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr><td colSpan={9} className="p-4 text-center text-gray-400">Nenhum usuário cadastrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-bold">
                {editing ? 'Editar usuário' : 'Novo usuário'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-500"><FiX size={20} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Nome *</label>
                <input className="w-full p-2 border rounded" value={form.nome} required onChange={(e) => setForm({ ...form, nome: e.target.value })} data-testid="user-form-nome" />
              </div>
              <div>
                <label className="block text-sm mb-1">Email *</label>
                <input type="email" className="w-full p-2 border rounded" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-form-email" />
              </div>
              <div>
                <label className="block text-sm mb-1">Matrícula *</label>
                <input className="w-full p-2 border rounded" value={form.matricula} required onChange={(e) => setForm({ ...form, matricula: e.target.value })} data-testid="user-form-matricula" />
                <p className="text-xs text-gray-400 mt-1">Hífens são ignorados (ex: 271952-4 = 2719524).</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Login</label>
                <input
                  className="w-full p-2 border rounded font-mono"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value.toLowerCase() })}
                  placeholder="Ex: maria.silva (deixe em branco para gerar automaticamente)"
                  data-testid="user-form-login"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{editing ? 'Nova senha (deixe em branco p/ manter)' : 'Senha inicial (deixe em branco para usar 123@ppi)'}</label>
                <input type="password" className="w-full p-2 border rounded" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-form-password" />
                <p className="text-xs text-orange-600 mt-1">
                  O usuário deverá criar uma nova senha no primeiro login.
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">Role *</label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  data-testid="user-form-role"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="COORDENADOR">COORDENADOR</option>
                  <option value="PROFESSOR">PROFESSOR</option>
                </select>
              </div>

              {form.role === 'PROFESSOR' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Matérias</label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                      {materias.map((materia) => (
                        <label key={materia.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                          <input
                            type="checkbox"
                            checked={form.materiaIds.includes(materia.id)}
                            onChange={(e) => toggleId('materiaIds', materia.id, e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">{materia.name}</span>
                        </label>
                      ))}
                      {materias.length === 0 ? <p className="text-sm text-gray-400">Nenhuma matéria cadastrada.</p> : null}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Turmas</label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                      {turmas.map((turma) => (
                        <label key={turma.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                          <input
                            type="checkbox"
                            checked={form.turmaIds.includes(turma.id)}
                            onChange={(e) => toggleId('turmaIds', turma.id, e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">{turma.name}</span>
                        </label>
                      ))}
                      {turmas.length === 0 ? <p className="text-sm text-gray-400">Nenhuma turma cadastrada.</p> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <input id="user-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="user-active" className="text-sm">Ativo</label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">Cancelar</Button>
                <Button type="submit" data-testid="user-form-save">{editing ? 'Salvar' : 'Criar'}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-[92%] z-50">
            <AlertDialog.Title className="text-lg font-bold text-red-700">Excluir usuário?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 mt-2">
              Excluir <strong>{deleting?.nome}</strong> ({deleting?.email})? Esta ação não pode ser desfeita.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded bg-gray-200 text-gray-800">Cancelar</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button onClick={confirmDelete} className="px-4 py-2 rounded bg-red-600 text-white" data-testid="confirm-delete-user">Excluir</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
