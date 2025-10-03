// src/components/CoordenadorDashboard/ProfessoresSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

interface Professor {
  id: number;
  name: string;
  email: string;
  matricula: string;
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

interface RelatorioPorMateria {
  materiaId: number;
  materia: string;
  quantidade: number;
  relatorios: any[];
}

export default function ProfessoresSection() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorEditando, setProfessorEditando] = useState<Professor | null>(null);
  const [novoProfessor, setNovoProfessor] = useState(false);
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<any[]>([]);
  const [materiaSelecionada, setMateriaSelecionada] = useState<string>('');

  useEffect(() => {
    carregarDados();
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
    } finally {
      setLoading(false);
    }
  };

  const getRelatoriosPorMateria = (professor: Professor): RelatorioPorMateria[] => {
    if (!professor.relatorios) return [];
    
    const relatoriosPorMateria = professor.relatorios.reduce((acc, relatorio) => {
      const materiaId = relatorio.materia?.id || 0;
      const materiaName = relatorio.materia?.name || 'Matéria não especificada';
      
      if (!acc[materiaId]) {
        acc[materiaId] = {
          materiaId,
          materia: materiaName,
          quantidade: 0,
          relatorios: []
        };
      }
      acc[materiaId].quantidade++;
      acc[materiaId].relatorios.push(relatorio);
      return acc;
    }, {} as Record<number, RelatorioPorMateria>);

    return Object.values(relatoriosPorMateria);
  };

  const handleExcluirProfessor = async (professorId: number) => {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;

    try {
      const response = await fetch(`/api/professores/${professorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfessores(professores.filter(p => p.id !== professorId));
        alert('Professor excluído com sucesso!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao excluir professor');
      }
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      alert('Erro ao excluir professor');
    }
  };

  const handleSalvarProfessor = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const matricula = formData.get('matricula') as string;
      const turmasSelecionadas = formData.getAll('turmas') as string[];
      const materiasSelecionadas = formData.getAll('materias') as string[];

      const professorData = {
        name,
        email,
        matricula: matricula || null,
        turmaIds: turmasSelecionadas.map(id => parseInt(id)),
        materiaIds: materiasSelecionadas.map(id => parseInt(id))
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
        alert(professorEditando ? 'Professor atualizado com sucesso!' : 'Professor criado com sucesso!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao salvar professor');
      }
    } catch (error) {
      console.error('Erro ao salvar professor:', error);
      alert('Erro ao salvar professor');
    }
  };

  const getRelatoriosPorAlunoETurma = (professor: Professor) => {
    if (!professor.relatorios) return {};
    
    return professor.relatorios.reduce((acc, relatorio) => {
      const alunoName = relatorio.aluno?.name || 'Aluno não especificado';
      const turmaName = relatorio.turma?.name || 'Turma não especificada';
      const alunoId = relatorio.aluno?.id || 0;
      
      const key = `${alunoId}-${turmaName}`;
      if (!acc[key]) {
        acc[key] = {
          aluno: alunoName,
          turma: turmaName,
          relatorios: []
        };
      }
      acc[key].relatorios.push(relatorio);
      return acc;
    }, {} as Record<string, any>);
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Novo Professor
        </button>
      </div>

      <div className="space-y-6">
        {professores.map((professor) => {
          const relatoriosPorMateria = getRelatoriosPorMateria(professor);
          const relatoriosPorAlunoETurma = getRelatoriosPorAlunoETurma(professor);

          return (
            <div key={professor.id} className="border rounded-lg p-6 bg-white shadow-sm">
              {/* Cabeçalho do Professor */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">{professor.name}</h3>
                  <p className="text-gray-600 mb-1">{professor.email}</p>
                  <p className="text-sm text-gray-500">Matrícula: {professor.matricula || 'Não informada'}</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setProfessorEditando(professor)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleExcluirProfessor(professor.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Turmas */}
                <div>
                  <h4 className="font-medium mb-3 text-lg">Turmas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {professor.turmas.map((turma) => (
                      <span 
                        key={turma.id} 
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {turma.name}
                      </span>
                    ))}
                    {professor.turmas.length === 0 && (
                      <span className="text-gray-500 text-sm">Nenhuma turma atribuída</span>
                    )}
                  </div>
                </div>

                {/* Relatórios por Matéria */}
                <div>
                  <h4 className="font-medium mb-3 text-lg">Relatórios por matéria:</h4>
                  <div className="space-y-3">
                    {relatoriosPorMateria.map((item) => (
                      <div key={item.materiaId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">Matéria: {item.materia}</span>
                          <span className="text-gray-600 ml-2">— {item.quantidade} relatório(s)</span>
                        </div>
                        <button 
                          onClick={() => {
                            setRelatoriosVisiveis(item.relatorios);
                            setMateriaSelecionada(item.materia);
                          }}
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-600 rounded text-sm hover:bg-blue-50"
                        >
                          Ver
                        </button>
                      </div>
                    ))}
                    
                    {relatoriosPorMateria.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        Nenhum relatório encontrado
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <strong className="text-lg">
                          Total: {professor._count?.relatorios || 0} relatório(s)
                        </strong>
                        {professor.relatorios && professor.relatorios.length > 0 && (
                          <button 
                            onClick={() => {
                              setRelatoriosVisiveis(professor.relatorios || []);
                              setMateriaSelecionada('Todos');
                            }}
                            className="text-green-600 hover:text-green-800 px-3 py-1 border border-green-600 rounded text-sm hover:bg-green-50"
                          >
                            Ver Todos
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alunos e Turmas com Relatórios */}
              {Object.keys(relatoriosPorAlunoETurma).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3 text-lg">Alunos e Turmas com Relatórios:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-100 text-left">
                        <tr>
                          <th className="p-2 border">Aluno</th>
                          <th className="p-2 border">Turma</th>
                          <th className="p-2 border">Relatórios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(relatoriosPorAlunoETurma).map((item, index) => (
                          <tr key={index} className="bg-green-50">
                            <td className="p-2 border font-medium">{item.aluno}</td>
                            <td className="p-2 border">{item.turma}</td>
                            <td className="p-2 border">
                              <span className="text-green-700 font-semibold">
                                {item.relatorios.length} relatório(s)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
              <span>Relatórios - {materiaSelecionada}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700">
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
                        Data: {new Date(relatorio.createdAt).toLocaleDateString('pt-BR')} — {relatorio.status}
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
                <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800">
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
                <button className="text-gray-500 hover:text-gray-700">
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
                    className="w-full p-2 border rounded text-sm"
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
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Email do professor"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Matrícula</label>
                <input
                  name="matricula"
                  type="text"
                  defaultValue={professorEditando?.matricula || ''}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Matrícula do professor (opcional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seleção de Turmas */}
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
                          className="rounded"
                        />
                        <span className="text-sm">{turma.name}</span>
                      </label>
                    ))}
                    {turmas.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhuma turma cadastrada</p>
                    )}
                  </div>
                </div>

                {/* Seleção de Matérias */}
                <div>
                  <label className="block text-sm font-medium mb-2">Matérias</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {materias.map((materia) => (
                      <label key={materia.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          name="materias"
                          value={materia.id}
                          defaultChecked={professorEditando?.materias?.some(m => m.id === materia.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{materia.name}</span>
                      </label>
                    ))}
                    {materias.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhuma matéria cadastrada</p>
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
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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