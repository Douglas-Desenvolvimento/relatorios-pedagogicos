// src/components/ProfessorDashboard/CriarRelatorioSection/index.tsx
'use client';

import { useState, useMemo } from 'react';
import AlunoSelect from '@/components/ProfessorForm/AlunoSelect';
import type { TurmaCompleta } from '@/types/types';

interface CriarRelatorioSectionProps {
  professor: any;
  bimestreAtivo: any;
}

export default function CriarRelatorioSection({ professor, bimestreAtivo }: CriarRelatorioSectionProps) {
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(
    professor.materias[0]?.id || null
  );
  const [selectedTurma, setSelectedTurma] = useState<TurmaCompleta | null>(null);

  const selectedMateria = useMemo(() => {
    return professor?.materias.find((m: any) => m.id === selectedMateriaId) || null;
  }, [professor, selectedMateriaId]);

  const handleTurmaSelect = (turmaId: number | null) => {
    if (!professor) return;

    let turmaSelecionada: TurmaCompleta | null = null;
    let materiaId: number | null = null;

    for (const materia of professor.materias) {
      const turma = materia.turmas?.find((t: any) => t.id === turmaId);
      if (turma) {
        turmaSelecionada = turma;
        materiaId = materia.id;
        break;
      }
    }

    setSelectedTurma(turmaSelecionada);
    setSelectedMateriaId(materiaId);
  };

  return (
    <div className="space-y-6">
      {/* Informação do Bimestre Corrente */}
      {bimestreAtivo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {bimestreAtivo.numero}º
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {bimestreAtivo.anoLetivo?.ano} - {bimestreAtivo.numero}º Bimestre
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Os relatórios criados serão registrados para este bimestre
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seleção de Matéria (se o professor tiver mais de uma) */}
      {professor.materias.length > 1 && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Selecione uma matéria</h3>
          <div className="flex flex-wrap gap-2">
            {professor.materias.map((materia: any) => (
              <button
                key={materia.id}
                onClick={() => {
                  setSelectedMateriaId(materia.id);
                  setSelectedTurma(null);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedMateriaId === materia.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {materia.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Seleção de Turma */}
      {selectedMateria?.turmas?.length ? (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Selecione uma turma</h3>
          <div className="flex flex-wrap gap-4">
            {selectedMateria.turmas.map((turma: any) => (
              <div
                key={turma.id}
                className={`p-2 rounded transition-colors ${
                  selectedTurma?.id === turma.id
                    ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  id={`turma-${turma.id}`}
                  name="turma-radio"
                  value={String(turma.id)}
                  checked={selectedTurma?.id === turma.id}
                  onChange={() => handleTurmaSelect(turma.id)}
                  className="mr-2"
                />
                <label htmlFor={`turma-${turma.id}`} className="cursor-pointer">{turma.name}</label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Componente de Seleção de Aluno - Mantém funcionalidade original */}
      {selectedTurma && selectedMateriaId && bimestreAtivo && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <AlunoSelect
            turma={selectedTurma}
            professor={professor}
            materiaId={selectedMateriaId}
            bimestreId={bimestreAtivo.id}
          />
        </div>
      )}

      {!selectedMateria && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
          <p className="text-gray-500">Selecione uma matéria para começar</p>
        </div>
      )}
    </div>
  );
}
