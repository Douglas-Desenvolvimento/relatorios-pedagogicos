// components/CoordenadorDashboard/AlunosSection/index.tsx - Versão simplificada
'use client';

import { useState, useEffect } from 'react';

interface Aluno {
  id: number;
  name: string;
  matricule: string;
  active: boolean;
  turma: {
    name: string;
  };
  _count: {
    relatorios: number;
  };
}

export default function AlunosSection() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAlunos();
  }, []);

  const carregarAlunos = async () => {
    try {
      const response = await fetch('/api/alunos?include=count');
      if (response.ok) {
        const data = await response.json();
        setAlunos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  const alunosPorTurma = alunos.reduce((acc, aluno) => {
    const turma = aluno.turma.name;
    if (!acc[turma]) {
      acc[turma] = [];
    }
    acc[turma].push(aluno);
    return acc;
  }, {} as Record<string, Aluno[]>);

  if (loading) {
    return <div className="text-center">Carregando alunos...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestão de Alunos</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Novo Aluno
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(alunosPorTurma).map(([turma, alunosTurma]) => (
          <div key={turma} className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Turma: {turma}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alunosTurma.map((aluno) => (
                <div key={aluno.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{aluno.name}</h4>
                    <div className="flex space-x-1">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Editar
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-sm">
                        Excluir
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    Matrícula: {aluno.matricule}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      aluno.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {aluno.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {aluno._count?.relatorios || 0} relatório(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {alunos.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Nenhum aluno encontrado
          </div>
        )}
      </div>
    </div>
  );
}