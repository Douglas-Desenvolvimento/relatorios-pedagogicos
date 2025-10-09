// src/components/CoordenadorDashboard/TurmasSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, Pencil2Icon, TrashIcon, PlusIcon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';

interface Turma {
  id: number;
  name: string;
  alunos: any[];
  professores: any[];
  materias: any[];
  _count?: {
    alunos: number;
    relatorios: number;
  };
}

interface Materia {
  id: number;
  name: string;
  codigo: string | null;
}

export default function TurmasSection() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null);
  const [novaTurma, setNovaTurma] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [turmasRes, materiasRes] = await Promise.all([
        fetch('/api/turmas?include=counts'),
        fetch('/api/materias')
      ]);

      if (turmasRes.ok) {
        const turmasData = await turmasRes.json();
        setTurmas(turmasData);
      }

      if (materiasRes.ok) {
        const materiasData = await materiasRes.json();
        setMaterias(materiasData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirTurma = async (turmaId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;

    try {
      const response = await fetch(`/api/turmas/${turmaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTurmas(turmas.filter(t => t.id !== turmaId));
        toast.success('Turma excluída com sucesso!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir turma');
      }
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      toast.error('Erro ao excluir turma');
    }
  };

  const handleSalvarTurma = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const materiasSelecionadas = formData.getAll('materias') as string[];

      const turmaData = {
        name,
        materiasIds: materiasSelecionadas.map(id => parseInt(id))
      };

      const url = turmaEditando ? `/api/turmas/${turmaEditando.id}` : '/api/turmas';
      const method = turmaEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turmaData),
      });

      if (response.ok) {
        await carregarDados();
        setTurmaEditando(null);
        setNovaTurma(false);
        toast.success(turmaEditando ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar turma');
      }
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      toast.error('Erro ao salvar turma');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Turmas</h2>
        <button 
          onClick={() => setNovaTurma(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon />
          Nova Turma
        </button>
      </div>

      {/* Lista de Turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {turmas.map((turma) => (
          <div key={turma.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{turma.name}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTurmaEditando(turma)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Pencil2Icon />
                </button>
                <button 
                  onClick={() => handleExcluirTurma(turma.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Alunos:</strong> {turma._count?.alunos || turma.alunos.length}</p>
              <p><strong>Relatórios:</strong> {turma._count?.relatorios || 0}</p>
              <p><strong>Matérias:</strong> {turma.materias.length}</p>
              <p><strong>Professores:</strong> {turma.professores.length}</p>
            </div>

            {turma.materias.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Matérias:</p>
                <div className="flex flex-wrap gap-1">
                  {turma.materias.map((materia) => (
                    <span key={materia.id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {materia.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {turmas.length === 0 && (
        <div className="text-center text-gray-500 py-8 border rounded-lg">
          Nenhuma turma cadastrada
        </div>
      )}

      {/* Modal para Adicionar/Editar Turma */}
      <Dialog.Root open={!!turmaEditando || novaTurma} onOpenChange={() => {
        setTurmaEditando(null);
        setNovaTurma(false);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>{turmaEditando ? 'Editar Turma' : 'Nova Turma'}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSalvarTurma(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Turma *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={turmaEditando?.name || ''}
                  className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Ex: 1701, 1602"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Matérias</label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {materias.map((materia) => (
                    <label key={materia.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        name="materias"
                        value={materia.id}
                        defaultChecked={turmaEditando?.materias?.some(m => m.id === materia.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{materia.name}</span>
                    </label>
                  ))}
                  {materias.length === 0 && (
                    <p className="text-sm text-gray-500">Nenhuma matéria cadastrada</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setTurmaEditando(null);
                    setNovaTurma(false);
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {turmaEditando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}