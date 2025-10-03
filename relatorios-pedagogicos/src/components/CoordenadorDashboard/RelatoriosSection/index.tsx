// components/CoordenadorDashboard/RelatoriosSection/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlunoComRelatorios, Turma, Materia, Relatorio } from '@/types/types';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDownIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import classNames from 'classnames';
import PPIExportButton from '../PPIExportButton';

export default function RelatoriosSection() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<AlunoComRelatorios[]>([]);
  const [alunoExpandidoId, setAlunoExpandidoId] = useState<number | null>(null);
  const [materiasMap, setMateriasMap] = useState<Record<number, string>>({});
  const [filtro, setFiltro] = useState<'todos' | 'com' | 'sem'>('todos');
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<Relatorio[]>([]);
  const [relatorioEditando, setRelatorioEditando] = useState<Relatorio | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        const [turmasRes, materiasRes] = await Promise.all([
          fetch('/api/turmas'),
          fetch('/api/materias'),
        ]);
        const turmasData: Turma[] = await turmasRes.json();
        const materiasData: Materia[] = await materiasRes.json();

        setTurmas(turmasData);

        const materiasMapTemp: Record<number, string> = {};
        materiasData.forEach((m) => {
          materiasMapTemp[m.id] = m.name;
        });
        setMateriasMap(materiasMapTemp);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    }

    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    async function carregarAlunos() {
      if (!turmaSelecionada) return;

      try {
        const res = await fetch(`/api/alunos?turmaId=${turmaSelecionada}&include=relatorios`);
        const data: AlunoComRelatorios[] = await res.json();
        console.log('📊 Dados dos alunos com relatórios:', data); // DEBUG
        
        // GARANTIR que todos os alunos tenham a propriedade relatorios
        const alunosComRelatoriosGarantidos = data.map(aluno => ({
          ...aluno,
          relatorios: aluno.relatorios || [] // Se for undefined, usa array vazio
        }));
        
        setAlunos(alunosComRelatoriosGarantidos);
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
      }
    }

    carregarAlunos();
  }, [turmaSelecionada]);

  const toggleExpandAluno = (id: number) => {
    setAlunoExpandidoId((prev) => (prev === id ? null : id));
  };

  // FUNÇÃO SEGURA para filtrar alunos
  const alunosFiltrados = alunos.filter((aluno) => {
    const relatoriosAluno = aluno.relatorios || []; // Garante que sempre é array
    
    if (filtro === 'com') return relatoriosAluno.length > 0;
    if (filtro === 'sem') return relatoriosAluno.length === 0;
    return true;
  });

  const handleExcluirRelatorio = async (relatorioId: number) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    try {
      const response = await fetch(`/api/relatorios/${relatorioId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Recarregar os dados após exclusão
        const res = await fetch(`/api/alunos?turmaId=${turmaSelecionada}&include=relatorios`);
        const data: AlunoComRelatorios[] = await res.json();
        const alunosAtualizados = data.map(aluno => ({
          ...aluno,
          relatorios: aluno.relatorios || []
        }));
        setAlunos(alunosAtualizados);
        alert('Relatório excluído com sucesso!');
      } else {
        alert('Erro ao excluir relatório');
      }
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      alert('Erro ao excluir relatório');
    }
  };

  const handleEditarRelatorio = async (relatorio: Relatorio) => {
    try {
      const response = await fetch(`/api/relatorios/${relatorio.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conteudo: relatorio.conteudo,
          status: 'ENVIADO', // SEMPRE envia com status ENVIADO
        }),
      });

      if (response.ok) {
        // Recarregar os dados após edição
        const res = await fetch(`/api/alunos?turmaId=${turmaSelecionada}`);
        const data: AlunoComRelatorios[] = await res.json();
        const alunosAtualizados = data.map(aluno => ({
          ...aluno,
          relatorios: aluno.relatorios || []
        }));
        setAlunos(alunosAtualizados);
        setRelatorioEditando(null);
        alert('Relatório atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar relatório');
      }
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      alert('Erro ao atualizar relatório');
    }
  };

  // FUNÇÃO SEGURA para agrupar relatórios por matéria
  const agruparRelatoriosPorMateria = (relatorios: Relatorio[] = []) => {
    return relatorios.reduce((acc: Record<number, Relatorio[]>, relatorio) => {
      const materiaId = relatorio.materiaId;
      if (!acc[materiaId]) {
        acc[materiaId] = [];
      }
      acc[materiaId].push(relatorio);
      return acc;
    }, {});
  };

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-2xl font-semibold">Gestão de Relatórios por Aluno</h2>

      <div>
        <label className="block mb-2 text-sm font-medium">Selecione a turma:</label>
        <select
          className="border p-2 rounded w-full max-w-sm"
          value={turmaSelecionada ?? ''}
          onChange={(e) =>
            setTurmaSelecionada(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">-- selecione --</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mt-4">
        {['todos', 'com', 'sem'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltro(tipo as any)}
            className={classNames(
              'px-3 py-1 rounded border',
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

      {turmaSelecionada && alunosFiltrados.length > 0 && (
        <div className="flex justify-end items-center mt-4">
          {gerando ? (
            <span className="text-sm text-gray-600 animate-pulse">
              Gerando..<span className="animate-ping">...</span>
            </span>
          ) : (
            <PPIExportButton 
              alunos={alunosFiltrados} 
              setLoading={setGerando} 
              nomeTurma={turmas.find(t => t.id === turmaSelecionada)?.name || ''} 
            />
          )}
        </div>
      )}

      {turmaSelecionada && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">Nome</th>
                <th className="p-2 border">Relatórios</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => {
                // VERIFICAÇÃO SEGURA - garante que relatorios existe
                const relatoriosAluno = aluno.relatorios || [];
                const temRelatorios = relatoriosAluno.length > 0;
                const totalRelatorios = relatoriosAluno.length;

                return (
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

                      {alunoExpandidoId === aluno.id && temRelatorios && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                          <p className="font-medium mb-2">Relatórios por matéria:</p>
                          <ul className="space-y-2 text-sm">
                            {Object.entries(agruparRelatoriosPorMateria(relatoriosAluno)).map(([materiaId, rels]) => (
                              <li key={materiaId}>
                                <div className="flex justify-between items-center">
                                  <span>
                                    <strong>Matéria:</strong>{' '}
                                    {materiasMap[+materiaId] || `ID ${materiaId}`} —{' '}
                                    {rels.length} relatório(s)
                                  </span>

                                  <div className="flex gap-2">
                                    <Dialog.Root>
                                      <Dialog.Trigger asChild>
                                        <button
                                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                          onClick={() => setRelatoriosVisiveis(rels)}
                                        >
                                          Ver
                                        </button>
                                      </Dialog.Trigger>
                                      <Dialog.Portal>
                                        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                                        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
                                          <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
                                            <span>Relatórios de {aluno.name}</span>
                                            <Dialog.Close asChild>
                                              <button className="text-gray-500 hover:text-gray-700">
                                                <Cross2Icon />
                                              </button>
                                            </Dialog.Close>
                                          </Dialog.Title>
                                          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                            {rels.map((r) => (
                                              <div key={r.id} className="border rounded p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                  <p className="text-sm font-medium">
                                                    {format(new Date(r.createdAt), 'dd/MM/yyyy')} — {r.status}
                                                  </p>
                                                  <button
                                                    onClick={() => setRelatorioEditando(r)}
                                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                  >
                                                    Editar
                                                  </button>
                                                </div>
                                                <p className="text-gray-700 whitespace-pre-wrap text-sm">
                                                  {r.conteudo}
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

                                    <button
                                      onClick={() => handleExcluirRelatorio(rels[0].id)}
                                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição - SEM CAMPO DE STATUS */}
      <Dialog.Root open={!!relatorioEditando} onOpenChange={() => setRelatorioEditando(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex justify-between items-center">
              <span>Editar Relatório</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>
            
            {relatorioEditando && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Conteúdo do Relatório:</label>
                  <textarea
                    value={relatorioEditando.conteudo}
                    onChange={(e) => setRelatorioEditando({
                      ...relatorioEditando,
                      conteudo: e.target.value
                    })}
                    className="w-full h-64 p-3 border rounded text-sm"
                    placeholder="Digite o conteúdo do relatório..."
                  />
                </div>
                
                {/* REMOVIDO O CAMPO DE STATUS */}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setRelatorioEditando(null)}
                    className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleEditarRelatorio(relatorioEditando)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}