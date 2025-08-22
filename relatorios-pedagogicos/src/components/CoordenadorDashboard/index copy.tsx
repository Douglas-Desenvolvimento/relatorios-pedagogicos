// src/components/CoordenadorDashboard/index.tsx

'use client';

import { useEffect, useState } from 'react';
import LogoutButton from '../LogoutButton';

interface MateriaResumo {
  id: number;
  name: string;
  codigo: string;
  totalProfessores: number;
  totalRelatorios: number;
  totalTurmas: number;
}

const tabs = [
  { key: 'alunos', label: 'Alunos' },
  { key: 'professores', label: 'Professores' },
  { key: 'turmas', label: 'Turmas' },
  { key: 'materias', label: 'Matérias' },
  { key: 'relatorios', label: 'Relatórios' },
];

export default function CoordenadorDashboard() {
  const [tabAtiva, setTabAtiva] = useState('materias'); // Começa na aba "Matérias"
  const [materias, setMaterias] = useState<MateriaResumo[]>([]);
  const [loadingMaterias, setLoadingMaterias] = useState(false);

  useEffect(() => {
    const fetchMaterias = async () => {
      setLoadingMaterias(true);
      try {
        const res = await fetch('/api/materias');
        if (!res.ok) throw new Error('Erro ao buscar matérias');
        const data = await res.json();
        setMaterias(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMaterias(false);
      }
    };

    if (tabAtiva === 'materias') {
      fetchMaterias();
    }
  }, [tabAtiva]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center">Dashboard do Coordenador</h1>
      <p className="text-center text-gray-500 mt-2">
        Visualize e acompanhe os relatórios pedagógicos.
      </p>

      {/* Tabs */}
      <div className="flex justify-center mt-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabAtiva(tab.key)}
            className={`px-4 py-2 font-medium transition-colors ${
              tabAtiva === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      <div className="mt-8">
        {tabAtiva === 'alunos' && <p>Listagem de alunos será exibida aqui.</p>}

        {tabAtiva === 'professores' && <p>Listagem de professores será exibida aqui.</p>}

        {tabAtiva === 'turmas' && <p>Listagem de turmas será exibida aqui.</p>}

        {tabAtiva === 'materias' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Resumo de Matérias</h2>
            {loadingMaterias ? (
              <p className="text-gray-500">Carregando matérias...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materias.map((materia) => (
                  <div
                    key={materia.id}
                    className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-lg">{materia.name}</h3>
                    <p className="text-sm text-gray-500">{materia.codigo}</p>
                    <ul className="mt-2 text-sm text-gray-700 space-y-1">
                      <li><strong>Professores:</strong> {materia.totalProfessores}</li>
                      <li><strong>Relatórios:</strong> {materia.totalRelatorios}</li>
                      <li><strong>Turmas:</strong> {materia.totalTurmas}</li>
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabAtiva === 'relatorios' && <p>Resumo e análise de relatórios será exibido aqui.</p>}
      </div>

      <div className="text-center mt-10">
        <LogoutButton />
      </div>
    </div>
  );
}
