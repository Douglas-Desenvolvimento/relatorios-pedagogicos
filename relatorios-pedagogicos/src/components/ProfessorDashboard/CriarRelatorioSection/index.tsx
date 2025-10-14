// src/components/ProfessorDashboard/CriarRelatorioSection/index.tsx
'use client';

import AlunoSelect from '@/components/ProfessorForm/AlunoSelect';
import { useState } from 'react';
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

  const selectedMateria = professor.materias.find((m: any) => m.id === selectedMateriaId) || null;

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
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {bimestreAtivo.numero}º
            </div>
            <div>
              <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                Bimestre Corrente
              </p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Os relatórios criados serão registrados para este bimestre
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seleção de Matéria */}
      {professor.materias.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Matéria</label>
          <select
            value={selectedMateriaId || ''}
            onChange={(e) => {
              const materiaId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedMateriaId(materiaId);
              setSelectedTurma(null);
            }}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Selecione uma matéria</option>
            {professor.materias.map((materia: any) => (
              <option key={materia.id} value={materia.id}>
                {materia.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Componente de Seleção de Aluno */}
      {selectedMateria && selectedMateria.turmas && (
        <AlunoSelect
          materias={[selectedMateria]}
          professor={professor}
          selectedTurma={selectedTurma}
          onTurmaSelect={handleTurmaSelect}
          bimestreId={bimestreAtivo?.id}
        />
      )}

      {!selectedMateria && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
          <p className="text-gray-500">Selecione uma matéria para começar</p>
        </div>
      )}
    </div>
  );
}
