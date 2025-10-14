// components/CoordenadorDashboard/RelatoriosSection/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiFileText, FiFilter } from 'react-icons/fi';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDownIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';
import PPIExportButton from '../PPIExportButton';

interface AnoLetivo {
  id: number;
  ano: string;
  ativo: boolean;
  bimestres?: Bimestre[];
}

interface Bimestre {
  id: number;
  numero: number;
  ativo: boolean;
  anoLetivoId: number;
}

interface Turma {
  id: number;
  name: string;
  anoLetivoId: number;
  _count?: { alunos: number };
}

interface AlunoComConceito {
  id: number;
  name: string;
  matricule: string;
  turmaId: number;
  turma?: { name: string };
  relatorios?: Relatorio[];
  conceito?: {
    id: number;
    conceito: string;
    bimestreId: number;
  };
}

interface Relatorio {
  id: number;
  conteudo: string;
  status: string;
  createdAt: string;
  bimestreId: number;
  materia: { id: number; name: string };
  professor: { id: number; name: string };
  aluno: { id: number; name: string };
}

export default function RelatoriosSection() {
  // State para seleções
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
  const [bimestreSelecionado, setBimestreSelecionado] = useState<number | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | null>(null);
  
  // State para dados
  const [alunos, setAlunos] = useState<AlunoComConceito[]>([]);
  const [alunoExpandidoId, setAlunoExpandidoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State para modals
  const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<Relatorio[]>([]);
  const [alunoModalNome, setAlunoModalNome] = useState('');

  // Carregar anos letivos
  useEffect(() => {
    loadAnosLetivos();
  }, []);

  // Quando ano muda, atualizar bimestres e turmas
  useEffect(() => {
    if (anoSelecionado) {
      const ano = anosLetivos.find(a => a.id === anoSelecionado);
      setBimestres(ano?.bimestres || []);
      loadTurmas(anoSelecionado);
      // Auto-selecionar bimestre ativo
      const bimestreAtivo = ano?.bimestres?.find(b => b.ativo);
      if (bimestreAtivo) {
        setBimestreSelecionado(bimestreAtivo.id);
      }
    } else {
      setBimestres([]);
      setTurmas([]);
      setBimestreSelecionado(null);
    }
  }, [anoSelecionado, anosLetivos]);

  // Quando turma e bimestre mudam, carregar alunos
  useEffect(() => {
    if (turmaSelecionada) {
      loadAlunos();
    } else {
      setAlunos([]);
    }
  }, [turmaSelecionada, bimestreSelecionado]);

  const loadAnosLetivos = async () => {
    try {
      const res = await fetch('/api/ano-letivo');
      if (res.ok) {
        const data = await res.json();
        setAnosLetivos(data);
        // Auto-selecionar ano ativo
        const anoAtivo = data.find((a: AnoLetivo) => a.ativo);
        if (anoAtivo) {
          setAnoSelecionado(anoAtivo.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar anos:', error);
      toast.error('Erro ao carregar anos letivos');
    } finally {
      setLoading(false);
    }
  };

  const loadTurmas = async (anoId: number) => {
    try {
      const res = await fetch(`/api/turmas?anoLetivoId=${anoId}`);
      if (res.ok) {
        const data = await res.json();
        setTurmas(data);
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      toast.error('Erro ao carregar turmas');
    }
  };

  const loadAlunos = async () => {
    if (!turmaSelecionada) return;
    
    try {
      // Carregar alunos da turma com seus relatórios
      const params = new URLSearchParams({
        turmaId: turmaSelecionada.toString(),
        include: 'relatorios'
      });
      
      if (bimestreSelecionado) {
        params.append('bimestreId', bimestreSelecionado.toString());
      }
      
      const res = await fetch(`/api/alunos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        
        // Se bimestre está selecionado, buscar também conceitos globais
        if (bimestreSelecionado) {
          const conceitosRes = await fetch(
            `/api/conceitos-bimestre?turmaId=${turmaSelecionada}&bimestreId=${bimestreSelecionado}`
          );
          
          if (conceitosRes.ok) {
            const conceitos = await conceitosRes.json();
            // Mesclar conceitos com alunos
            const alunosComConceitos = data.map((aluno: AlunoComConceito) => {
              const conceito = conceitos.find((c: any) => c.alunoId === aluno.id);
              return { ...aluno, conceito };
            });
            setAlunos(alunosComConceitos);
            return;
          }
        }
        
        setAlunos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast.error('Erro ao carregar alunos');
    }
  };

  const handleAtivarBimestre = async (bimestreId: number) => {
    try {
      const res = await fetch(`/api/bimestre/${bimestreId}/ativar`, { method: 'PUT' });
      if (res.ok) {
        toast.success('Bimestre ativado!');
        await loadAnosLetivos();
        setBimestreSelecionado(bimestreId);
      } else {
        toast.error('Erro ao ativar bimestre');
      }
    } catch (error) {
      toast.error('Erro ao ativar bimestre');
    }
  };

  const toggleExpandAluno = (id: number) => {
    setAlunoExpandidoId(prev => prev === id ? null : id);
  };

  const handleVerRelatorios = (aluno: AlunoComConceito) => {
    setRelatoriosVisiveis(aluno.relatorios || []);
    setAlunoModalNome(aluno.name);
  };

  const filtrarRelatoriosPorBimestre = (relatorios: Relatorio[]) => {
    if (!bimestreSelecionado) return relatorios;
    return relatorios.filter(r => r.bimestreId === bimestreSelecionado);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção de Filtros */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Filtros de Relatórios
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seletor de Ano */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Ano Letivo
            </label>
            <select
              value={anoSelecionado || ''}
              onChange={(e) => {
                setAnoSelecionado(e.target.value ? parseInt(e.target.value) : null);
                setTurmaSelecionada(null);
              }}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Selecione o ano</option>
              {anosLetivos.map(ano => (
                <option key={ano.id} value={ano.id}>
                  {ano.ano} {ano.ativo && '(Ativo)'}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Bimestre */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Bimestre
            </label>
            <select
              value={bimestreSelecionado || ''}
              onChange={(e) => setBimestreSelecionado(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={!anoSelecionado}
            >
              <option value="">Todos os bimestres</option>
              {bimestres.map(bim => (
                <option key={bim.id} value={bim.id}>
                  {bim.numero}º Bimestre {bim.ativo && '(Ativo)'}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Turma */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Turma
            </label>
            <select
              value={turmaSelecionada || ''}
              onChange={(e) => setTurmaSelecionada(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={!anoSelecionado}
            >
              <option value="">Selecione a turma</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>
                  {turma.name} ({turma._count?.alunos || 0} alunos)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gestão de Bimestres (se ano selecionado) */}
      {anoSelecionado && bimestres.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCalendar className="text-indigo-600" />
            Gestão de Bimestres
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {bimestres.map(bim => (
              <button
                key={bim.id}
                onClick={() => handleAtivarBimestre(bim.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  bim.ativo
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl font-bold mb-1">{bim.numero}º</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Bimestre</div>
                {bim.ativo && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-indigo-600 text-xs">
                    <FiCheckCircle size={14} /> Ativo
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Alunos */}
      {turmaSelecionada ? (
        alunos.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border">
            <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-semibold flex items-center gap-2">
                <FiFileText className="text-blue-600" />
                Alunos e Relatórios
                {bimestreSelecionado && (
                  <span className="text-sm text-gray-500">
                    ({bimestres.find(b => b.id === bimestreSelecionado)?.numero}º Bimestre)
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {alunos.length} aluno(s) encontrado(s)
              </p>
            </div>

            <div className="divide-y">
              {alunos.map(aluno => {
                const relatoriosFiltrados = filtrarRelatoriosPorBimestre(aluno.relatorios || []);
                const temRelatorios = relatoriosFiltrados.length > 0;
                const conceito = aluno.conceito?.conceito;

                return (
                  <div key={aluno.id}>
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        temRelatorios ? 'hover:bg-green-50 dark:hover:bg-green-900/10' : 'hover:bg-red-50 dark:hover:bg-red-900/10'
                      }`}
                      onClick={() => toggleExpandAluno(aluno.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button className="text-gray-500">
                            {alunoExpandidoId === aluno.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </button>
                          <div>
                            <p className="font-medium">{aluno.name}</p>
                            <p className="text-sm text-gray-500">
                              {aluno.matricule}
                              {conceito && (
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                  conceito === 'RI' ? 'bg-red-100 text-red-700' :
                                  conceito === 'MB' ? 'bg-green-100 text-green-700' :
                                  conceito === 'B' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {conceito}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${
                            temRelatorios ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {relatoriosFiltrados.length} relatório(s)
                          </span>
                          {temRelatorios && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerRelatorios(aluno);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Ver
                            </button>
                          )}
                          <PPIExportButton alunoId={aluno.id} alunoNome={aluno.name} bimestreId={bimestreSelecionado || undefined} />
                        </div>
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {alunoExpandidoId === aluno.id && temRelatorios && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t">
                        <h4 className="font-medium mb-3 text-sm">Relatórios por matéria:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {relatoriosFiltrados.map(rel => (
                            <div key={rel.id} className="p-3 bg-white dark:bg-gray-800 rounded border text-sm">
                              <p className="font-medium">{rel.materia.name}</p>
                              <p className="text-xs text-gray-500">Prof. {rel.professor.name}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(rel.createdAt), 'dd/MM/yyyy')} • {rel.status}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
            <FiFileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhum aluno encontrado nesta turma</p>
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
          <FiFilter size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Selecione um ano e uma turma para visualizar os alunos</p>
        </div>
      )}

      {/* Modal de Relatórios */}
      <Dialog.Root open={relatoriosVisiveis.length > 0} onOpenChange={() => setRelatoriosVisiveis([])}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-3xl z-50 max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold mb-4 flex items-center justify-between">
              <span>Relatórios - {alunoModalNome}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>

            <div className="space-y-4">
              {filtrarRelatoriosPorBimestre(relatoriosVisiveis).map(rel => (
                <div key={rel.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg">{rel.materia.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Prof. {rel.professor.name} • {format(new Date(rel.createdAt), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      rel.status === 'ENVIADO' ? 'bg-green-100 text-green-700' :
                      rel.status === 'REVISADO' ? 'bg-blue-100 text-blue-700' :
                      rel.status === 'ARQUIVADO' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {rel.status}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{rel.conteudo}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                  Fechar
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
