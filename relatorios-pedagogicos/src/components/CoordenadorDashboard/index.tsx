// src/components/CoordenadorDashboard/index.tsx
'use client';

import { useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import AlunosSection from './AlunosSection';

const tabs = [
  { id: 'alunos', label: 'Alunos' },
  { id: 'professores', label: 'Professores' },
  { id: 'turmas', label: 'Turmas' },
  { id: 'materias', label: 'Matérias' },
  { id: 'relatorios', label: 'Relatórios' },
];

export default function CoordenadorDashboard() {
  const [tabAtiva, setTabAtiva] = useState<string>('alunos');

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Dashboard do Coordenador</h1>
      <p className="text-center text-gray-500 mb-6">
        Visualize e acompanhe os relatórios pedagógicos Individualizados.
      </p>
      <PageBreadcrumb pageTitle="Plano Pedagógico Individualizado (PPI) - Coordenador" />
      <div className="p-5 shadow-lg border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      {/* Abas */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`px-4 py-2 border-b-2 ${
                tabAtiva === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-blue-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da aba selecionada */}
      <div className="mt-6">
        {tabAtiva === 'alunos' && <AlunosSection />}
        {tabAtiva === 'professores' && (
          <div className="text-center text-gray-400">Seção de Professores (em breve)</div>
        )}
        {tabAtiva === 'turmas' && (
          <div className="text-center text-gray-400">Seção de Turmas (em breve)</div>
        )}
        {tabAtiva === 'materias' && (
          <div className="text-center text-gray-400">Seção de Matérias (em breve)</div>
        )}
        {tabAtiva === 'relatorios' && (
          <div className="text-center text-gray-400">Seção de Relatórios (em breve)</div>
        )}
      </div>

      
    </div>
    </div>
  );
}
