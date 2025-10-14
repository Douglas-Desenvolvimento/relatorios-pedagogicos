"use client";

import { useState, useEffect } from "react";
import { FiCalendar, FiCheckCircle, FiPlus } from "react-icons/fi";
import Button from "@/components/ui/button/Button";

interface AnoLetivo {
  id: number;
  ano: string;
  ativo: boolean;
  _count?: { turmas: number; bimestres: number };
}

export default function ConfiguracoesSection() {
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [novoAno, setNovoAno] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/ano-letivo");
      if (res.ok) {
        const data = await res.json();
        setAnosLetivos(data);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoAno.length !== 4 || isNaN(parseInt(novoAno))) {
      alert("Ano inválido. Use YYYY (ex: 2025)");
      return;
    }
    try {
      const res = await fetch("/api/ano-letivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano: novoAno }),
      });
      if (res.ok) {
        alert("Ano letivo criado com sucesso!");
        setShowModal(false);
        setNovoAno("");
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao criar");
      }
    } catch (error) {
      alert("Erro ao criar ano");
    }
  };

  const handleAtivarAno = async (id: number) => {
    if (!confirm("Ativar este ano letivo?")) return;
    try {
      const res = await fetch(`/api/ano-letivo/${id}/ativar`, { method: "PUT" });
      if (res.ok) {
        alert("Ano letivo ativado!");
        loadData();
      }
    } catch (error) {
      alert("Erro ao ativar ano");
    }
  };

  const handleAtivarBimestre = async (bimestreId: number) => {
    try {
      const res = await fetch(`/api/bimestre/${bimestreId}/ativar`, { method: "PUT" });
      if (res.ok) {
        alert("Bimestre ativado!");
        loadData();
      } else {
        alert("Erro ao ativar bimestre");
      }
    } catch (error) {
      alert("Erro ao ativar bimestre");
    }
  };

  const anoAtivo = anosLetivos.find((a) => a.ativo);

  return (
    <div>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Gestão de Anos Letivos</h2>
              <p className="text-sm text-gray-500 mt-1">
                Crie e ative anos letivos para organizar turmas e relatórios
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} size="sm" className="flex items-center gap-2">
              <FiPlus size={16} /> Novo Ano
            </Button>
          </div>

          {/* Grid de Anos Letivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anosLetivos.map((ano) => (
              <div
                key={ano.id}
                className={`p-6 rounded-lg border-2 transition-all ${
                  ano.ativo 
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg" 
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <FiCalendar size={32} className={ano.ativo ? "text-green-600" : "text-gray-400"} />
                    <div>
                      <p className="text-2xl font-bold">{ano.ano}</p>
                      <p className="text-sm text-gray-500">
                        {ano._count?.turmas || 0} turma(s) • {ano._count?.bimestres || 0} bimestre(s)
                      </p>
                    </div>
                  </div>

                  {ano.ativo ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold bg-green-100 dark:bg-green-900/40 py-2 rounded">
                      <FiCheckCircle size={18} />
                      <span>Ano Ativo</span>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleAtivarAno(ano.id)}
                      className="w-full"
                    >
                      Ativar Este Ano
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {anosLetivos.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Nenhum ano letivo cadastrado</p>
                <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2">
                  <FiPlus size={16} /> Criar Primeiro Ano
                </Button>
              </div>
            )}
          </div>

          {/* Gestão de Bimestres */}
          {anoAtivo && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiCalendar className="text-indigo-600" />
                Bimestre Corrente
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {anoAtivo.bimestres?.map((bim: any) => (
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
                )) || [1, 2, 3, 4].map(num => (
                  <div key={num} className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 opacity-50">
                    <div className="text-2xl font-bold mb-1">{num}º</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Bimestre</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * O bimestre corrente é usado como padrão para novos relatórios
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <FiCalendar size={20} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Sobre Anos Letivos</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  • O ano ativo é usado como padrão para novas turmas e relatórios<br />
                  • Cada ano possui 4 bimestres automáticos<br />
                  • Apenas um ano pode estar ativo por vez<br />
                  • Defina o bimestre corrente para orientar os professores
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Novo Ano Letivo</h2>
            <form onSubmit={handleCreateAno}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Ano (YYYY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={novoAno}
                  onChange={(e) => setNovoAno(e.target.value)}
                  placeholder="Ex: 2026"
                  maxLength={4}
                  className="w-full px-4 py-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o ano no formato YYYY (ex: 2026)
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setNovoAno("");
                  }} 
                  className="bg-gray-300 text-gray-800 hover:bg-gray-400"
                >
                  Cancelar
                </Button>
                <Button type="submit">Criar Ano</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
