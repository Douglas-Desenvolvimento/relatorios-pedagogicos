// AlunosSection - Refactored with search, concepts, and standardized layout
"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from "react-icons/fi";
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Button from "@/components/ui/button/Button";

interface Conceito {
  id: number;
  conceito: string;
  bimestreId: number;
  bimestre?: { numero: number };
}

interface Aluno {
  id: number;
  name: string;
  matricule: string;
  active: boolean;
  turmaId: number;
  turma?: { name: string };
  conceitosBimestrais?: Conceito[];
  relatorios?: {
    id: number;
    conteudo: string;
    createdAt: string;
    bimestreId: number;
    bimestre?: { numero: number };
    materia: { name: string };
    professor: { name: string };
  }[];
}

interface Turma {
  id: number;
  name: string;
}

export default function AlunosSection() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", matricule: "", turmaId: "", active: true });

  useEffect(() => {
    loadTurmas();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) {
      loadAlunos();
    } else {
      setAlunos([]);
    }
  }, [turmaSelecionada]);

  const loadTurmas = async () => {
    try {
      const turmasRes = await fetch("/api/turmas");
      if (turmasRes.ok) {
        const turmasData = await turmasRes.json();
        setTurmas(turmasData);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlunos = async () => {
    if (!turmaSelecionada) return;
    
    try {
      setLoading(true);
      const url = `/api/alunos?turmaId=${turmaSelecionada}&include=relatorios,conceitos`;
      console.log('Carregando alunos:', url);
      const alunosRes = await fetch(url);
      
      if (alunosRes.ok) {
        const alunosData = await alunosRes.json();
        console.log('Alunos carregados:', alunosData.length);
        setAlunos(alunosData);
      } else {
        console.error('Erro na API:', await alunosRes.text());
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAluno ? `/api/alunos/${editingAluno.id}` : "/api/alunos";
      const res = await fetch(url, {
        method: editingAluno ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          turmaId: parseInt(formData.turmaId),
          active: formData.active
        }),
      });

      if (res.ok) {
        toast.success(editingAluno ? "Aluno atualizado!" : "Aluno criado!");
        setShowModal(false);
        setEditingAluno(null);
        setFormData({ name: "", matricule: "", turmaId: "", active: true });
        loadAlunos();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro ao salvar aluno");
    }
  };

  const handleEdit = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setFormData({
      name: aluno.name,
      matricule: aluno.matricule,
      turmaId: aluno.turmaId.toString(),
      active: aluno.active
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/alunos/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Aluno excluído!");
        setDeletingId(null);
        loadAlunos();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir");
      }
    } catch (error) {
      toast.error("Erro ao excluir aluno");
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const agruparRelatoriosPorBimestre = (relatorios: any[] = []) => {
    return relatorios.reduce((acc: Record<number, any[]>, rel) => {
      const bimNum = rel.bimestre?.numero || 1;
      if (!acc[bimNum]) acc[bimNum] = [];
      acc[bimNum].push(rel);
      return acc;
    }, {});
  };

  const agruparConceitosPorBimestre = (conceitos: Conceito[] = []) => {
    return conceitos.reduce((acc: Record<number, string>, conceito) => {
      const bimNum = conceito.bimestre?.numero || 1;
      acc[bimNum] = conceito.conceito;
      return acc;
    }, {});
  };

  const filteredAlunos = alunos.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Seletor de Turma */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <FiSearch className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Selecione a Turma
          </h3>
        </div>
        <select
          value={turmaSelecionada || ''}
          onChange={(e) => {
            setTurmaSelecionada(e.target.value ? parseInt(e.target.value) : null);
            setSearchTerm('');
          }}
          className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Selecione uma turma...</option>
          {turmas.map(turma => (
            <option key={turma.id} value={turma.id}>{turma.name}</option>
          ))}
        </select>
      </div>

      {/* Header com Busca */}
      {turmaSelecionada && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar aluno por nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            )}
          </div>
          <Button
            onClick={() => {
              setEditingAluno(null);
              setFormData({ name: "", matricule: "", turmaId: turmaSelecionada.toString(), active: true });
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <FiPlus /> Novo Aluno
          </Button>
        </div>
      )}

      {!turmaSelecionada ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
          <FiSearch size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Selecione uma turma para visualizar os alunos</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold">Alunos Cadastrados</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAlunos.length} aluno(s) encontrado(s)
            </p>
          </div>

          <div className="divide-y">
            {filteredAlunos.map((aluno) => {
              const conceitosPorBimestre = agruparConceitosPorBimestre(aluno.conceitosBimestrais || []);
              const relatoriosPorBimestre = agruparRelatoriosPorBimestre(aluno.relatorios || []);

              return (
                <div key={aluno.id}>
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleExpand(aluno.id)}
                          className="text-gray-500"
                        >
                          {expandedId === aluno.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{aluno.name}</p>
                          <p className="text-sm text-gray-500">
                            {aluno.matricule} • {aluno.turma?.name || 'Sem turma'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(aluno)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingId(aluno.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {expandedId === aluno.id && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t space-y-4">
                      {/* Informações Básicas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Matrícula</p>
                          <p className="font-medium">{aluno.matricule}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Turma</p>
                          <p className="font-medium">{aluno.turma?.name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                          <p className="font-medium">
                            <span className={`px-2 py-1 rounded text-xs ${aluno.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {aluno.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Conceitos Globais por Bimestre */}
                      {Object.keys(conceitosPorBimestre).length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-semibold">Conceitos Globais</p>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4].map(bimNum => {
                              const conceito = conceitosPorBimestre[bimNum];
                              return conceito ? (
                                <span
                                  key={bimNum}
                                  className={`px-3 py-1 rounded font-medium text-sm ${
                                    conceito === 'RI' ? 'bg-red-100 text-red-700' :
                                    conceito === 'MB' ? 'bg-green-100 text-green-700' :
                                    conceito === 'B' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {bimNum}º Bim: {conceito}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Relatórios por Bimestre */}
                      {Object.keys(relatoriosPorBimestre).length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-semibold">Relatórios por Bimestre</p>
                          <div className="space-y-3">
                            {Object.entries(relatoriosPorBimestre)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([bimNum, rels]) => (
                              <div key={bimNum} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-semibold mb-2 text-blue-600">{bimNum}º Bimestre</p>
                                <ul className="space-y-2 text-sm ml-4">
                                  {rels.map((rel: any) => (
                                    <li key={rel.id} className="border-b pb-2 last:border-0">
                                      <strong>{rel.materia.name}</strong> - Prof. {rel.professor.name}
                                      <br />
                                      <span className="text-xs text-gray-500">
                                        {format(new Date(rel.createdAt), 'dd/MM/yyyy')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(relatoriosPorBimestre).length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Nenhum relatório cadastrado para este aluno
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAlunos.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-md z-50">
            <Dialog.Title className="text-xl font-semibold mb-4">
              {editingAluno ? "Editar Aluno" : "Novo Aluno"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Matrícula *</label>
                <input
                  type="text"
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Turma *</label>
                <select
                  value={formData.turmaId}
                  onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione...</option>
                  {turmas.map(turma => (
                    <option key={turma.id} value={turma.id}>{turma.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="active" className="text-sm">Aluno ativo</label>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">
                  Cancelar
                </Button>
                <Button type="submit">{editingAluno ? "Salvar" : "Criar"}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Alert Dialog para Exclusão */}
      <AlertDialog.Root open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-md z-50">
            <AlertDialog.Title className="text-xl font-semibold mb-2">Confirmar Exclusão</AlertDialog.Title>
            <AlertDialog.Description className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <Button className="bg-gray-300 text-gray-800">Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
