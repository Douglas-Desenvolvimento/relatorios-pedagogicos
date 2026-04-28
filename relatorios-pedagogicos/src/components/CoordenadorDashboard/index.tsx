// src/components/CoordenadorDashboard/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiFileText, FiUsers, FiUserCheck, FiBook, FiLayers, FiSettings, FiUpload, FiAlertCircle, FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import RelatoriosSection from './RelatoriosSection';
import ProfessoresSection from './ProfessoresSection';
import AlunosSection from './AlunosSection';
import TurmasSection from './TurmasSection';
import MateriasSection from './MateriasSection';
import ConfiguracoesSection from './ConfiguracoesSection';
import ImportarConceitosSection from './ImportarConceitosSection';
import AlunosRISection from './AlunosRISection';

type MeUser = { id: number; nome: string; role: string; authenticated: boolean }

const menuItems = [
  { id: 'relatorios', label: 'Relatórios', icon: FiFileText },
  { id: 'professores', label: 'Professores', icon: FiUsers },
  { id: 'alunos', label: 'Alunos', icon: FiUserCheck },
  { id: 'turmas', label: 'Turmas', icon: FiBook },
  { id: 'materias', label: 'Matérias', icon: FiLayers },
  { id: 'configuracoes', label: 'Configurações', icon: FiSettings },
  { id: 'importar', label: 'Importar Conceitos', icon: FiUpload },
  { id: 'alunos-ri', label: 'Conceitos Globais', icon: FiAlertCircle },
];

export default function CoordenadorDashboard() {
  const [secaoAtiva, setSecaoAtiva] = useState<string>('relatorios');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [me, setMe] = useState<MeUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.authenticated) setMe(d); })
      .catch(() => {});
  }, []);

  const secaoAtual = menuItems.find(item => item.id === secaoAtiva);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Mobile */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Dashboard Coordenador</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">PPI - Relatórios</p>
        </div>
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
          lg:translate-x-0 w-64 lg:w-72 relative flex flex-col
        `}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Coordenador</p>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = secaoAtiva === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSecaoAtiva(item.id);
                    setSidebarAberta(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  data-testid={`menu-${item.id}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Botão de Sair */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto flex-shrink-0">
            {me ? (
              <div className="px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center gap-2" data-testid="coord-current-user">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  {me.nome?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{me.nome}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-mono">{me.role}</div>
                </div>
              </div>
            ) : null}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <FiLogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </aside>

        {/* Overlay Mobile */}
        {sidebarAberta && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarAberta(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {/* Header Desktop */}
          <div className="mb-6 hidden lg:flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {secaoAtual && <secaoAtual.icon size={28} />}
                {secaoAtual?.label || 'Dashboard'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Gerencie relatórios pedagógicos individualizados
              </p>
              <PageBreadcrumb pageTitle={`PPI - ${secaoAtual?.label}`} />
            </div>
            {me ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm" data-testid="coord-topbar-user">
                <FiUser className="text-gray-500" />
                <span className="font-medium">{me.nome}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">{me.role}</span>
              </div>
            ) : null}
          </div>

          {/* Content Area */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            {secaoAtiva === 'relatorios' && <RelatoriosSection />}
            {secaoAtiva === 'professores' && <ProfessoresSection />}
            {secaoAtiva === 'alunos' && <AlunosSection />}
            {secaoAtiva === 'turmas' && <TurmasSection />}
            {secaoAtiva === 'materias' && <MateriasSection />}
            {secaoAtiva === 'configuracoes' && <ConfiguracoesSection />}
            {secaoAtiva === 'importar' && <ImportarConceitosSection />}
            {secaoAtiva === 'alunos-ri' && <AlunosRISection />}
          </div>
        </main>
      </div>
    </div>
  );
}