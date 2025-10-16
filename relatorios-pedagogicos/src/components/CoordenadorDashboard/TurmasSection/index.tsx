// TurmasSection - Refactored to match RelatoriosSection pattern
"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUsers, FiBook } from "react-icons/fi";
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { toast } from 'react-toastify';
import Button from "@/components/ui/button/Button";

interface Turma {
  id: number;
  name: string;
  anoLetivo?: { id: number; ano: string; ativo: boolean };
  anoLetivoId?: number;
  alunos: { id: number; name: string; matricule: string; active: boolean }[];
  professores: { id: number; name: string }[];
  materias: { id: number; name: string }[];
  _count?: { alunos: number; relatorios: number };
}

interface AnoLetivo {
  id: number;
  ano: string;
  ativo: boolean;
}

export default function TurmasSection() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [relatoriosPorBimestre, setRelatoriosPorBimestre] = useState<Record<number, any[]>>({});
  const [formData, setFormData] = useState({ name: "", anoLetivoId: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [turmasRes, anosRes] = await Promise.all([
        fetch("/api/turmas"),
        fetch("/api/ano-letivo")
      ]);
      
      if (turmasRes.ok) {
        const turmasData = await turmasRes.json();
        setTurmas(turmasData);
      }
      
      if (anosRes.ok) {
        const anosData = await anosRes.json();
        setAnosLetivos(anosData);
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
      const url = editingTurma ? `/api/turmas/${editingTurma.id}` : "/api/turmas";
      const res = await fetch(url, {
        method: editingTurma ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          anoLetivoId: parseInt(formData.anoLetivoId)
        }),
      });

      if (res.ok) {
        toast.success(editingTurma ? "Turma atualizada!" : "Turma criada!");
        setShowModal(false);
        setEditingTurma(null);
        setFormData({ name: "", anoLetivoId: "" });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro ao salvar turma");
    }
  };

  const handleEdit = (turma: Turma) => {
    setEditingTurma(turma);
    setFormData({
      name: turma.name,
      anoLetivoId: turma.anoLetivoId?.toString() || ""
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/turmas/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Turma excluída!");
        setDeletingId(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir");
      }
    } catch (error) {
      toast.error("Erro ao excluir turma");
    }
  };

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Carregar relatórios da turma agrupados por bimestre
      await loadRelatoriosTurma(id);
    }
  };

  const loadRelatoriosTurma = async (turmaId: number) => {
    try {
      const res = await fetch(`/api/alunos?turmaId=${turmaId}&include=relatorios`);
      if (res.ok) {
        const alunos = await res.json();
        const relatorios: any[] = [];
        alunos.forEach((aluno: any) => {
          if (aluno.relatorios) {
            relatorios.push(...aluno.relatorios);
          }
        });
        
        // Agrupar por bimestre
        const porBimestre: Record<number, any[]> = {};
        relatorios.forEach((rel) => {
          const bimNum = rel.bimestre?.numero || 0;
          if (!porBimestre[bimNum]) porBimestre[bimNum] = [];
          porBimestre[bimNum].push(rel);
        });
        
        setRelatoriosPorBimestre(prev => ({ ...prev, [turmaId]: porBimestre }));
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios da turma:', error);
    }
  };

  const filteredTurmas = turmas.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const anoAtivoId = anosLetivos.find(a => a.ativo)?.id;

  return (
    <div className="space-y-6">
      {/* Header com Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar turma..."
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
            setEditingTurma(null);
            setFormData({ name: "", anoLetivoId: anoAtivoId?.toString() || "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <FiPlus /> Nova Turma
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold">Turmas Cadastradas</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredTurmas.length} turma(s) encontrada(s)
            </p>
          </div>

          <div className="divide-y">
            {filteredTurmas.map((turma) => {
              const totalAlunos = turma._count?.alunos || turma.alunos.length;
              const totalRelatorios = turma._count?.relatorios || 0;

              return (
                <div key={turma.id}>
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleExpand(turma.id)}
                          className="text-gray-500"
                        >
                          {expandedId === turma.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{turma.name}</p>
                          <p className="text-sm text-gray-500">
                            {totalAlunos} aluno(s) • {totalRelatorios} relatório(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(turma)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingId(turma.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {expandedId === turma.id && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Ano Letivo</p>
                          <p className="font-medium">{turma.anoLetivo?.ano || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Alunos</p>
                          <p className="font-medium">{totalAlunos}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Relatórios</p>
                          <p className="font-medium">{totalRelatorios}</p>
                        </div>
                      </div>

                      {turma.professores.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <FiUsers size={16} /> Professores
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {turma.professores.map(prof => (
                              <span key={prof.id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {prof.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {turma.materias.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <FiBook size={16} /> Matérias
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {turma.materias.map(mat => (
                              <span key={mat.id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                {mat.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {turma.alunos.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Alunos</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {turma.alunos.map(aluno => (
                              <div key={aluno.id} className="text-sm">
                                {aluno.name} - {aluno.matricule}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Relatórios por Bimestre */}
                      {relatoriosPorBimestre[turma.id] && Object.keys(relatoriosPorBimestre[turma.id]).length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-semibold">Relatórios por Bimestre</p>
                          <div className="space-y-3">
                            {Object.entries(relatoriosPorBimestre[turma.id])
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([bimNum, rels]) => (
                              <div key={bimNum} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-semibold mb-2 text-blue-600">{bimNum}º Bimestre</p>
                                <p className="text-sm text-gray-600">
                                  {rels.length} relatório(s) cadastrado(s)
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTurmas.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? "Nenhuma turma encontrada" : "Nenhuma turma cadastrada"}
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
              {editingTurma ? "Editar Turma" : "Nova Turma"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Turma *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: 1º Ano A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ano Letivo *</label>
                <select
                  value={formData.anoLetivoId}
                  onChange={(e) => setFormData({ ...formData, anoLetivoId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione...</option>
                  {anosLetivos.map(ano => (
                    <option key={ano.id} value={ano.id}>
                      {ano.ano} {ano.ativo && "(Ativo)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">
                  Cancelar
                </Button>
                <Button type="submit">{editingTurma ? "Salvar" : "Criar"}</Button>
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
              Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.
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
