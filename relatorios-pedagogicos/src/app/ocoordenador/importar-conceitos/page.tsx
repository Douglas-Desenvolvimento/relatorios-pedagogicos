"use client";

import { useState, useEffect } from "react";
import { FiUpload, FiFileText, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import Button from "@/components/ui/button/Button";

interface Bimestre {
  id: number;
  numero: number;
  ativo: boolean;
}

interface ResultadoImportacao {
  sucesso: boolean;
  processados: number;
  atualizados: number;
  erros: string[];
  alunosComRI: Array<{
    matricula: string;
    nome: string;
    turma: string;
  }>;
}

export default function ImportarConceitosPage() {
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
  const [bimestreSelecionado, setBimestreSelecionado] = useState<number | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  useEffect(() => {
    loadBimestres();
  }, []);

  const loadBimestres = async () => {
    try {
      const res = await fetch("/api/ano-letivo");
      if (res.ok) {
        const anos = await res.json();
        const anoAtivo = anos.find((a: any) => a.ativo);
        if (anoAtivo && anoAtivo.bimestres) {
          setBimestres(anoAtivo.bimestres);
          // Selecionar bimestre ativo por padrão
          const bimestreAtivo = anoAtivo.bimestres.find((b: Bimestre) => b.ativo);
          if (bimestreAtivo) {
            setBimestreSelecionado(bimestreAtivo.id);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar bimestres:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
        return;
      }
      setArquivo(file);
      setResultado(null);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !bimestreSelecionado) {
      alert("Selecione um arquivo e um bimestre");
      return;
    }

    setUploading(true);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      formData.append("bimestreId", bimestreSelecionado.toString());

      const res = await fetch("/api/importar-conceitos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResultado(data);
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao importar arquivo");
      }
    } catch (error) {
      alert("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Importar Conceitos do Excel
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Faça upload do arquivo com os conceitos dos alunos por bimestre
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          1. Selecione o Bimestre
        </h2>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {bimestres.map((bimestre) => (
            <button
              key={bimestre.id}
              onClick={() => setBimestreSelecionado(bimestre.id)}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                bimestreSelecionado === bimestre.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
              data-testid={`select-bimestre-${bimestre.numero}`}
            >
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {bimestre.numero}º
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Bimestre
              </div>
              {bimestre.ativo && (
                <div className="mt-1 text-xs text-blue-600">Ativo</div>
              )}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          2. Faça Upload do Arquivo Excel
        </h2>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <FiFileText size={48} className="mx-auto mb-4 text-gray-400" />
          
          {arquivo ? (
            <div className="mb-4">
              <p className="font-medium text-gray-800 dark:text-white">
                {arquivo.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(arquivo.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Arraste o arquivo aqui ou clique para selecionar
            </p>
          )}

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              as="span"
              size="sm"
              className="cursor-pointer"
              data-testid="select-file-btn"
            >
              <FiUpload className="inline mr-2" />
              {arquivo ? "Trocar Arquivo" : "Selecionar Arquivo"}
            </Button>
          </label>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            📋 Formato do Arquivo
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Cada aba deve representar uma turma</li>
            <li>• Coluna "Nº Matrícula" com a matrícula do aluno</li>
            <li>• Coluna "Conceito Global" com valores: RI, MB, B ou R</li>
            <li>• Alunos devem estar cadastrados no sistema</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!arquivo || !bimestreSelecionado || uploading}
            className="flex items-center gap-2"
            data-testid="upload-btn"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processando...
              </>
            ) : (
              <>
                <FiUpload /> Importar Conceitos
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            {resultado.sucesso ? (
              <FiCheckCircle size={24} className="text-green-600" />
            ) : (
              <FiAlertCircle size={24} className="text-red-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Resultado da Importação
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {resultado.processados}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processados
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {resultado.atualizados}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Atualizados
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {resultado.erros.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Erros
              </div>
            </div>
          </div>

          {resultado.alunosComRI.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Alunos com Conceito RI ({resultado.alunosComRI.length})
              </h3>
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                {resultado.alunosComRI.map((aluno, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <span className="text-sm text-gray-800 dark:text-white">
                      {aluno.nome}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {aluno.turma} • {aluno.matricula}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultado.erros.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-600 mb-2">
                Erros Encontrados
              </h3>
              <div className="max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                {resultado.erros.map((erro, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-red-700 dark:text-red-400 py-1"
                  >
                    • {erro}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
