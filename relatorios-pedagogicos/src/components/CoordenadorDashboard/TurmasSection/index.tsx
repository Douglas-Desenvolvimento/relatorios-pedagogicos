// src/components/CoordenadorDashboard/index.tsx
'use client';

import { useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import RelatoriosSection from '../RelatoriosSection';
import ProfessoresSection from '../ProfessoresSection';
import AlunosSection from '../AlunosSection';
import TurmasSection from '../TurmasSection';
import MateriasSection from '../MateriasSection';

const tabs = [
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'professores', label: 'Professores' },
  { id: 'alunos', label: 'Alunos' },
  { id: 'turmas', label: 'Turmas' },
  { id: 'materias', label: 'Matérias' },
];

export default function CoordenadorDashboard() {
  const [tabAtiva, setTabAtiva] = useState<string>('relatorios');

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
                onClick={() => setTabAtiva(tab.id)}
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
          {tabAtiva === 'relatorios' && <RelatoriosSection />}
          {tabAtiva === 'professores' && <ProfessoresSection />}
          {tabAtiva === 'alunos' && <AlunosSection />}
          {tabAtiva === 'turmas' && <TurmasSection />}
          {tabAtiva === 'materias' && <MateriasSection />}
        </div>
      </div>
    </div>
  );
}