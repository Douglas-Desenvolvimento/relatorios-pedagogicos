// src/components/CoordenadorDashboard/ProfessoresSection/index.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, ChevronDownIcon, ChevronRightIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface Professor {
  id: number;
  name: string;
  email: string;
  matricula: string;
  login?: string;
  turmas: {
    id: number;
    name: string;
  }[];
  materias: {
    id: number;
    name: string;
  }[];
  _count: {
    relatorios: number;
  };
  relatorios?: {
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
    materia: {
      id: number;
      name: string;
    };
    turma: {
      name: string;
    };
  }[];
}

interface Turma {
  id: number;
  name: string;
}

interface Materia {
  id: number;
  name: string;
}

export default function ProfessoresSection() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorEditando, setProfessorEditando] = useState<Professor | null>(null);
  const [novoProfessor, setNovoProfessor] = useState(false);
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('');
  const [professorExpandidoId, setProfessorExpandidoId] = useState<number | null>(null);
  
  // Estado para dropdown menu
  const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Função para definir as refs corretamente
  const setMenuRef = useCallback((professorId: number) => (el: HTMLDivElement | null) => {
    menuRefs.current[professorId] = el;
  }, []);

  useEffect(() => {
    carregarDados();
    
    // Fechar menu ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      const isOutside = Object.values(menuRefs.current).every(
        ref => ref && !ref.contains(event.target as Node)
      );
      if (isOutside) {
        setMenuAbertoId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const carregarDados = async () => {
    try {
      const [professoresRes, turmasRes, materiasRes] = await Promise.all([
        fetch('/api/professores?include=relatorios'),
        fetch('/api/turmas'),
        fetch('/api/materias')
      ]);

      if (professoresRes.ok) {
        const professoresData = await professoresRes.json();
        setProfessores(professoresData);
      }

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

  const toggleMenu = (professorId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuAbertoId(menuAbertoId === professorId ? null : professorId);
  };

  const toggleExpandProfessor = (id: number) => {
    setProfessorExpandidoId((prev) => (prev === id ? null : id));
  };

  const handleExcluirProfessor = async (professorId: number) => {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;

    try {
      const response = await fetch(`/api/professores/${professorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfessores(professores.filter(p => p.id !== professorId));
        setMenuAbertoId(null);
        toast.success('Professor excluído com sucesso!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir professor');
      }
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      toast.error('Erro ao excluir professor');
    }
  };

  const handleSalvarProfessor = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const matricula = formData.get('matricula') as string;
      const turmasSelecionadas = formData.getAll('turmas') as string[];
      const materiaId = formData.get('materia') as string;

      const professorData = {
        name,
        email,
        matricula: matricula || null,
        turmaIds: turmasSelecionadas.map(id => parseInt(id)),
        materiaIds: materiaId ? [parseInt(materiaId)] : [] // APENAS UMA MATÉRIA
      };

      const url = professorEditando ? `/api/professores/${professorEditando.id}` : '/api/professores';
      const method = professorEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(professorData),
      });

      if (response.ok) {
        await carregarDados();
        setProfessorEditando(null);
        setNovoProfessor(false);
        toast.success(professorEditando ? 'Professor atualizado com sucesso!' : 'Professor criado com sucesso!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar professor');
      }
    } catch (error) {
      console.error('Erro ao salvar professor:', error);
      toast.error('Erro ao salvar professor');
    }
  };

  // Função para calcular a posição do menu
  const getMenuPosition = (professorId: number) => {
    const index = professores.findIndex(p => p.id === professorId);
    const isLastRows = index >= professores.length - 3; // Últimas 3 linhas
    return isLastRows ? 'bottom-8' : 'top-8';
  };

  // Nova função para agrupar relatórios por turma
  const getRelatoriosPorTurma = (professor: Professor) => {
    if (!professor.relatorios) return [];
    
    const relatoriosPorTurma = professor.relatorios.reduce((acc, relatorio) => {
      const turmaName = relatorio.turma?.name || relatorio.aluno?.turma?.name || 'Turma não especificada';
      
      if (!acc[turmaName]) {
        acc[turmaName] = {
          turma: turmaName,
          relatorios: []
        };
      }
      acc[turmaName].relatorios.push(relatorio);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(relatoriosPorTurma);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando professores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Professores</h2>
        <button 
          onClick={() => setNovoProfessor(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + Novo Professor
        </button>
      </div>

      {/* Tabela no mesmo estilo da AlunosSection */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border w-16">Ações</th>
              <th className="p-2 border">Professor</th>
              <th className="p-2 border">Login</th>
              <th className="p-2 border">Matrícula</th>
              <th className="p-2 border">Matéria</th>
              <th className="p-2 border">Turmas</th>
              <th className="p-2 border">Relatórios</th>
            </tr>
          </thead>
          <tbody>
            {professores.map((professor) => {
              const relatoriosPorTurma = getRelatoriosPorTurma(professor);
              const materiaPrincipal = professor.materias[0]?.name || 'Nenhuma';
              const turmasNomes = professor.turmas.map(t => t.name).join(', ');
              const totalRelatorios = professor._count?.relatorios || 0;
              const temRelatorios = totalRelatorios > 0;
              const menuPosition = getMenuPosition(professor.id);

              return (
                <>
                  <tr
                    key={professor.id}
                    className={temRelatorios ? 'bg-green-50' : 'bg-red-50'}
                  >
                    {/* Coluna Ações com Menu Dropdown */}
                    <td className="p-2 border relative">
                      <button 
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        onClick={(e) => toggleMenu(professor.id, e)}
                      >
                        <DotsHorizontalIcon className="w-4 h-4" />
                      </button>

                      {menuAbertoId === professor.id && (
                        <div 
                          ref={setMenuRef(professor.id)}
                          className={`absolute left-0 ${menuPosition} bg-white border rounded shadow-lg z-50 min-w-[120px]`}
                        >
                          <button 
                            className="w-full px-3 py-2 text-sm hover:bg-blue-50 text-blue-600 text-left"
                            onClick={() => {
                              setProfessorEditando(professor);
                              setMenuAbertoId(null);
                            }}
                          >
                            Editar
                          </button>
                          <button 
                            className="w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
                            onClick={() => handleExcluirProfessor(professor.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="p-2 border font-medium">
                      <button
                        onClick={() => toggleExpandProfessor(professor.id)}
                        className="flex items-center gap-2 text-gray-800 hover:underline transition-colors"
                      >
                        {professorExpandidoId === professor.id ? (
                          <ChevronDownIcon />
                        ) : (
                          <ChevronRightIcon />
                        )}
                        {professor.name}
                      </button>
                    </td>
                    <td className="p-2 border font-mono text-xs text-blue-600">{professor.login || 'N/A'}</td>
                    <td className="p-2 border font-mono text-xs">{professor.matricula || 'N/A'}</td>
                    <td className="p-2 border">{materiaPrincipal}</td>
                    <td className="p-2 border">{turmasNomes || 'Nenhuma'}</td>
                    <td className="p-2 border">
                      {temRelatorios ? (
                        <span className="text-green-700 font-semibold">
                          {totalRelatorios} relatório(s)
                        </span>
                      ) : (
                        <span className="text-red-600">Sem relatórios</span>
                      )}
                    </td>
                  </tr>

                  {/* Área expandida - Relatórios por Turma */}
                  {professorExpandidoId === professor.id && temRelatorios && (
                    <tr>
                      <td colSpan={7} className="p-2 border">
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                          <p className="font-medium mb-2">Relatórios por turma:</p>
                          <ul className="space-y-2 text-sm">
                            {relatoriosPorTurma.map((item, index) => (
                              <li key={index}>
                                <div className="flex justify-between items-center">
                                  <span>
                                    <strong>Turma:</strong>{' '}
                                    {item.turma} —{' '}
                                    {item.relatorios.length} relatório(s)
                                  </span>

                                  <button
                                    onClick={() => {
                                      setRelatoriosVisiveis(item.relatorios);
                                      setTurmaSelecionada(item.turma);
                                    }}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Ver
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {professores.length === 0 && (
          <div className="text-center text-gray-500 py-8 border rounded-lg">
            Nenhum professor encontrado
          </div>
        )}
      </div>

      {/* Modal para Ver Relatórios */}
      <Dialog.Root open={relatoriosVisiveis.length > 0} onOpenChange={() => setRelatoriosVisiveis([])}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Relatórios - Turma {turmaSelecionada}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {relatoriosVisiveis.map((relatorio) => (
                <div key={relatorio.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        Aluno: {relatorio.aluno?.name || 'Aluno não especificado'} - Turma: {relatorio.aluno?.turma?.name || 'Turma não especificada'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Data: {format(new Date(relatorio.createdAt), 'dd/MM/yyyy')} — {relatorio.status}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">
                    {relatorio.conteudo}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <Dialog.Close asChild>
                <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors">
                  Fechar
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal para Adicionar/Editar Professor */}
      <Dialog.Root open={!!professorEditando || novoProfessor} onOpenChange={() => {
        setProfessorEditando(null);
        setNovoProfessor(false);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>{professorEditando ? 'Editar Professor' : 'Novo Professor'}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSalvarProfessor(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={professorEditando?.name || ''}
                    className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Nome do professor"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={professorEditando?.email || ''}
                    className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Email do professor"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Login
                    <span className="text-xs text-blue-600 ml-2">
                      🔑 Gerado automaticamente
                    </span>
                  </label>
                  <input
                    name="login"
                    type="text"
                    value={professorEditando?.login || 'Auto-gerado'}
                    className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-600"
                    placeholder="Será gerado automaticamente"
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Login gerado baseado no nome (ex: nome.sobrenome)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Matrícula
                  </label>
                  <input
                    name="matricula"
                    type="text"
                    defaultValue={professorEditando?.matricula || ''}
                    className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Matrícula (opcional)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Matrícula institucional (opcional)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seleção de Matéria (APENAS UMA) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Matéria *</label>
                  <select
                    name="materia"
                    defaultValue={professorEditando?.materias[0]?.id || ''}
                    className="w-full p-2 border rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  >
                    <option value="">Selecione uma matéria</option>
                    {materias.map((materia) => (
                      <option key={materia.id} value={materia.id}>
                        {materia.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Cada professor pode ter apenas uma matéria
                  </p>
                </div>

                {/* Seleção de Turmas (MÚLTIPLAS) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Turmas</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {turmas.map((turma) => (
                      <label key={turma.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          name="turmas"
                          value={turma.id}
                          defaultChecked={professorEditando?.turmas?.some(t => t.id === turma.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{turma.name}</span>
                      </label>
                    ))}
                    {turmas.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhuma turma cadastrada</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setProfessorEditando(null);
                    setNovoProfessor(false);
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {professorEditando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}