'use client';

import { AlunoComRelatorios } from '@/types/types';
import { saveAs } from 'file-saver';
import { useState, Dispatch, SetStateAction } from 'react';
import { FcDocument } from 'react-icons/fc';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross1Icon } from '@radix-ui/react-icons';

interface PPIExportButtonProps {
  alunos: AlunoComRelatorios[];
  nomeTurma: string;
  setLoading?: Dispatch<SetStateAction<boolean>>;
}

export default function PPIExportButton({
  alunos,
  nomeTurma,
  setLoading,
}: PPIExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [quantidadeMinima, setQuantidadeMinima] = useState<number>(1);
  const [usarTodos, setUsarTodos] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleExportar = async () => {
    const alunosFiltrados = usarTodos
      ? alunos
      : alunos.filter((aluno) => aluno.relatorios.length >= quantidadeMinima);

    if (alunosFiltrados.length === 0) {
      setErro(`Nenhum aluno com ${quantidadeMinima} ou mais relatórios.`);
      return;
    }

    setErro(null);
    setGerando(true);
    setLoading?.(true);

    try {
      const response = await fetch('/api/exportar-ppis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunos: alunosFiltrados,
          quantidadeMinima: usarTodos ? 0 : quantidadeMinima,
        }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao gerar os arquivos');
      }

      const blob = await response.blob();
      
      // Extrair o nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `ppis_${nomeTurma}.zip`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      saveAs(blob, filename);
      setOpen(false); // fecha só após exportar
    } catch (err: any) {
      console.error('Erro ao exportar PPIs:', err);
      setErro('Falha ao gerar documentos. Verifique os dados ou tente novamente.');
    } finally {
      setGerando(false);
      setLoading?.(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !gerando && setOpen(val)}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100">
          <FcDocument className="text-lg" />
          Exportar PPIs
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50">
          <Dialog.Title className="text-xl font-semibold text-center mb-6">
            Exportar PPIs
          </Dialog.Title>

          {gerando ? (
            <div className="text-center text-gray-700 font-medium animate-pulse py-6">
              Gerando arquivos<span className="animate-ping">...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <label className="block text-sm font-medium mb-2">
                  Quantos relatórios o aluno deve ter para exportar seu PPI
                </label>
                <input
                  type="number"
                  min={0}
                  value={quantidadeMinima}
                  onChange={(e) => setQuantidadeMinima(Number(e.target.value))}
                  disabled={usarTodos}
                  className="border p-2 rounded w-24 text-center mx-auto"
                />
              </div>

              <div className="text-center">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={usarTodos}
                    onChange={() => setUsarTodos(!usarTodos)}
                  />
                  Ou clique aqui para exportar todos os PPIs da turma
                </label>
              </div>

              {erro && (
                <div className="text-sm text-red-600 bg-red-100 p-2 rounded text-center">
                  {erro}
                </div>
              )}

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-1 border text-gray-700 rounded hover:bg-gray-100"
                  disabled={gerando}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportar}
                  className="px-5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={gerando}
                >
                  Exportar agora
                </button>
              </div>
            </div>
          )}

          {!gerando && (
            <Dialog.Close asChild>
              <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
                <Cross1Icon />
              </button>
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
