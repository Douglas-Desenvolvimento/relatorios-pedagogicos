// src/components/CoordenadorDashboard/RelatoriosSection/index.tsx
'use client';

import { useState, useEffect } from 'react';

interface Relatorio {
  id: number;
  conteudo: string;
  status: string;
  createdAt: string;
  aluno: {
    id: number;
    name: string;
    turma: {
      name: string;
    };
  };
  professor: {
    name: string;
  };
  materia: {
    name: string;
  };
}

export default function RelatoriosSection() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarRelatorios();
  }, []);

  const carregarRelatorios = async () => {
    try {
      const response = await fetch('/api/relatorios');
      if (response.ok) {
        const data = await response.json();
        setRelatorios(data);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    try {
      const response = await fetch(`/api/relatorios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRelatorios(relatorios.filter(r => r.id !== id));
      } else {
        alert('Erro ao excluir relatório');
      }
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      alert('Erro ao excluir relatório');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando relatórios...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestão de Relatórios</h2>
        <div className="text-sm text-gray-500">
          Total: {relatorios.length} relatório(s)
        </div>
      </div>

      <div className="space-y-4">
        {relatorios.map((relatorio) => (
          <div key={relatorio.id} className="border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {relatorio.aluno.name} - {relatorio.aluno.turma.name}
                </h3>
                <p className="text-gray-600">
                  Professor: {relatorio.professor.name} | Matéria: {relatorio.materia.name}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Status: <span className={`font-medium ${
                    relatorio.status === 'ENVIADO' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {relatorio.status}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Criado em: {new Date(relatorio.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <p className="mt-2 text-gray-700">
                  {relatorio.conteudo.substring(0, 200)}...
                </p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => alert('Editar em desenvolvimento')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(relatorio.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}

        {relatorios.length === 0 && (
          <div className="text-center text-gray-500 py-8 border rounded-lg">
            Nenhum relatório encontrado
          </div>
        )}
      </div>
    </div>
  );
}