// src/components/AdminDashboard/index.tsx
// Dashboard ADMIN: tudo do coordenador + administração de dados, usuários e auditoria.
'use client'

import { useEffect, useState } from 'react'
import {
  FiFileText, FiUsers, FiUserCheck, FiBook, FiLayers, FiSettings,
  FiUpload, FiAlertCircle, FiMenu, FiX, FiLogOut, FiShield, FiActivity, FiUser, FiKey,
} from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'

import RelatoriosSection from '@/components/CoordenadorDashboard/RelatoriosSection'
import ProfessoresSection from '@/components/CoordenadorDashboard/ProfessoresSection'
import AlunosSection from '@/components/CoordenadorDashboard/AlunosSection'
import TurmasSection from '@/components/CoordenadorDashboard/TurmasSection'
import MateriasSection from '@/components/CoordenadorDashboard/MateriasSection'
import ConfiguracoesSection from '@/components/CoordenadorDashboard/ConfiguracoesSection'
import ImportarConceitosSection from '@/components/CoordenadorDashboard/ImportarConceitosSection'
import AlunosRISection from '@/components/CoordenadorDashboard/AlunosRISection'

import AdministracaoDadosSection from './AdministracaoDadosSection'
import UsuariosSection from './UsuariosSection'
import AuditoriaLoginSection from './AuditoriaLoginSection'

type MeUser = {
  id: number
  nome: string
  email?: string
  matricula?: string
  role: string
  authenticated: boolean
}

const menuItems = [
  // Comum (igual coordenador)
  { id: 'relatorios', label: 'Relatórios', icon: FiFileText, group: 'Pedagógico' },
  { id: 'professores', label: 'Professores', icon: FiUsers, group: 'Pedagógico' },
  { id: 'alunos', label: 'Alunos', icon: FiUserCheck, group: 'Pedagógico' },
  { id: 'turmas', label: 'Turmas', icon: FiBook, group: 'Pedagógico' },
  { id: 'materias', label: 'Matérias', icon: FiLayers, group: 'Pedagógico' },
  { id: 'configuracoes', label: 'Configurações', icon: FiSettings, group: 'Pedagógico' },
  { id: 'importar', label: 'Importar Conceitos', icon: FiUpload, group: 'Pedagógico' },
  { id: 'alunos-ri', label: 'Conceitos Globais', icon: FiAlertCircle, group: 'Pedagógico' },
  // Admin-only
  { id: 'admin-dados', label: 'Administração de Dados', icon: FiShield, group: 'Administração' },
  { id: 'admin-usuarios', label: 'Usuários', icon: FiKey, group: 'Administração' },
  { id: 'admin-audit', label: 'Auditoria de Login', icon: FiActivity, group: 'Administração' },
]

export default function AdminDashboard() {
  const [secaoAtiva, setSecaoAtiva] = useState<string>('relatorios')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [me, setMe] = useState<MeUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) setMe(data)
      })
      .catch(() => {})
  }, [])

  const secaoAtual = menuItems.find((i) => i.id === secaoAtiva)

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch {}
    router.push('/login')
  }

  const groups = Array.from(new Set(menuItems.map((i) => i.group)))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Mobile */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Admin</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">PPI - Painel completo</p>
        </div>
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          data-testid="admin-toggle-sidebar"
        >
          {sidebarAberta ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40
          transition-transform duration-300 ease-in-out
          ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64 lg:w-72 flex flex-col
        `}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiShield /> Admin
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Painel completo</p>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            {groups.map((group) => (
              <div key={group} className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 px-3 py-1 font-bold">{group}</div>
                {menuItems.filter((m) => m.group === group).map((item) => {
                  const Icon = item.icon
                  const isActive = secaoAtiva === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSecaoAtiva(item.id); setSidebarAberta(false) }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm
                        ${isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                      data-testid={`admin-menu-${item.id}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Usuário logado + sair */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            {me ? (
              <div className="px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center gap-2" data-testid="admin-current-user">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                  {me.nome?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{me.nome}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-mono">{me.role}</div>
                </div>
              </div>
            ) : null}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm"
              data-testid="admin-logout-btn"
            >
              <FiLogOut size={18} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </aside>

        {sidebarAberta && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarAberta(false)} />
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden min-w-0">
          {/* Topbar desktop com usuário logado */}
          <div className="mb-6 hidden lg:flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {secaoAtual && <secaoAtual.icon size={28} />}
                {secaoAtual?.label || 'Admin'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Painel administrativo PPI</p>
              <PageBreadcrumb pageTitle={`PPI - ${secaoAtual?.label}`} />
            </div>
            {me ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm" data-testid="admin-topbar-user">
                <FiUser className="text-gray-500" />
                <span className="font-medium">{me.nome}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">{me.role}</span>
              </div>
            ) : null}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            {secaoAtiva === 'relatorios' && <RelatoriosSection />}
            {secaoAtiva === 'professores' && <ProfessoresSection />}
            {secaoAtiva === 'alunos' && <AlunosSection />}
            {secaoAtiva === 'turmas' && <TurmasSection />}
            {secaoAtiva === 'materias' && <MateriasSection />}
            {secaoAtiva === 'configuracoes' && <ConfiguracoesSection />}
            {secaoAtiva === 'importar' && <ImportarConceitosSection />}
            {secaoAtiva === 'alunos-ri' && <AlunosRISection />}
            {secaoAtiva === 'admin-dados' && <AdministracaoDadosSection />}
            {secaoAtiva === 'admin-usuarios' && <UsuariosSection />}
            {secaoAtiva === 'admin-audit' && <AuditoriaLoginSection />}
          </div>
        </main>
      </div>
    </div>
  )
}
