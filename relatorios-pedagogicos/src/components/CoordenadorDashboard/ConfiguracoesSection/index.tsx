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

interface Bimestre {
  id: number;
  numero: number;
  ativo: boolean;
}

export default function ConfiguracoesSection() {
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([]);
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
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
        const anoAtivo = data.find((a: AnoLetivo) => a.ativo);
        if (anoAtivo?.bimestres) setBimestres(anoAtivo.bimestres);
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
        alert("Ano criado!");
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
    if (!confirm("Ativar este ano?")) return;
    try {
      const res = await fetch(`/api/ano-letivo/${id}/ativar`, { method: "PUT" });
      if (res.ok) {
        alert("Ano ativado!");
        loadData();
      }
    } catch (error) {
      alert("Erro");
    }
  };

  const handleAtivarBimestre = async (id: number) => {
    try {
      const res = await fetch(`/api/bimestre/${id}/ativar`, { method: "PUT" });
      if (res.ok) {
        alert("Bimestre ativado!");
        loadData();
      }
    } catch (error) {
      alert("Erro");
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Anos Letivos</h2>
              <Button onClick={() => setShowModal(true)} size="sm" className="flex items-center gap-2">
                <FiPlus size={16} /> Novo Ano
              </Button>
            </div>
            <div className="space-y-3">
              {anosLetivos.map((ano) => (
                <div
                  key={ano.id}
                  className={`p-4 rounded-lg border-2 ${
                    ano.ativo ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiCalendar size={24} className={ano.ativo ? "text-green-600" : "text-gray-400"} />
                      <div>
                        <p className="font-semibold">Ano {ano.ano}</p>
                        <p className="text-sm text-gray-500">{ano._count?.turmas || 0} turmas</p>
                      </div>
                    </div>
                    {ano.ativo ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <FiCheckCircle /> Ativo
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => handleAtivarAno(ano.id)}>
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Bimestres {anoAtivo && `- ${anoAtivo.ano}`}</h2>
            {anoAtivo ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((num) => {
                  const bim = bimestres.find((b) => b.numero === num);
                  const isAtivo = bim?.ativo || false;
                  return (
                    <div
                      key={num}
                      className={`p-6 rounded-lg border-2 text-center cursor-pointer ${
                        isAtivo ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"
                      }`}
                      onClick={() => bim && handleAtivarBimestre(bim.id)}
                    >
                      <div className="text-3xl font-bold mb-2">{num}º</div>
                      <div className="text-sm text-gray-600">Bimestre</div>
                      {isAtivo && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-blue-600 text-sm">
                          <FiCheckCircle size={16} /> Ativo
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                Ative um ano para gerenciar bimestres
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 text-gray-800">
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
