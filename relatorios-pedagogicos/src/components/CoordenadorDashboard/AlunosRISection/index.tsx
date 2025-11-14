"use client";

import { useState, useEffect } from "react";
import { FiAlertCircle, FiCheckCircle, FiX, FiFilter, FiDownload, FiCalendar } from "react-icons/fi";
import { toast } from "react-toastify";

interface AlunoRI {
  conceito: { id: number; bimestre: string; anoLetivo: string };
  aluno: { id: number; nome: string; matricula: string; turma: string };
  relatorios: {
    esperados: number;
    criados: number;
    faltantes: number;
    detalheCriados: Array<{ materiaId: number; materiaNome: string; professorNome: string; status: string }>;
    detalheFaltantes: Array<{ id: number; nome: string; professores: Array<{ id: number; nome: string }> }>;
  };
  statusGeral: string;
}

interface Stats {
  totalAlunosRI: number;
  comRelatoriosCompletos: number;
  comRelatoriosPendentes: number;
  totalRelatoriosFaltantes: number;
}

export default function AlunosRISection() {
  const [alunosRI, setAlunosRI] = useState<AlunoRI[]>([]);
  const [alunosFiltrados, setAlunosFiltrados] = useState<AlunoRI[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alunoExpandido, setAlunoExpandido] = useState<number | null>(null);
  
  // Novos estados para filtros e configurações
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('todas');
  const [bimestreAtivo, setBimestreAtivo] = useState<any>(null);
  const [quantidadeMinima, setQuantidadeMinima] = useState<number>(8);
  const [editandoQuantidade, setEditandoQuantidade] = useState(false);

  useEffect(() => {
    loadTurmas();
    loadAlunosRI();
  }, []);

  useEffect(() => {
    filtrarAlunos();
  }, [alunosRI, turmaSelecionada]);

  const loadTurmas = async () => {
    try {
      const res = await fetch('/api/turmas');
      if (res.ok) {
        const data = await res.json();
        setTurmas(data);
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const loadAlunosRI = async () => {
    setLoading(true);
    try {
      const anoRes = await fetch("/api/ano-letivo");
      if (anoRes.ok) {
        const anos = await anoRes.json();
        const anoAtivo = anos.find((a: any) => a.ativo);
        if (anoAtivo?.bimestres) {
          const bimestreAtivo = anoAtivo.bimestres.find((b: any) => b.ativo);
          if (bimestreAtivo) {
            setBimestreAtivo(bimestreAtivo);
            const res = await fetch(`/api/dashboard/alunos-ri?bimestreId=${bimestreAtivo.id}&quantidadeMinima=${quantidadeMinima}`);
            if (res.ok) {
              const data = await res.json();
              setAlunosRI(data.alunos || []);
              setStats(data.stats);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarAlunos = () => {
    if (turmaSelecionada === 'todas') {
      setAlunosFiltrados(alunosRI);
    } else {
      const filtrados = alunosRI.filter(item => item.aluno.turma === turmaSelecionada);
      setAlunosFiltrados(filtrados);
    }
  };

  const handleSalvarQuantidade = () => {
    if (quantidadeMinima < 1) {
      toast.error('Quantidade mínima deve ser maior que 0');
      return;
    }
    setEditandoQuantidade(false);
    toast.success(`Quantidade mínima atualizada para ${quantidadeMinima} relatórios`);
    // Recarregar dados com nova quantidade
    loadAlunosRI();
  };

  // Calcular estatísticas por turma
  const calcularStatsPorTurma = () => {
    const statsPorTurma: Record<string, number> = {};
    alunosRI.forEach(item => {
      const turma = item.aluno.turma;
      statsPorTurma[turma] = (statsPorTurma[turma] || 0) + 1;
    });
    return statsPorTurma;
  };

  const statsPorTurma = calcularStatsPorTurma();
  const totalRIPorTurmaSelecionada = turmaSelecionada === 'todas' 
    ? stats?.totalAlunosRI || 0
    : statsPorTurma[turmaSelecionada] || 0;

  return (
    <div className="space-y-6">
      {/* Header com Informações do Bimestre e Configurações */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FiCalendar className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {bimestreAtivo ? `${bimestreAtivo.numero}º Bimestre` : 'Carregando...'}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Conceitos Globais - Alunos com RI
              </p>
            </div>
          </div>
          
          {/* Configuração de Quantidade Mínima */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Mín. Relatórios:
            </label>
            {editandoQuantidade ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={quantidadeMinima}
                  onChange={(e) => setQuantidadeMinima(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 border rounded text-center"
                />
                <button
                  onClick={handleSalvarQuantidade}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditandoQuantidade(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditandoQuantidade(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                {quantidadeMinima} relatórios
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filtro por Turma */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter className="text-gray-600" />
            <label className="font-medium">Filtrar por Turma</label>
          </div>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="todas">Todas as Turmas ({stats?.totalAlunosRI || 0} alunos com RI)</option>
            {Object.entries(statsPorTurma)
              .sort(([turmaA], [turmaB]) => turmaA.localeCompare(turmaB))
              .map(([turma, count]) => (
                <option key={turma} value={turma}>
                  {turma} ({count} {count === 1 ? 'aluno' : 'alunos'} com RI)
                </option>
              ))}
          </select>
        </div>

        {/* Estatísticas da Seleção Atual */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold mb-3 text-purple-900 dark:text-purple-100">
            {turmaSelecionada === 'todas' ? 'Todas as Turmas' : `Turma ${turmaSelecionada}`}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalRIPorTurmaSelecionada}</div>
              <div className="text-xs text-gray-600">Total RI</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {alunosFiltrados.filter(a => a.statusGeral === 'COMPLETO').length}
              </div>
              <div className="text-xs text-gray-600">Completos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {alunosFiltrados.filter(a => a.statusGeral !== 'COMPLETO').length}
              </div>
              <div className="text-xs text-gray-600">Pendentes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas Gerais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{stats.totalAlunosRI}</div>
            <div className="text-sm text-gray-600">Total com RI</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{stats.comRelatoriosCompletos}</div>
            <div className="text-sm text-gray-600">Completos</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{stats.comRelatoriosPendentes}</div>
            <div className="text-sm text-gray-600">Pendentes</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{stats.totalRelatoriosFaltantes}</div>
            <div className="text-sm text-gray-600">Faltantes</div>
          </div>
        </div>
      )}

      {/* Botões de Exportação PDF */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => {
            toast.info('Gerando PDF geral...');
            // TODO: Implementar exportação geral
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          disabled={alunosRI.length === 0}
        >
          <FiDownload /> PDF Geral
        </button>
        <button
          onClick={() => {
            if (turmaSelecionada === 'todas') {
              toast.warning('Selecione uma turma específica para exportar');
              return;
            }
            toast.info(`Gerando PDF da turma ${turmaSelecionada}...`);
            // TODO: Implementar exportação por turma
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          disabled={turmaSelecionada === 'todas'}
        >
          <FiDownload /> PDF por Turma
        </button>
      </div>

      {/* Lista de Alunos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">
            {turmaSelecionada === 'todas' 
              ? 'Nenhum aluno com conceito RI no bimestre atual'
              : `Nenhum aluno com conceito RI na turma ${turmaSelecionada}`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alunosFiltrados.map((item) => (
            <div key={item.aluno.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setAlunoExpandido(alunoExpandido === item.aluno.id ? null : item.aluno.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      item.statusGeral === 'COMPLETO' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-semibold">{item.aluno.nome}</p>
                      <p className="text-sm text-gray-500">{item.aluno.turma} • {item.aluno.matricula}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.relatorios.criados}/{item.relatorios.esperados} relatórios</p>
                      {item.relatorios.faltantes > 0 && (
                        <p className="text-xs text-red-600">{item.relatorios.faltantes} faltante(s)</p>
                      )}
                    </div>
                    {item.statusGeral === 'COMPLETO' ? (
                      <FiCheckCircle className="text-green-500" size={24} />
                    ) : (
                      <FiAlertCircle className="text-orange-500" size={24} />
                    )}
                  </div>
                </div>
              </div>

              {alunoExpandido === item.aluno.id && (
                <div className="border-t p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                        <FiCheckCircle /> Criados
                      </h4>
                      {item.relatorios.detalheCriados.length > 0 ? (
                        <ul className="space-y-1">
                          {item.relatorios.detalheCriados.map((rel, idx) => (
                            <li key={idx} className="text-sm">• {rel.materiaNome} - Prof. {rel.professorNome}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <FiX /> Faltantes
                      </h4>
                      {item.relatorios.detalheFaltantes.length > 0 ? (
                        <ul className="space-y-1">
                          {item.relatorios.detalheFaltantes.map((mat) => (
                            <li key={mat.id} className="text-sm">
                              • {mat.nome} - {mat.professores.map(p => p.nome).join(", ")}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Completo!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
