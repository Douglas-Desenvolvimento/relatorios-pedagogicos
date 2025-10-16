// components/CoordenadorDashboard/RelatoriosSection/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiFileText, FiFilter, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
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
  const [relatorioExpandido, setRelatorioExpandido] = useState<number | null>(null);
  const [editandoRelatorio, setEditandoRelatorio] = useState<Relatorio | null>(null);
  const [conteudoEdicao, setConteudoEdicao] = useState('');
  const [deletandoRelatorioId, setDeletandoRelatorioId] = useState<number | null>(null);
  const [showNovoRelatorioModal, setShowNovoRelatorioModal] = useState(false);
  const [novoRelatorioData, setNovoRelatorioData] = useState({
    alunoId: '',
    professorId: '',
    materiaId: '',
    conteudo: ''
  });
  const [professores, setProfessores] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);

  // Carregar anos letivos
  useEffect(() => {
    loadAnosLetivos();
    loadProfessoresEMaterias();
  }, []);

  const loadProfessoresEMaterias = async () => {
    try {
      const [profsRes, matsRes] = await Promise.all([
        fetch('/api/professores'),
        fetch('/api/materias')
      ]);
      if (profsRes.ok) {
        const profsData = await profsRes.json();
        setProfessores(profsData);
      }
      if (matsRes.ok) {
        const matsData = await matsRes.json();
        setMaterias(matsData);
      }
    } catch (error) {
      console.error('Erro ao carregar professores/matérias:', error);
    }
  };

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

  const handleEditarRelatorio = async () => {
    if (!editandoRelatorio) return;
    
    try {
      const res = await fetch(`/api/relatorios/${editandoRelatorio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: conteudoEdicao })
      });
      
      if (res.ok) {
        toast.success('Relatório atualizado!');
        setEditandoRelatorio(null);
        setConteudoEdicao('');
        loadAlunos();
      } else {
        toast.error('Erro ao atualizar relatório');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar relatório');
    }
  };

  const handleDeletarRelatorio = async () => {
    if (!deletandoRelatorioId) return;
    
    try {
      const res = await fetch(`/api/relatorios/${deletandoRelatorioId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success('Relatório excluído!');
        setDeletandoRelatorioId(null);
        loadAlunos();
      } else {
        toast.error('Erro ao excluir relatório');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir relatório');
    }
  };

  const handleCriarNovoRelatorio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turmaSelecionada || !bimestreSelecionado) {
      toast.error('Selecione uma turma e bimestre');
      return;
    }
    
    try {
      const res = await fetch('/api/relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...novoRelatorioData,
          alunoId: parseInt(novoRelatorioData.alunoId),
          professorId: parseInt(novoRelatorioData.professorId),
          materiaId: parseInt(novoRelatorioData.materiaId),
          turmaId: turmaSelecionada,
          bimestreId: bimestreSelecionado,
          status: 'ENVIADO'
        })
      });
      
      if (res.ok) {
        toast.success('Relatório criado!');
        setShowNovoRelatorioModal(false);
        setNovoRelatorioData({ alunoId: '', professorId: '', materiaId: '', conteudo: '' });
        loadAlunos();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao criar relatório');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao criar relatório');
    }
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
                  {turma.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Alunos */}
      {turmaSelecionada ? (
        alunos.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border">
            <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div>
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
                {alunos.length > 0 && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNovoRelatorioModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <FiPlus /> Novo Relatório
                    </button>
                    <PPIExportButton 
                      alunos={alunos as any} 
                      nomeTurma={turmas.find(t => t.id === turmaSelecionada)?.name || 'Turma'} 
                    />
                  </div>
                )}
              </div>
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
                            <p className="font-medium">
                              {aluno.name}
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

      {/* Modal de Relatórios - Visualização */}
      <Dialog.Root open={relatoriosVisiveis.length > 0} onOpenChange={() => {
        setRelatoriosVisiveis([]);
        setRelatorioExpandido(null);
      }}>
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
                <div key={rel.id} className="border rounded-lg overflow-hidden">
                  {/* Cabeçalho do Relatório */}
                  <div 
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setRelatorioExpandido(relatorioExpandido === rel.id ? null : rel.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <button className="text-gray-500">
                          {relatorioExpandido === rel.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                        <div>
                          <p className="font-semibold text-lg">{rel.materia.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Prof. {rel.professor.name} • {format(new Date(rel.createdAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
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
                  </div>

                  {/* Detalhamento Expandido */}
                  {relatorioExpandido === rel.id && (
                    <div className="p-4 bg-white dark:bg-gray-800 border-t space-y-4">
                      {/* Conteúdo do Relatório */}
                      <div>
                        <p className="text-sm text-gray-500 mb-2 font-medium">Conteúdo:</p>
                        <div className="prose prose-sm max-w-none p-3 bg-gray-50 dark:bg-gray-900/50 rounded">
                          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{rel.conteudo}</p>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-3 justify-end pt-2 border-t">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditandoRelatorio(rel);
                            setConteudoEdicao(rel.conteudo);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <FiEdit2 size={16} /> Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletandoRelatorioId(rel.id);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <FiTrash2 size={16} /> Excluir
                        </button>
                      </div>
                    </div>
                  )}
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

      {/* Modal de Edição de Relatório */}
      <Dialog.Root open={!!editandoRelatorio} onOpenChange={() => {
        setEditandoRelatorio(null);
        setConteudoEdicao('');
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-2xl z-50">
            <Dialog.Title className="text-xl font-semibold mb-4">
              Editar Relatório
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Conteúdo do Relatório</label>
                <textarea
                  value={conteudoEdicao}
                  onChange={(e) => setConteudoEdicao(e.target.value)}
                  className="w-full p-3 border rounded-lg min-h-[200px]"
                  placeholder="Digite o conteúdo do relatório..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setEditandoRelatorio(null);
                    setConteudoEdicao('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditarRelatorio}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Alert Dialog para Exclusão */}
      <AlertDialog.Root open={!!deletandoRelatorioId} onOpenChange={() => setDeletandoRelatorioId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-md z-50">
            <AlertDialog.Title className="text-xl font-semibold mb-2">Confirmar Exclusão</AlertDialog.Title>
            <AlertDialog.Description className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  onClick={handleDeletarRelatorio}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Modal de Criar Novo Relatório */}
      <Dialog.Root open={showNovoRelatorioModal} onOpenChange={setShowNovoRelatorioModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-2xl z-50 max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold mb-4">
              Novo Relatório
            </Dialog.Title>
            <form onSubmit={handleCriarNovoRelatorio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Aluno *</label>
                <select
                  value={novoRelatorioData.alunoId}
                  onChange={(e) => setNovoRelatorioData({ ...novoRelatorioData, alunoId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione o aluno</option>
                  {alunos.map(aluno => (
                    <option key={aluno.id} value={aluno.id}>{aluno.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Professor *</label>
                <select
                  value={novoRelatorioData.professorId}
                  onChange={(e) => setNovoRelatorioData({ ...novoRelatorioData, professorId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione o professor</option>
                  {professores.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Matéria *</label>
                <select
                  value={novoRelatorioData.materiaId}
                  onChange={(e) => setNovoRelatorioData({ ...novoRelatorioData, materiaId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione a matéria</option>
                  {materias.map(mat => (
                    <option key={mat.id} value={mat.id}>{mat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Conteúdo *</label>
                <textarea
                  value={novoRelatorioData.conteudo}
                  onChange={(e) => setNovoRelatorioData({ ...novoRelatorioData, conteudo: e.target.value })}
                  className="w-full p-3 border rounded-lg min-h-[200px]"
                  placeholder="Digite o conteúdo do relatório..."
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNovoRelatorioModal(false);
                    setNovoRelatorioData({ alunoId: '', professorId: '', materiaId: '', conteudo: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Criar Relatório
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
