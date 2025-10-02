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
        console.log('📊 Dados recebidos da API:', data); // DEBUG
        setRelatorios(data);
      } else {
        console.error('Erro na resposta da API:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função segura para renderizar
  const renderRelatorio = (relatorio: Relatorio) => {
    try {
      return (
        <div key={relatorio.id} className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {/* Acessos seguros com fallbacks */}
                {relatorio.aluno?.name || 'Aluno não encontrado'} - {relatorio.aluno?.turma?.name || 'Turma não encontrada'}
              </h3>
              <p className="text-gray-600">
                Professor: {relatorio.professor?.name || 'Professor não encontrado'} | 
                Matéria: {relatorio.materia?.name || 'Matéria não encontrada'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Status: <span className={`font-medium ${
                  relatorio.status === 'ENVIADO' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {relatorio.status || 'STATUS_INDEFINIDO'}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Criado em: {relatorio.createdAt ? new Date(relatorio.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
              </p>
              <p className="mt-2 text-gray-700">
                {relatorio.conteudo ? relatorio.conteudo.substring(0, 200) + '...' : 'Conteúdo não disponível'}
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
      );
    } catch (error) {
      console.error('Erro ao renderizar relatório:', relatorio, error);
      return (
        <div key={relatorio.id} className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Erro ao carregar relatório ID: {relatorio.id}</p>
        </div>
      );
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
        {relatorios.map(renderRelatorio)}

        {relatorios.length === 0 && (
          <div className="text-center text-gray-500 py-8 border rounded-lg">
            Nenhum relatório encontrado
          </div>
        )}
      </div>
    </div>
  );
}