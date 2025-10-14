// src/components/ProfessorDashboard/RelatoriosEnviadosSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

interface RelatoriosEnviadosSectionProps {
  professor: any;
}

interface RelatorioAgrupado {
  turma: string;
  turmaId: number;
  bimestre: number;
  bimestreId: number;
  relatorios: any[];
}

export default function RelatoriosEnviadosSection({ professor }: RelatoriosEnviadosSectionProps) {
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<any>(null);

  useEffect(() => {
    loadRelatorios();
  }, []);

  const loadRelatorios = async () => {
    try {
      const res = await fetch(`/api/professores/me?include=relatorios`);
      if (res.ok) {
        const data = await res.json();
        setRelatorios(data.relatorios || []);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar relatórios por turma e bimestre
  const relatoriosAgrupados = relatorios.reduce((acc, rel) => {
    const key = `${rel.turma.name}-${rel.bimestre.numero}`;
    if (!acc[key]) {
      acc[key] = {
        turma: rel.turma.name,
        turmaId: rel.turmaId,
        bimestre: rel.bimestre.numero,
        bimestreId: rel.bimestreId,
        relatorios: [],
      };
    }
    acc[key].relatorios.push(rel);
    return acc;
  }, {} as Record<string, RelatorioAgrupado>);

  const grupos = Object.values(relatoriosAgrupados).sort((a, b) => {
    if (a.turma !== b.turma) return a.turma.localeCompare(b.turma);
    return a.bimestre - b.bimestre;
  });

  const toggleExpand = (key: string) => {
    const newExpandidos = new Set(expandidos);
    if (newExpandidos.has(key)) {
      newExpandidos.delete(key);
    } else {
      newExpandidos.add(key);
    }
    setExpandidos(newExpandidos);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (relatorios.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
        <FiFileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Você ainda não enviou nenhum relatório</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Relatórios Enviados</h3>
          <p className="text-sm text-gray-500">
            Total: {relatorios.length} relatório(s)
          </p>
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="space-y-3">
        {grupos.map((grupo) => {
          const key = `${grupo.turma}-${grupo.bimestre}`;
          const isExpanded = expandidos.has(key);

          return (
            <div key={key} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(key)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  <div className="text-left">
                    <p className="font-semibold">{grupo.turma}</p>
                    <p className="text-sm text-gray-500">
                      {grupo.bimestre}º Bimestre • {grupo.relatorios.length} relatório(s)
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  grupo.relatorios[0]?.status === 'ENVIADO' ? 'bg-green-100 text-green-700' :
                  grupo.relatorios[0]?.status === 'REVISADO' ? 'bg-blue-100 text-blue-700' :
                  grupo.relatorios[0]?.status === 'ARQUIVADO' ? 'bg-gray-100 text-gray-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {grupo.relatorios[0]?.status}
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y">
                  {grupo.relatorios.map((rel) => (
                    <div key={rel.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{rel.aluno.name}</p>
                          <p className="text-sm text-gray-500">
                            {rel.materia.name} • {format(new Date(rel.createdAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <button
                          onClick={() => setRelatorioSelecionado(rel)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Ver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Visualização */}
      <Dialog.Root open={!!relatorioSelecionado} onOpenChange={() => setRelatorioSelecionado(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-3xl z-50 max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold mb-4 flex items-center justify-between">
              <span>Relatório - {relatorioSelecionado?.aluno.name}</span>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Title>

            {relatorioSelecionado && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded">
                  <div>
                    <p className="text-sm text-gray-500">Turma</p>
                    <p className="font-medium">{relatorioSelecionado.turma.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bimestre</p>
                    <p className="font-medium">{relatorioSelecionado.bimestre.numero}º</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Matéria</p>
                    <p className="font-medium">{relatorioSelecionado.materia.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-medium">
                      {format(new Date(relatorioSelecionado.createdAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Conteúdo</p>
                  <div className="prose prose-sm max-w-none p-4 bg-gray-50 dark:bg-gray-900/50 rounded">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {relatorioSelecionado.conteudo}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                      Fechar
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
