// src/components/CoordenadorDashboard/ImportarConceitosSection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import { FiUpload, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Bimestre {
  id: number;
  numero: number;
  ativo: boolean;
}

export default function ImportarConceitosSection() {
  const [file, setFile] = useState<File | null>(null);
  const [bimestreId, setBimestreId] = useState('');
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    loadBimestres();
  }, []);

  const loadBimestres = async () => {
    try {
      const res = await fetch('/api/ano-letivo');
      if (res.ok) {
        const anos = await res.json();
        const anoAtivo = anos.find((a: any) => a.ativo);
        if (anoAtivo && anoAtivo.bimestres) {
          setBimestres(anoAtivo.bimestres);
          // Auto-selecionar bimestre ativo
          const bimestreAtivo = anoAtivo.bimestres.find((b: Bimestre) => b.ativo);
          if (bimestreAtivo) {
            setBimestreId(bimestreAtivo.id.toString());
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar bimestres:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setResultado(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !bimestreId) {
      toast.error('Selecione um arquivo e um bimestre');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bimestreId', bimestreId);

      const res = await fetch('/api/importar-conceitos', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResultado(data);
        setFile(null);
        toast.success(`Importação concluída! ${data.atualizados} alunos atualizados.`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao importar');
      }
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card de Seleção */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-6">
          <FiUpload className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-semibold">Importar Conceitos Globais</h3>
            <p className="text-sm text-gray-500">Faça upload de uma planilha Excel com os conceitos dos alunos</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Seletor de Bimestre */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <FiCalendar /> Bimestre *
            </label>
            <select
              value={bimestreId}
              onChange={(e) => setBimestreId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione o bimestre</option>
              {bimestres.map(bim => (
                <option key={bim.id} value={bim.id}>
                  {bim.numero}º Bimestre {bim.ativo && '(Ativo)'}
                </option>
              ))}
            </select>
          </div>

          {/* Upload de Arquivo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Arquivo Excel *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            {file && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                ✓ {file.name}
              </p>
            )}
          </div>

          {/* Botão de Upload */}
          <button
            onClick={handleUpload}
            disabled={!file || !bimestreId || uploading}
            className={
              `w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              !file || !bimestreId || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processando...
              </>
            ) : (
              <>
                <FiUpload /> Importar Conceitos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Formato do arquivo:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Cada aba deve representar uma turma</li>
              <li>Deve conter coluna "Matrícula" ou "Nº Aluno"</li>
              <li>A coluna AJ (36ª coluna) deve conter o conceito global (RI, R, B, MB)</li>
              <li>Apenas alunos com conceito "RI" serão marcados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Importação Concluída</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Linhas Processadas:</p>
              <p className="font-semibold text-lg">{resultado.processados}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Alunos Atualizados:</p>
              <p className="font-semibold text-lg text-green-600">{resultado.atualizados}</p>
            </div>
          </div>

          {resultado.erros.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-red-600 mb-2">Erros:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {resultado.erros.map((erro: string, idx: number) => (
                  <li key={idx}>• {erro}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.alunosComRI.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alunos com RI identificados: {resultado.alunosComRI.length}
              </p>
              <div className="max-h-40 overflow-y-auto">
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {resultado.alunosComRI.map((aluno: any, idx: number) => (
                    <li key={idx}>• {aluno.nome} ({aluno.matricula}) - {aluno.turma}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}