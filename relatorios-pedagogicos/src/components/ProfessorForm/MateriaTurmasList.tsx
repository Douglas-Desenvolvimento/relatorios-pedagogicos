'use client';

import ComponentCard from "@/components/common/ComponentCard";
import Radio from "@/components/form/input/Radio";

interface Turma {
  id: number;
  name: string;
}

interface Materia {
  id: number;
  name: string;
  turmas?: Turma[];
}

interface MateriaTurmasListProps {
  materias: Materia[];
  selectedMateriaId: number | null;
  onTurmaSelect: (id: number | null) => void;
  selectedTurmaId?: number | null;
}

export default function MateriaTurmasList({
  materias,
  selectedMateriaId,
  onTurmaSelect,
  selectedTurmaId,
}: MateriaTurmasListProps) {
  const materiaSelecionada = materias.find((m) => m.id === selectedMateriaId);

  if (!materiaSelecionada) {
    return <p className="text-gray-500">Nenhuma matéria selecionada.</p>;
  }

  return (
    
      <div className="flex flex-wrap gap-4">
        {materiaSelecionada.turmas?.length ? (
          materiaSelecionada.turmas.map((turma) => (
            <div
              key={turma.id}
              className={`p-2 rounded transition-colors ${
                selectedTurmaId === turma.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Radio
                id={`turma-${turma.id}`}
                name="turma-radio"
                value={String(turma.id)}
                checked={selectedTurmaId === turma.id}
                onChange={(value) => onTurmaSelect(Number(value))}
                label={turma.name}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            Nenhuma turma disponível para esta matéria.
          </p>
        )}
      </div>
    
  );
}