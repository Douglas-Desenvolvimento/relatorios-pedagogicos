// src/components/CoordenadorDashboard/TurmasSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';

interface Turma {
  id: number;
  name: string;
  anoLetivo: string | null;
  alunos: any[];
  professores: {
    id: number;
    name: string;
  }[];
  materias: {
    id: number;
    name: string;
  }[];
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
  const [turmaExpandidaId, setTurmaExpandidaId] = useState<number | null>(null);

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

  const toggleExpandTurma = (id: number) => {
    setTurmaExpandidaId((prev) => (prev === id ? null : id));
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
        anoLetivo: null, // Enviar null como padrão
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
    return <div className="text-center py-8">Carregando turmas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Turmas</h2>
        <button 
          onClick={() => setNovaTurma(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + Nova Turma
        </button>
      </div>

      {/* Tabela no mesmo estilo da ProfessoresSection */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border">Ações</th>
              <th className="p-2 border">Número da Turma</th>
              <th className="p-2 border">Alunos</th>
              <th className="p-2 border">Relatórios</th>
              <th className="p-2 border">Professores</th>
              <th className="p-2 border">Matérias</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((turma) => {
              const totalAlunos = turma._count?.alunos || turma.alunos.length;
              const totalRelatorios = turma._count?.relatorios || 0;
              const totalProfessores = turma.professores.length;
              const totalMaterias = turma.materias.length;

              return (
                <>
                  <tr
                    key={turma.id}
                    className={totalAlunos > 0 ? 'bg-green-50' : 'bg-red-50'}
                  >
                    <td className="p-2 border">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setTurmaEditando(turma)}
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleExcluirTurma(turma.id)}
                          className="text-red-600 hover:text-red-800 text-sm transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                    <td className="p-2 border font-medium">
                      <button
                        onClick={() => toggleExpandTurma(turma.id)}
                        className="flex items-center gap-2 text-gray-800 hover:underline transition-colors"
                      >
                        {turmaExpandidaId === turma.id ? (
                          <ChevronDownIcon />
                        ) : (
                          <ChevronRightIcon />
                        )}
                        {turma.name}
                      </button>
                    </td>
                    <td className="p-2 border">
                      <span className="font-semibold">{totalAlunos}</span>
                    </td>
                    <td className="p-2 border">
                      <span className="font-semibold">{totalRelatorios}</span>
                    </td>
                    <td className="p-2 border">
                      <span className="font-semibold">{totalProfessores}</span>
                    </td>
                    <td className="p-2 border">
                      <span className="font-semibold">{totalMaterias}</span>
                    </td>
                  </tr>

                  {/* Área expandida - layout corrigido */}
                  {turmaExpandidaId === turma.id && (
                    <tr>
                      <td colSpan={6} className="p-2 border">
                        <div className="mt-2 p-4 bg-gray-50 rounded border">
                          {/* Primeira linha: 3 colunas */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            {/* Coluna 1 - Alunos */}
                            <div>
                              <h4 className="font-semibold mb-2 text-blue-600">Alunos</h4>
                              <p className="text-2xl font-bold text-gray-800">{totalAlunos}</p>
                              <p className="text-sm text-gray-600 mt-1">estudantes matriculados</p>
                            </div>

                            {/* Coluna 2 - Matérias */}
                            <div>
                              <h4 className="font-semibold mb-2 text-green-600">Matérias</h4>
                              <div className="space-y-1">
                                {turma.materias.slice(0, 4).map((materia) => (
                                  <div key={materia.id} className="text-sm">
                                    • {materia.name}
                                  </div>
                                ))}
                                {turma.materias.length > 4 && (
                                  <div className="text-sm text-gray-500">
                                    + {turma.materias.length - 4} matérias
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Coluna 3 - Professores */}
                            <div>
                              <h4 className="font-semibold mb-2 text-purple-600">Professores</h4>
                              <div className="space-y-1">
                                {turma.professores.slice(0, 4).map((professor) => (
                                  <div key={professor.id} className="text-sm">
                                    • {professor.name}
                                  </div>
                                ))}
                                {turma.professores.length > 4 && (
                                  <div className="text-sm text-gray-500">
                                    + {turma.professores.length - 4} professores
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Segunda linha: Relatórios */}
                          <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2 text-orange-600">Relatórios</h4>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-bold text-gray-800">{totalRelatorios}</p>
                                <p className="text-sm text-gray-600">relatórios enviados</p>
                              </div>
                              <div className="text-sm text-gray-500 text-right">
                                <p>Para detalhes dos relatórios</p>
                                <p>busque a turma na seção Relatórios</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {turmas.length === 0 && (
          <div className="text-center text-gray-500 py-8 border rounded-lg">
            Nenhuma turma encontrada
          </div>
        )}
      </div>

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
                <label className="block text-sm font-medium mb-2">Número da Turma *</label>
                <input
                  name="name"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  defaultValue={turmaEditando?.name || ''}
                  className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Ex: 1701, 1602"
                  required
                  onInput={(e) => {
                    // Permite apenas números
                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                  }}
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