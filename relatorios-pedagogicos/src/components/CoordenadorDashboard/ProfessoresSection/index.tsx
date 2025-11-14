"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiBook, FiUsers } from "react-icons/fi";
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { toast } from 'react-toastify';
import Button from "@/components/ui/button/Button";

interface Professor {
  id: number;
  name: string;
  email: string;
  matricula: string;
  login?: string;
  turmas: { id: number; name: string }[];
  materias: { id: number; name: string }[];
  relatorios?: {
    id: number;
    conteudo: string;
    bimestreId: number;
    bimestre?: { numero: number };
    aluno: { name: string };
    materia: { name: string };
    turma: { name: string };
  }[];
}

export default function ProfessoresSection() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", matricula: "", login: "" });

  useEffect(() => {
    loadProfessores();
  }, []);

  const loadProfessores = async () => {
    try {
      const res = await fetch("/api/professores?include=turmas,materias,relatorios");
      if (res.ok) {
        const data = await res.json();
        setProfessores(data);
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
      const url = editingProfessor 
        ? `/api/professores/${editingProfessor.id}`
        : "/api/professores";
      
      const res = await fetch(url, {
        method: editingProfessor ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          turmaIds: [],
          materiaIds: []
        }),
      });

      if (res.ok) {
        toast.success(editingProfessor ? "Professor atualizado!" : "Professor criado!");
        setShowModal(false);
        setEditingProfessor(null);
        setFormData({ name: "", email: "", matricula: "" });
        loadProfessores();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro ao salvar professor");
    }
  };

  const handleEdit = (professor: Professor) => {
    setEditingProfessor(professor);
    setFormData({
      name: professor.name,
      email: professor.email,
      matricula: professor.matricula || "",
      login: professor.login || ""
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/professores/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Professor excluído!");
        setDeletingId(null);
        loadProfessores();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir");
      }
    } catch (error) {
      toast.error("Erro ao excluir professor");
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

  const filteredProfessores = professores.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.login && p.login.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header com Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar professor..."
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
            setEditingProfessor(null);
            setFormData({ name: "", email: "", matricula: "", login: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <FiPlus /> Novo Professor
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold">Professores Cadastrados</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredProfessores.length} professor(es) encontrado(s)
            </p>
          </div>

          <div className="divide-y">
            {filteredProfessores.map((professor) => (
              <div key={professor.id}>
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleExpand(professor.id)}
                        className="text-gray-500"
                      >
                        {expandedId === professor.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </button>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{professor.name}</p>
                        <p className="text-sm text-blue-600">{professor.login || 'Login não gerado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(professor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeletingId(professor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {expandedId === professor.id && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t space-y-4">
                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <p className="font-medium">{professor.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Matrícula</p>
                        <p className="font-medium">{professor.matricula || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Login</p>
                        <p className="font-medium text-blue-600">{professor.login || "-"}</p>
                      </div>
                    </div>

                    {/* Matérias */}
                    {professor.materias.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                          <FiBook size={16} /> Matérias
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {professor.materias.map(mat => (
                            <span key={mat.id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {mat.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Turmas */}
                    {professor.turmas.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                          <FiUsers size={16} /> Turmas
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {professor.turmas.map(turma => (
                            <span key={turma.id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {turma.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relatórios por Bimestre */}
                    {professor.relatorios && professor.relatorios.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Relatórios por Bimestre</p>
                        <div className="space-y-3">
                          {Object.entries(agruparRelatoriosPorBimestre(professor.relatorios))
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([bimNum, rels]) => (
                            <div key={bimNum} className="p-3 bg-white dark:bg-gray-800 rounded border">
                              <p className="font-semibold mb-2 text-blue-600">{bimNum}º Bimestre</p>
                              <ul className="space-y-1 text-sm ml-4">
                                {rels.map((rel: any) => (
                                  <li key={rel.id}>
                                    <strong>{rel.aluno.name}</strong> - {rel.materia.name} ({rel.turma.name})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredProfessores.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? "Nenhum professor encontrado" : "Nenhum professor cadastrado"}
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
              {editingProfessor ? "Editar Professor" : "Novo Professor"}
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
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Matrícula</label>
                <input
                  type="text"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              {editingProfessor && (
                <div>
                  <label className="block text-sm font-medium mb-2">Login</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: nome.sobrenome"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para gerar automaticamente</p>
                </div>
              )}
              {!editingProfessor && (
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                  <strong>Nota:</strong> O login será gerado automaticamente baseado no nome
                </div>
              )}
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">
                  Cancelar
                </Button>
                <Button type="submit">{editingProfessor ? "Salvar" : "Criar"}</Button>
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
              Tem certeza que deseja excluir este professor? Esta ação não pode ser desfeita.
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
