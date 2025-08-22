// src/components/ProfessorForm/AlunoTable.tsx
import React from 'react';
import { AlunoComRelatorios } from '@/types/types';

interface AlunoTableProps {
  alunos: AlunoComRelatorios[];
  onVisualizar: (aluno: AlunoComRelatorios) => void;
}

export default function AlunoTable({ alunos, onVisualizar }: AlunoTableProps) {
  if (!alunos || alunos.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-2">Relatórios Enviados {' '}
        <span className="text-sm font-normal text-gray-500">
          (Clique no nome do aluno para ver o relatório enviado)
        </span>
      </h3>
      <table className="w-full table-auto border text-sm">
        <tbody>
          {alunos.map((aluno) => (
            <tr key={aluno.id} className="hover:bg-gray-50">
              <td className="p-2 border">
                <button
                  onClick={() => onVisualizar(aluno)}
                  className="flex items-center gap-2 text-left w-full hover:underline"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {aluno.name}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
