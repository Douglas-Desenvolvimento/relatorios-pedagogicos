'use client';

import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import ProfessorSelect from '@/components/ProfessorForm/ProfessorSelect';
import AlunoSelect from '@/components/ProfessorForm/AlunoSelect';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import type { ProfessorCompleto, TurmaCompleta } from '@/types/types';
import { SlActionUndo } from "react-icons/sl";

export default function ProfessorPage() {
  const [professor, setProfessor] = useState<ProfessorCompleto | null>(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<TurmaCompleta | null>(null);
  const [selectedAluno, setSelectedAluno] = useState<string | null>(null);

  const selectedMateria = useMemo(() => {
    return professor?.materias.find((m) => m.id === selectedMateriaId) || null;
  }, [professor, selectedMateriaId]);

  const handleProfessorSelect = async (professorId: number) => {
    try {
      const response = await fetch(`/api/professores/${professorId}`);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data: ProfessorCompleto = await response.json();

      setProfessor(data);
      const primeiraMateria = data.materias[0] || null;
      setSelectedMateriaId(primeiraMateria?.id ?? null);
      setSelectedTurma(null);
      setSelectedAluno(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do professor');
    }
  };

  const handleClearProfessor = () => {
    setProfessor(null);
    setSelectedMateriaId(null);
    setSelectedTurma(null);
    setSelectedAluno(null);
  };

  const handleTurmaSelect = (turmaId: number | null) => {
    if (!professor) return;

    let turmaSelecionada: TurmaCompleta | null = null;
    let materiaId: number | null = null;

    for (const materia of professor.materias) {
      const turma = materia.turmas?.find((t) => t.id === turmaId);
      if (turma) {
        turmaSelecionada = turma;
        materiaId = materia.id;
        break;
      }
    }

    setSelectedTurma(turmaSelecionada);
    setSelectedMateriaId(materiaId);
    setSelectedAluno(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        PLANO PEDAGÓGICO INDIVIDUALIZADO (PPI)
      </h1>

      <PageBreadcrumb pageTitle="Plano Pedagógico Individualizado (PPI) - Professor" />

      <div className="p-5 border shadow-lg border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        {!professor ? (
          <ProfessorSelect
            onSelect={handleProfessorSelect}
            selectedProfessorId={null}
            onClear={handleClearProfessor}
          />
        ) : (
          <div className="space-y-6">
            {/* Cabeçalho com professor/matéria e botão para alterar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-gray-500">Professor</p>
                  <h2 className="text-xl font-semibold">{professor.name}
                    <button
  onClick={handleClearProfessor}
  title="Trocar professor"
  className="ml-2 p-1 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded"
>
  <SlActionUndo size={22} />
</button>
                  </h2>
                  
                </div>
                

              </div>

              <div>
                <p className="text-xs text-gray-500">Matéria</p>
                <h2 className="text-xl font-semibold">
                  {selectedMateria?.name || 'Nenhuma matéria selecionada'}
                </h2>
              </div>
            </div>

            {/* Seleção de turma */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium mb-3">Selecione uma turma</h3>
              <div className="flex flex-wrap gap-4">
                {selectedMateria?.turmas?.length ? (
                  selectedMateria.turmas.map((turma) => (
                    <div
                      key={turma.id}
                      className={`p-2 rounded transition-colors ${
                        selectedTurma?.id === turma.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-100'
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
                      <label htmlFor={`turma-${turma.id}`}>{turma.name}</label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Nenhuma turma disponível para esta matéria.
                  </p>
                )}
              </div>
            </div>

            {/* AlunoSelect (após seleção de turma) */}
            {selectedTurma && selectedMateriaId && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <AlunoSelect
                  turma={selectedTurma}
                  professor={professor}
                  materiaId={selectedMateriaId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
