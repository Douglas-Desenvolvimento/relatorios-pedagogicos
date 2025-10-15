"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from "react-icons/fi";
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { toast } from 'react-toastify';
import Button from "@/components/ui/button/Button";

interface Materia {
  id: number;
  name: string;
  codigo: string | null;
  totalProfessores?: number;
  totalTurmas?: number;
}

export default function MateriasSection() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", codigo: "" });

  useEffect(() => {
    loadMaterias();
  }, []);

  const loadMaterias = async () => {
    try {
      const res = await fetch("/api/materias");
      if (res.ok) {
        const data = await res.json();
        setMaterias(data);
      }
    } catch (error) {
      console.error("Erro ao carregar matérias:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingMateria 
        ? `/api/materias/${editingMateria.id}`
        : "/api/materias";
      
      const res = await fetch(url, {
        method: editingMateria ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingMateria ? "Matéria atualizada!" : "Matéria criada!");
        setShowModal(false);
        setEditingMateria(null);
        setFormData({ name: "", codigo: "" });
        loadMaterias();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro ao salvar matéria");
    }
  };

  const handleEdit = (materia: Materia) => {
    setEditingMateria(materia);
    setFormData({ name: materia.name, codigo: materia.codigo || "" });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/materias/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Matéria excluída!");
        setDeletingId(null);
        loadMaterias();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir");
      }
    } catch (error) {
      toast.error("Erro ao excluir matéria");
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredMaterias = materias.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar matéria..."
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
            setEditingMateria(null);
            setFormData({ name: "", codigo: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <FiPlus /> Nova Matéria
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold">Matérias Cadastradas</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredMaterias.length} matéria(s) encontrada(s)
            </p>
          </div>

          <div className="divide-y">
            {filteredMaterias.map((materia) => (
              <div key={materia.id}>
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleExpand(materia.id)}
                        className="text-gray-500"
                      >
                        {expandedId === materia.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </button>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{materia.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(materia)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeletingId(materia.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {expandedId === materia.id && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Código</p>
                        <p className="font-medium">{materia.codigo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Professores</p>
                        <p className="font-medium">{materia.totalProfessores || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Turmas</p>
                        <p className="font-medium">{materia.totalTurmas || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredMaterias.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? "Nenhuma matéria encontrada" : "Nenhuma matéria cadastrada"}
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
              {editingMateria ? "Editar Matéria" : "Nova Matéria"}
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
                <label className="block text-sm font-medium mb-2">Código</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">
                  Cancelar
                </Button>
                <Button type="submit">{editingMateria ? "Salvar" : "Criar"}</Button>
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
              Tem certeza que deseja excluir esta matéria? Esta ação não pode ser desfeita.
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
