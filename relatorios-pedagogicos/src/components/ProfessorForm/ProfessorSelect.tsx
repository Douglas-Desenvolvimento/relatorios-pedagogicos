'use client';

import { useState, useEffect } from 'react';
import Select from '@/components/form/Select';
import Image from 'next/image'; // para carregar SVG de forma otimizada

interface ProfessorSelectProps {
  onSelect: (id: number) => void;
  selectedProfessorId?: number | null;
  onClear?: () => void;
}

export default function ProfessorSelect({
  onSelect,
  selectedProfessorId,
  onClear,
}: ProfessorSelectProps) {
  const [professores, setProfessores] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfessores = async () => {
      try {
        const res = await fetch('/api/professores');
        const data = await res.json();
        setProfessores(data);
      } catch (error) {
        console.error('Erro ao buscar professores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessores();
  }, []);

  if (isLoading) return <div>Carregando professores...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Professor, selecione seu nome</h2>
        {selectedProfessorId && onClear && (
          <button
            onClick={onClear}
            className="ml-2 p-1 hover:bg-gray-200 rounded"
            title="Trocar professor"
          >
            <Image
              src="/icons/close.svg"
              alt="Trocar professor"
              width={20}
              height={20}
            />
          </button>
        )}
      </div>

      <Select
        name="professor"
        placeholder="Selecione um professor..."
        value={selectedProfessorId?.toString() ?? ''}
        options={professores.map((prof) => ({
          label: prof.name,
          value: prof.id.toString(),
        }))}
        onChange={(value) => onSelect(Number(value))}
      />
    </div>
  );
}
