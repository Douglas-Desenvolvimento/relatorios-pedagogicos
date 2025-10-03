// components/CoordenadorDashboard/AlunosSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import classNames from 'classnames';

interface Aluno {
  id: number;
  name: string;
  matricule: string;
  active: boolean;
  turma: {
    id: number;
    name: string;
  };
  relatorios?: {
    id: number;
    conteudo: string;
    status: string;
    createdAt: string;
    materia: {
      name: string;
    };
    professor: {
      name: string;
    };
  }[];
  _count: {
    relatorios: number;
  };
}

interface Turma {
  id: number;
  name: string;
}

export default function AlunosSection() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoExpandidoId, setAlunoExpandidoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'com' | 'sem'>('todos');
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<any[]>([]);
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);
  const [novoAluno, setNovoAluno] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTurmas();
  }, []);

  useEffect(() => {
    if (turmas.length > 0 && !turmaSelecionada) {
      setTurmaSelecionada(turmas[0].id);
    }
  }, [turmas]);

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAlunos();
    }
  }, [turmaSelecionada]);

  const carregarTurmas = async () => {
    try {
      const response = await fetch('/api/turmas');
      if (response.ok) {
        const data = await response.json();
        setTurmas(data);
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const carregarAlunos = async () => {
    if (!turmaSelecionada) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/alunos?turmaId=${turmaSelecionada}&include=relatorios`);
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

  const toggleExpandAluno = (id: number) => {
    setAlunoExpandidoId((prev) => (prev === id ? null : id));
  };

  const alunosFiltrados = alunos.filter((aluno) => {
    const totalRelatorios = aluno._count?.relatorios || 0;
    if (filtro === 'com') return totalRelatorios > 0;
    if (filtro === 'sem') return totalRelatorios === 0;
    return true;
  });

  const handleExcluirAluno = async (alunoId: number) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
      const response = await fetch(`/api/alunos/${alunoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlunos(alunos.filter(a => a.id !== alunoId));
        alert('Aluno excluído com sucesso!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao excluir aluno');
      }
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      alert('Erro ao excluir aluno');
    }
  };

  const handleSalvarAluno = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const matricule = formData.get('matricule') as string;
      const turmaId = formData.get('turma') as string;

      const alunoData = {
        name,
        matricule,
        turmaId: parseInt(turmaId)
      };

      const url = alunoEditando ? `/api/alunos/${alunoEditando.id}` : '/api/alunos';
      const method = alunoEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alunoData),
      });

      if (response.ok) {
        await carregarAlunos();
        setAlunoEditando(null);
        setNovoAluno(false);
        alert(alunoEditando ? 'Aluno atualizado com sucesso!' : 'Aluno criado com sucesso!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao salvar aluno');
      }
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      alert('Erro ao salvar aluno');
    }
  };

  const getRelatoriosPorMateria = (aluno: Aluno) => {
    if (!aluno.relatorios) return [];
    
    const relatoriosPorMateria = aluno.relatorios.reduce((acc, relatorio) => {
      const materiaName = relatorio.materia?.name || 'Matéria não especificada';
      
      if (!acc[materiaName]) {
        acc[materiaName] = {
          materia: materiaName,
          relatorios: []
        };
      }
      acc[materiaName].relatorios.push(relatorio);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(relatoriosPorMateria);
  };

  if (loading && !turmaSelecionada) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Alunos</h2>
        <button 
          onClick={() => setNovoAluno(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Novo Aluno
        </button>
      </div>

      {/* Filtros e seleção de turma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium">Selecione a turma:</label>
          <select
            className="border p-2 rounded w-full"
            value={turmaSelecionada ?? ''}
            onChange={(e) => setTurmaSelecionada(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- selecione --</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          {['todos', 'com', 'sem'].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo as any)}
              className={classNames(
                'px-3 py-1 rounded border h-fit',
                tipo === filtro
                  ? tipo === 'com'
                    ? 'bg-green-700 text-white'
                    : tipo === 'sem'
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-800 text-white'
                  : tipo === 'com'
                  ? 'bg-white text-green-700'
                  : tipo === 'sem'
                  ? 'bg-white text-red-700'
                  : 'bg-white text-gray-800'
              )}
            >
              {tipo === 'todos'
                ? 'Todos'
                : tipo === 'com'
                ? 'Com relatório'
                : 'Sem relatório'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela no mesmo estilo da aba Relatórios */}
      {turmaSelecionada && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">Aluno</th>
                <th className="p-2 border">Matrícula</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Relatórios</th>
                <th className="p-2 border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => {
                const relatoriosPorMateria = getRelatoriosPorMateria(aluno);
                const totalRelatorios = aluno._count?.relatorios || 0;
                const temRelatorios = totalRelatorios > 0;

                return (
                  <>
                    <tr
                      key={aluno.id}
                      className={temRelatorios ? 'bg-green-50' : 'bg-red-50'}
                    >
                      <td className="p-2 border font-medium">
                        <button
                          onClick={() => toggleExpandAluno(aluno.id)}
                          className="flex items-center gap-2 text-gray-800 hover:underline"
                        >
                          {alunoExpandidoId === aluno.id ? (
                            <ChevronDownIcon />
                          ) : (
                            <ChevronRightIcon />
                          )}
                          {aluno.name}
                        </button>
                      </td>
                      <td className="p-2 border font-mono text-xs">{aluno.matricule}</td>
                      <td className="p-2 border">
                        <span className={`px-2 py-1 rounded text-xs ${
                          aluno.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {aluno.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-2 border">
                        {temRelatorios ? (
                          <span className="text-green-700 font-semibold">
                            {totalRelatorios} relatório(s)
                          </span>
                        ) : (
                          <span className="text-red-600">Sem relatórios</span>
                        )}
                      </td>
                      <td className="p-2 border">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setAlunoEditando(aluno)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleExcluirAluno(aluno.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Área expandida - mesma estrutura da aba Relatórios */}
                    {alunoExpandidoId === aluno.id && temRelatorios && (
                      <tr>
                        <td colSpan={5} className="p-2 border">
                          <div className="mt-2 p-2 bg-gray-50 rounded border">
                            <p className="font-medium mb-2">Relatórios por matéria:</p>
                            <ul className="space-y-2 text-sm">
                              {relatoriosPorMateria.map((item, index) => (
                                <li key={index}>
                                  <div className="flex justify-between items-center">
                                    <span>
                                      <strong>Matéria:</strong>{' '}
                                      {item.materia} —{' '}
                                      {item.relatorios.length} relatório(s)
                                    </span>

                                    <button
                                      onClick={() => setRelatoriosVisiveis(item.relatorios)}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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

          {alunosFiltrados.length === 0 && (
            <div className="text-center text-gray-500 py-8 border rounded-lg">
              {alunos.length === 0 
                ? 'Nenhum aluno encontrado nesta turma' 
                : 'Nenhum aluno corresponde ao filtro selecionado'
              }
            </div>
          )}
        </div>
      )}

      {/* Modal para Ver Relatórios */}
      <Dialog.Root open={relatoriosVisiveis.length > 0} onOpenChange={() => setRelatoriosVisiveis([])}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Relatórios do Aluno</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Visualização de relatórios do aluno
            </Dialog.Description>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {relatoriosVisiveis.map((relatorio) => (
                <div key={relatorio.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        Professor: {relatorio.professor?.name || 'Professor não especificado'}
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
                <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800">
                  Fechar
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal para Adicionar/Editar Aluno */}
      <Dialog.Root open={!!alunoEditando || novoAluno} onOpenChange={() => {
        setAlunoEditando(null);
        setNovoAluno(false);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>{alunoEditando ? 'Editar Aluno' : 'Novo Aluno'}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {alunoEditando ? 'Formulário para editar aluno' : 'Formulário para criar novo aluno'}
            </Dialog.Description>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSalvarAluno(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={alunoEditando?.name || ''}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Nome do aluno"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Matrícula *</label>
                <input
                  name="matricule"
                  type="text"
                  defaultValue={alunoEditando?.matricule || ''}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Matrícula do aluno"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Turma *</label>
                <select
                  name="turma"
                  defaultValue={alunoEditando?.turma.id || turmaSelecionada || ''}
                  className="w-full p-2 border rounded text-sm"
                  required
                >
                  <option value="">Selecione uma turma</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setAlunoEditando(null);
                    setNovoAluno(false);
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {alunoEditando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}