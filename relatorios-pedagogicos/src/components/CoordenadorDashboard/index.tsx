// src/components/CoordenadorDashboard/index.tsx
'use client';

import { useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

// Importações dinâmicas para evitar erros
const RelatoriosSection = () => import('./RelatoriosSection').then(mod => mod.default);
const ProfessoresSection = () => import('./ProfessoresSection').then(mod => mod.default);
const AlunosSection = () => import('./AlunosSection').then(mod => mod.default);
const TurmasSection = () => import('./TurmasSection').then(mod => mod.default);

const tabs = [
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'professores', label: 'Professores' },
  { id: 'alunos', label: 'Alunos' },
  { id: 'turmas', label: 'Turmas' },
];

// Componentes de fallback
const LoadingSection = () => <div className="text-center py-8">Carregando...</div>;
const ErrorSection = ({ message }: { message: string }) => (
  <div className="text-center text-gray-500 py-8">{message}</div>
);

export default function CoordenadorDashboard() {
  const [tabAtiva, setTabAtiva] = useState<string>('relatorios');
  const [ComponenteAtivo, setComponenteAtivo] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);

  const carregarComponente = async (tabId: string) => {
    setLoading(true);
    setComponenteAtivo(null);

    try {
      let componente;
      
      switch (tabId) {
        case 'relatorios':
          componente = await RelatoriosSection();
          break;
        case 'professores':
          componente = await ProfessoresSection();
          break;
        case 'alunos':
          componente = await AlunosSection();
          break;
        case 'turmas':
          componente = await TurmasSection();
          break;
        default:
          componente = null;
      }
      
      setComponenteAtivo(() => componente);
    } catch (error) {
      console.error(`Erro ao carregar componente ${tabId}:`, error);
      setComponenteAtivo(() => () => <ErrorSection message={`Erro ao carregar ${tabId}`} />);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    setTabAtiva(tabId);
    carregarComponente(tabId);
  };

  // Carrega o componente inicial
  useState(() => {
    carregarComponente('relatorios');
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Dashboard do Coordenador</h1>
      <p className="text-center text-gray-500 mb-6">
        Gerencie relatórios pedagógicos individualizados
      </p>
      <PageBreadcrumb pageTitle="Plano Pedagógico Individualizado (PPI) - Coordenador" />
      
      <div className="p-5 shadow-lg border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        {/* Abas */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  tabAtiva === tab.id
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da aba selecionada */}
        <div className="mt-6">
          {loading && <LoadingSection />}
          {ComponenteAtivo && !loading && <ComponenteAtivo />}
          {!ComponenteAtivo && !loading && (
            <ErrorSection message="Selecione uma aba para carregar o conteúdo" />
          )}
        </div>
      </div>
    </div>
  );
}