"use client";

import { useState, useEffect } from "react";
import { FiAlertCircle, FiCheckCircle, FiX } from "react-icons/fi";

interface AlunoRI {
  conceito: {
    id: number;
    bimestre: string;
    anoLetivo: string;
  };
  aluno: {
    id: number;
    nome: string;
    matricula: string;
    turma: string;
  };
  relatorios: {
    esperados: number;
    criados: number;
    faltantes: number;
    detalheCriados: Array<{
      materiaId: number;
      materiaNome: string;
      professorId: number;
      professorNome: string;
      status: string;
    }>;
    detalheFaltantes: Array<{
      id: number;
      nome: string;
      professores: Array<{ id: number; nome: string }>;
    }>;
  };
  statusGeral: string;
}

interface Stats {
  totalAlunosRI: number;
  comRelatoriosCompletos: number;
  comRelatoriosPendentes: number;
  totalRelatoriosFaltantes: number;
}

export default function AlunosRIPage() {
  const [alunosRI, setAlunosRI] = useState<AlunoRI[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [bimestreSelecionado, setBimestreSelecionado] = useState(1);
  const [alunoExpandido, setAlunoExpandido] = useState<number | null>(null);

  useEffect(() => {
    loadAlunosRI();
  }, [bimestreSelecionado]);

  const loadAlunosRI = async () => {
    setLoading(true);
    try {
      // Buscar bimestre ativo primeiro
      const anoRes = await fetch("/api/ano-letivo");
      if (anoRes.ok) {
        const anos = await anoRes.json();
        const anoAtivo = anos.find((a: any) => a.ativo);
        if (anoAtivo?.bimestres) {
          const bimestreAtivo = anoAtivo.bimestres.find((b: any) => b.ativo);
          if (bimestreAtivo) {
            setBimestreSelecionado(bimestreAtivo.id);
            
            // Buscar alunos RI
            const res = await fetch(`/api/dashboard/alunos-ri?bimestreId=${bimestreAtivo.id}`);
            if (res.ok) {
              const data = await res.json();
              setAlunosRI(data.alunos || []);
              setStats(data.stats);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar alunos RI:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Alunos com Conceito RI
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acompanhamento de relatórios individuais
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{stats.totalAlunosRI}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total com RI</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{stats.comRelatoriosCompletos}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completos</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{stats.comRelatoriosPendentes}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pendentes</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{stats.totalRelatoriosFaltantes}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Faltantes</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : alunosRI.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum aluno com conceito RI no bimestre atual
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alunosRI.map((item) => (
            <div
              key={item.aluno.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setAlunoExpandido(alunoExpandido === item.aluno.id ? null : item.aluno.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      item.statusGeral === 'COMPLETO' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {item.aluno.nome}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.aluno.turma} • Matrícula: {item.aluno.matricula}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {item.relatorios.criados}/{item.relatorios.esperados} relatórios
                      </p>
                      {item.relatorios.faltantes > 0 && (
                        <p className="text-xs text-red-600">
                          {item.relatorios.faltantes} faltante(s)
                        </p>
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
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Relatórios Criados */}
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                        <FiCheckCircle /> Relatórios Criados
                      </h4>
                      {item.relatorios.detalheCriados.length > 0 ? (
                        <ul className="space-y-1">
                          {item.relatorios.detalheCriados.map((rel, idx) => (
                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                              • {rel.materiaNome} - Prof. {rel.professorNome}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum relatório criado</p>
                      )}
                    </div>

                    {/* Relatórios Faltantes */}
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <FiX /> Relatórios Faltantes
                      </h4>
                      {item.relatorios.detalheFaltantes.length > 0 ? (
                        <ul className="space-y-1">
                          {item.relatorios.detalheFaltantes.map((mat) => (
                            <li key={mat.id} className="text-sm text-gray-700 dark:text-gray-300">
                              • {mat.nome} - {mat.professores.map(p => p.nome).join(", ")}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Todos os relatórios criados!</p>
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
