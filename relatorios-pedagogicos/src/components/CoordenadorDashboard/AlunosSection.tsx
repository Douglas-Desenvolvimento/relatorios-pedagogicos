// /src/components/CoordenadorDashboard/AlunosSection.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlunoComRelatorios, Turma, Materia } from '@/types/types';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import classNames from 'classnames';
import { FcDocument } from 'react-icons/fc';
import PPIExportButton from './PPIExportButton';

export default function AlunosSection() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<AlunoComRelatorios[]>([]);
  const [alunoExpandidoId, setAlunoExpandidoId] = useState<number | null>(null);
  const [materiasMap, setMateriasMap] = useState<Record<number, string>>({});
  const [filtro, setFiltro] = useState<'todos' | 'com' | 'sem'>('todos');
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<any[]>([]);
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
        const res = await fetch(`/api/alunos?turmaId=${turmaSelecionada}`);
        const data: AlunoComRelatorios[] = await res.json();
        setAlunos(data);
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
      }
    }

    carregarAlunos();
  }, [turmaSelecionada]);

  const toggleExpandAluno = (id: number) => {
    setAlunoExpandidoId((prev) => (prev === id ? null : id));
  };

  const alunosFiltrados = alunos.filter((aluno) => {
    if (filtro === 'com') return aluno.relatorios.length > 0;
    if (filtro === 'sem') return aluno.relatorios.length === 0;
    return true;
  });

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-2xl font-semibold">Alunos por Turma</h2>

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
            <PPIExportButton alunos={alunosFiltrados} setLoading={setGerando} nomeTurma={turmas.find(t => t.id === turmaSelecionada)?.name || ''} />
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
                const temRelatorios = aluno.relatorios.length > 0;
                const totalRelatorios = aluno.relatorios.length;

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
                            {Object.entries(
                              aluno.relatorios.reduce(
                                (acc: Record<number, typeof aluno.relatorios>, r) => {
                                  acc[r.materiaId] = acc[r.materiaId] || [];
                                  acc[r.materiaId].push(r);
                                  return acc;
                                },
                                {}
                              )
                            ).map(([materiaId, rels]) => (
                              <li key={materiaId}>
                                <div className="flex justify-between items-center">
                                  <span>
                                    <strong>Matéria:</strong>{' '}
                                    {materiasMap[+materiaId] || `ID ${materiaId}`} —{' '}
                                    {rels.length} relatório(s)
                                  </span>

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
                                      <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg z-50">
                                        <Dialog.Title className="text-lg font-semibold mb-4">
                                          Relatórios de {aluno.name}
                                        </Dialog.Title>
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                          {relatoriosVisiveis.map((r) => (
                                            <div key={r.id}>
                                              <p className="text-sm font-medium">
                                                {format(new Date(r.createdAt), 'dd/MM/yyyy')} — {r.status}
                                              </p>
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
    </div>
  );
}
