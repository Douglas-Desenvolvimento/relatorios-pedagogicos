// src/app/(public)/professor/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import AlunoSelect from '@/components/ProfessorForm/AlunoSelect';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import type { ProfessorCompleto, TurmaCompleta } from '@/types/types';


export default function ProfessorPage() {
  const router = useRouter();
  const [professor, setProfessor] = useState<ProfessorCompleto | null>(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<TurmaCompleta | null>(null);

  const [loading, setLoading] = useState(true);

  // Carrega os dados do professor logado
  useEffect(() => {
    const loadProfessorData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/professores/me');
        
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Sessão expirada. Faça login novamente.');
            router.push('/login');
            return;
          }
          throw new Error(`Erro ${response.status}`);
        }
        
        const data: ProfessorCompleto = await response.json();
        setProfessor(data);
        
        // Seleciona a primeira matéria por padrão
        const primeiraMateria = data.materias[0] || null;
        setSelectedMateriaId(primeiraMateria?.id ?? null);
        
      } catch (error) {
        console.error('Erro ao carregar dados do professor:', error);
        toast.error('Erro ao carregar dados do professor');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadProfessorData();
  }, [router]);

  const selectedMateria = useMemo(() => {
    return professor?.materias.find((m) => m.id === selectedMateriaId) || null;
  }, [professor, selectedMateriaId]);

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
   
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Professor não encontrado
          </h2>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        PLANO PEDAGÓGICO INDIVIDUALIZADO (PPI)
      </h1>

      <PageBreadcrumb pageTitle="Plano Pedagógico Individualizado (PPI) - Professor" />

      <div className="p-5 border shadow-lg border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="space-y-6">
          {/* Cabeçalho com professor/matéria e botão para alterar - MANTIDO ORIGINAL */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-gray-500">Professor</p>
                <h2 className="text-xl font-semibold">{professor.name}</h2>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Matéria</p>
              <h2 className="text-xl font-semibold">
                {selectedMateria?.name || 'Nenhuma matéria selecionada'}
              </h2>
            </div>
          </div>

          {/* Seleção de turma - MANTIDO ORIGINAL COM RADIOS */}
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

          {/* Seleção de matéria (se o professor tiver mais de uma) - ADICIONADO */}
          {professor.materias.length > 1 && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium mb-3">Selecione uma matéria</h3>
              <div className="flex flex-wrap gap-2">
                {professor.materias.map((materia) => (
                  <button
                    key={materia.id}
                    onClick={() => {
                      setSelectedMateriaId(materia.id);
                      setSelectedTurma(null);
                      
                    }}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      selectedMateriaId === materia.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {materia.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AlunoSelect (após seleção de turma) - MANTIDO ORIGINAL */}
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
      </div>
    </div>
  );
}