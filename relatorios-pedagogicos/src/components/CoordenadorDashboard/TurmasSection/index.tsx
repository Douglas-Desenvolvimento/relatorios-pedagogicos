// src/components/CoordenadorDashboard/TurmasSection/index.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';

interface Turma {
  id: number;
  name: string;
  anoLetivo: string | null;
  alunos: {
    id: number;
    name: string;
    matricule: string;
    active: boolean;
  }[];
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
  
  // Estados para os modais de detalhes
  const [modalAlunosAberto, setModalAlunosAberto] = useState(false);
  const [modalMateriasAberto, setModalMateriasAberto] = useState(false);
  const [modalProfessoresAberto, setModalProfessoresAberto] = useState(false);
  const [modalRelatoriosAberto, setModalRelatoriosAberto] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  
  // Estado para dropdown menu
  const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarDados();
    
    // Fechar menu ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbertoId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const toggleMenu = (turmaId: number) => {
    setMenuAbertoId(menuAbertoId === turmaId ? null : turmaId);
  };

  const handleExcluirTurma = async (turmaId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;

    try {
      const response = await fetch(`/api/turmas/${turmaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTurmas(turmas.filter(t => t.id !== turmaId));
        setMenuAbertoId(null);
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

      const turmaData = {
        name: name.toString()
      };

      const url = turmaEditando ? `/api/turmas/${turmaEditando.id}` : '/api/turmas';
      const method = turmaEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turmaData), // SEMPRE envia apenas o nome
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

  // Funções para abrir modais
  const abrirModalAlunos = (turma: Turma) => {
    setTurmaSelecionada(turma);
    setModalAlunosAberto(true);
  };

  const abrirModalMaterias = (turma: Turma) => {
    setTurmaSelecionada(turma);
    setModalMateriasAberto(true);
  };

  const abrirModalProfessores = (turma: Turma) => {
    setTurmaSelecionada(turma);
    setModalProfessoresAberto(true);
  };

  const abrirModalRelatorios = (turma: Turma) => {
    setTurmaSelecionada(turma);
    setModalRelatoriosAberto(true);
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

      {/* Tabela simplificada */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border w-16">Ações</th>
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
                <tr
                  key={turma.id}
                  className={totalAlunos > 0 ? 'bg-green-50' : 'bg-red-50'}
                >
                  {/* Coluna Ações com Menu Dropdown */}
                  <td className="p-2 border relative">
                    <button 
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      onClick={() => toggleMenu(turma.id)}
                    >
                      <DotsHorizontalIcon className="w-4 h-4" />
                    </button>

                    {menuAbertoId === turma.id && (
                      <div 
                        ref={menuRef}
                        className="absolute left-0 top-8 bg-white border rounded shadow-lg z-50 min-w-[120px]"
                      >
                        <button 
                          className="w-full px-3 py-2 text-sm hover:bg-blue-50 text-blue-600 text-left"
                          onClick={() => {
                            setTurmaEditando(turma);
                            setMenuAbertoId(null);
                          }}
                        >
                          Editar
                        </button>
                        <button 
                          className="w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
                          onClick={() => handleExcluirTurma(turma.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Número da Turma */}
                  <td className="p-2 border font-medium">
                    {turma.name}
                  </td>

                  {/* Alunos - Clique para abrir modal */}
                  <td className="p-2 border">
                    <button
                      onClick={() => abrirModalAlunos(turma)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {totalAlunos}
                    </button>
                  </td>

                  {/* Relatórios - Clique para abrir modal */}
                  <td className="p-2 border">
                    <button
                      onClick={() => abrirModalRelatorios(turma)}
                      className="font-semibold text-orange-600 hover:text-orange-800 hover:underline transition-colors"
                    >
                      {totalRelatorios}
                    </button>
                  </td>

                  {/* Professores - Clique para abrir modal */}
                  <td className="p-2 border">
                    <button
                      onClick={() => abrirModalProfessores(turma)}
                      className="font-semibold text-green-600 hover:text-green-800 hover:underline transition-colors"
                    >
                      {totalProfessores}
                    </button>
                  </td>

                  {/* Matérias - Clique para abrir modal */}
                  <td className="p-2 border">
                    <button
                      onClick={() => abrirModalMaterias(turma)}
                      className="font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                    >
                      {totalMaterias}
                    </button>
                  </td>
                </tr>
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

      {/* Modal para Adicionar/Editar Turma - APENAS NÚMERO DA TURMA */}
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
                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                  }}
                />
              </div>

              {/* REMOVIDA A SELEÇÃO DE MATÉRIAS - APENAS NÚMERO DA TURMA */}

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

      {/* Modal de Detalhes dos Alunos */}
      <Dialog.Root open={modalAlunosAberto} onOpenChange={setModalAlunosAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Alunos - Turma {turmaSelecionada?.name}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <div className="flex-1 overflow-auto">
              <div className="mb-4 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {turmaSelecionada?._count?.alunos || turmaSelecionada?.alunos.length || 0}
                </div>
                <p className="text-gray-600">estudantes matriculados</p>
              </div>

              {turmaSelecionada?.alunos && turmaSelecionada.alunos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {turmaSelecionada.alunos.map((aluno) => (
                    <div key={aluno.id} className="border rounded p-3 bg-gray-50">
                      <div className="font-medium">{aluno.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Nenhum aluno matriculado nesta turma
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal de Detalhes das Matérias */}
      <Dialog.Root open={modalMateriasAberto} onOpenChange={setModalMateriasAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Matérias - Turma {turmaSelecionada?.name}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <div className="flex-1 overflow-auto">
              <div className="mb-4 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {turmaSelecionada?.materias.length || 0}
                </div>
                <p className="text-gray-600">matérias vinculadas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turmaSelecionada?.materias.map((materia) => (
                  <div key={materia.id} className="border rounded p-3 bg-gray-50">
                    <div className="font-medium flex items-center gap-2">
                      <span>•</span>
                      {materia.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal de Detalhes dos Professores */}
      <Dialog.Root open={modalProfessoresAberto} onOpenChange={setModalProfessoresAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Professores - Turma {turmaSelecionada?.name}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <div className="flex-1 overflow-auto">
              <div className="mb-4 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {turmaSelecionada?.professores.length || 0}
                </div>
                <p className="text-gray-600">professores vinculados</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turmaSelecionada?.professores.map((professor) => (
                  <div key={professor.id} className="border rounded p-3 bg-gray-50">
                    <div className="font-medium flex items-center gap-2">
                      <span>•</span>
                      {professor.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal de Detalhes dos Relatórios */}
      <Dialog.Root open={modalRelatoriosAberto} onOpenChange={setModalRelatoriosAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Relatórios - Turma {turmaSelecionada?.name}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-orange-600 mb-4">
                {turmaSelecionada?._count?.relatorios || 0}
              </div>
              <p className="text-gray-600 mb-2">relatórios enviados</p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                <p className="text-orange-800 text-sm font-medium">
                  Para consultar os relatórios, vá a Seção Relatórios e selecione a turma
                </p>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}