// src/components/CoordenadorDashboard/ProfessoresSection/index.tsx
'use client';

import { useState, useEffect } from 'react';

interface Professor {
  id: number;
  name: string;
  email: string;
  matricula: string;
  turmas: {
    name: string;
  }[];
  materias: {
    name: string;
  }[];
  _count: {
    relatorios: number;
  };
}

interface RelatorioPorMateria {
  materia: string;
  quantidade: number;
}

export default function ProfessoresSection() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarProfessores();
  }, []);

  const carregarProfessores = async () => {
    try {
      const response = await fetch('/api/professores?include=relatorios');
      if (response.ok) {
        const data = await response.json();
        setProfessores(data);
      }
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelatoriosPorMateria = (professor: Professor): RelatorioPorMateria[] => {
    // Simulação - você precisará ajustar conforme sua API
    return professor.materias.map(materia => ({
      materia: materia.name,
      quantidade: Math.floor(Math.random() * 5) + 1 // Exemplo
    }));
  };

  if (loading) {
    return <div className="text-center">Carregando professores...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestão de Professores</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Novo Professor
        </button>
      </div>

      <div className="space-y-6">
        {professores.map((professor) => (
          <div key={professor.id} className="border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-xl">{professor.name}</h3>
                <p className="text-gray-600">{professor.email}</p>
                <p className="text-sm text-gray-500">Matrícula: {professor.matricula}</p>
              </div>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800">Editar</button>
                <button className="text-red-600 hover:text-red-800">Excluir</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Turmas:</h4>
                <div className="flex flex-wrap gap-1">
                  {professor.turmas.map((turma, index) => (
                    <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {turma.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Relatórios por matéria:</h4>
                {getRelatoriosPorMateria(professor).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span>Matéria: {item.materia}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {item.quantidade} relatório(s)
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t">
                  <strong>Total: {professor._count?.relatorios || 0} relatório(s)</strong>
                </div>
              </div>
            </div>
          </div>
        ))}

        {professores.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Nenhum professor encontrado
          </div>
        )}
      </div>
    </div>
  );
}