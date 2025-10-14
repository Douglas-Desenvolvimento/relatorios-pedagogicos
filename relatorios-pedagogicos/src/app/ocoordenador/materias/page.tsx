"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import Button from "@/components/ui/button/Button";

interface Materia {
  id: number;
  name: string;
  codigo: string | null;
  totalProfessores?: number;
  totalRelatorios?: number;
  totalTurmas?: number;
}

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
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
      
      const method = editingMateria ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingMateria ? "Matéria atualizada!" : "Matéria criada!");
        setShowModal(false);
        setFormData({ name: "", codigo: "" });
        setEditingMateria(null);
        loadMaterias();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao salvar matéria");
      }
    } catch (error) {
      alert("Erro ao salvar matéria");
    }
  };

  const handleEdit = (materia: Materia) => {
    setEditingMateria(materia);
    setFormData({ name: materia.name, codigo: materia.codigo || "" });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta matéria?")) return;

    try {
      const res = await fetch(`/api/materias/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Matéria excluída!");
        loadMaterias();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao excluir matéria");
      }
    } catch (error) {
      alert("Erro ao excluir matéria");
    }
  };

  const filteredMaterias = materias.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Gerenciar Matérias
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Cadastre e gerencie as matérias do currículo
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar matéria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <Button
          onClick={() => {
            setEditingMateria(null);
            setFormData({ name: "", codigo: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
          data-testid="criar-materia-btn"
        >
          <FiPlus /> Nova Matéria
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Matéria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Professores
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Turmas
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Relatórios
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMaterias.map((materia) => (
                <tr key={materia.id} data-testid={`materia-row-${materia.id}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {materia.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {materia.codigo || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    {materia.totalProfessores || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    {materia.totalTurmas || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    {materia.totalRelatorios || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      onClick={() => handleEdit(materia)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      data-testid={`edit-materia-${materia.id}`}
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(materia.id)}
                      className="text-red-600 hover:text-red-800"
                      data-testid={`delete-materia-${materia.id}`}
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMaterias.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "Nenhuma matéria encontrada"
                : "Nenhuma matéria cadastrada"}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editingMateria ? "Editar Matéria" : "Nova Matéria"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Matéria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                  data-testid="materia-name-input"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código (opcional)
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  data-testid="materia-codigo-input"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingMateria(null);
                    setFormData({ name: "", codigo: "" });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-materia-btn">
                  {editingMateria ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
