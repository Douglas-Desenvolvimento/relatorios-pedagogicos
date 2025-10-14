// src/components/ProfessorDashboard/index.tsx
'use client';

import { useState, useEffect } from 'react';
import { FiFileText, FiList, FiMenu, FiX } from 'react-icons/fi';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import CriarRelatorioSection from './CriarRelatorioSection';
import RelatoriosEnviadosSection from './RelatoriosEnviadosSection';

const menuItems = [
  { id: 'criar', label: 'Criar Relatório', icon: FiFileText },
  { id: 'enviados', label: 'Relatórios Enviados', icon: FiList },
];

interface ProfessorDashboardProps {
  professor: any;
}

export default function ProfessorDashboard({ professor }: ProfessorDashboardProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<string>('criar');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [bimestreAtivo, setBimestreAtivo] = useState<any>(null);

  useEffect(() => {
    loadBimestreAtivo();
  }, []);

  const loadBimestreAtivo = async () => {
    try {
      const res = await fetch('/api/ano-letivo');
      if (res.ok) {
        const anos = await res.json();
        const anoAtivo = anos.find((a: any) => a.ativo);
        const bimestre = anoAtivo?.bimestres?.find((b: any) => b.ativo);
        setBimestreAtivo(bimestre);
      }
    } catch (error) {
      console.error('Erro ao carregar bimestre:', error);
    }
  };

  const secaoAtual = menuItems.find(item => item.id === secaoAtiva);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Mobile */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Dashboard Professor</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{professor.name}</p>
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
          lg:translate-x-0 w-64 lg:w-72
        `}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Professor</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{professor.name}</p>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-5rem)]">
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
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Info do Bimestre Corrente */}
            {bimestreAtivo && (
              <div className="mt-6 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                  Bimestre Corrente
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {bimestreAtivo.numero}º Bimestre
                </p>
              </div>
            )}
          </nav>
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
          <div className="mb-6 hidden lg:block">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {secaoAtual && <secaoAtual.icon size={28} />}
                  {secaoAtual?.label || 'Dashboard'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Gerencie seus relatórios pedagógicos
                </p>
              </div>
            </div>
            <PageBreadcrumb pageTitle={`Professor - ${secaoAtual?.label}`} />
          </div>

          {/* Content Area */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            {secaoAtiva === 'criar' && <CriarRelatorioSection professor={professor} bimestreAtivo={bimestreAtivo} />}
            {secaoAtiva === 'enviados' && <RelatoriosEnviadosSection professor={professor} />}
          </div>
        </main>
      </div>
    </div>
  );
}
