// src/components/ProfessorForm/AlunoSelect.tsx
'use client';

import Select from '@/components/form/Select';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { useEffect, useState } from 'react';
import {
  AlunoComRelatorios,
  TurmaCompleta,
  RelatorioCompleto,
  ProfessorCompleto,
} from '@/types/types';
import { toast } from 'react-toastify';
import RelatorioForm from '@/components/RelatorioForm/RelatorioForm';
import { format } from 'date-fns';

interface AlunoSelectProps {
  turma?: TurmaCompleta;
  professor: ProfessorCompleto;
  materiaId?: number | null;
  // New props for improved UI
  materias?: any[];
  selectedTurma?: TurmaCompleta | null;
  onTurmaSelect?: (turmaId: number | null) => void;
  bimestreId?: number;
}

export default function AlunoSelect({ 
  turma, 
  professor, 
  materiaId,
  materias,
  selectedTurma,
  onTurmaSelect,
  bimestreId
}: AlunoSelectProps) {
  // Use new or old props
  const activeTurma = selectedTurma || turma;
  const activeMateriaId = materiaId;
  const [alunosEnviados, setAlunosEnviados] = useState<AlunoComRelatorios[]>([]);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoComRelatorios[]>([]);
  const [alunoSelecionadoParaModal, setAlunoSelecionadoParaModal] = useState<AlunoComRelatorios | null>(null);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioCompleto | null>(null);
  const [alunoSelecionadoParaForm, setAlunoSelecionadoParaForm] = useState<AlunoComRelatorios | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // CARREGA ALUNOS COM FILTRO CORRETO NA API
  useEffect(() => {
    const loadAlunos = async () => {
      if (!activeTurma?.id || !professor?.id || !activeMateriaId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // CHAMADA CORRIGIDA: API já filtra relatórios por professor e matéria
        const response = await fetch(
          `/api/alunos?turmaId=${activeTurma.id}&include=relatorios&professorId=${professor.id}&materiaId=${activeMateriaId}${bimestreId ? `&bimestreId=${bimestreId}` : ''}`
        );

        if (!response.ok) {
          throw new Error(`Erro ${response.status} ao carregar alunos`);
        }

        const todosAlunos: AlunoComRelatorios[] = await response.json();
        
        const enviados: AlunoComRelatorios[] = [];
        const disponiveis: AlunoComRelatorios[] = [];

        // LÓGICA SIMPLIFICADA: API já retornou os relatórios filtrados
        todosAlunos.forEach((aluno) => {
          // Se tem relatórios (já filtrados pela API), vai para enviados
          if (aluno.relatorios && aluno.relatorios.length > 0) {
            enviados.push(aluno);
          } else {
            // Se não tem relatórios, vai para disponíveis
            disponiveis.push(aluno);
          }
        });

        setAlunosEnviados(enviados);
        setAlunosDisponiveis(disponiveis);
        
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        toast.error('Erro ao carregar lista de alunos');
      } finally {
        setLoading(false);
      }
    };

    loadAlunos();
  }, [activeTurma?.id, professor.id, activeMateriaId, bimestreId]);

  const handleAbrirModal = (aluno: AlunoComRelatorios) => {
    // Pega o primeiro relatório (já filtrado pela API)
    const relatorio = aluno.relatorios[0];

    if (relatorio) {
      setAlunoSelecionadoParaModal(aluno);
      setRelatorioSelecionado(relatorio);
    } else {
      toast.error('Nenhum relatório encontrado para este aluno.');
    }
  };

  const handleSubmitRelatorio = async (values: { conteudo: string }) => {
    if (!professor || !materiaId || !turma || !alunoSelecionadoParaForm) {
      toast.error('Dados incompletos para envio do relatório.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudo: values.conteudo,
          alunoId: alunoSelecionadoParaForm.id,
          professorId: professor.id,
          materiaId: activeMateriaId,
          turmaId: activeTurma?.id,
          bimestreId: bimestreId,
          status: 'ENVIADO'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const novoRelatorio: RelatorioCompleto = await response.json();

      // ATUALIZA AS LISTAS CORRETAMENTE
      setAlunosDisponiveis(prev => 
        prev.filter(a => a.id !== alunoSelecionadoParaForm.id)
      );
      
      setAlunosEnviados(prev => {
        const alunoAtualizado = {
          ...alunoSelecionadoParaForm,
          relatorios: [novoRelatorio]
        };
        return [...prev, alunoAtualizado];
      });

      setAlunoSelecionadoParaForm(null);
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('Erro ao enviar relatório:', error);
      toast.error(error.message || 'Erro ao enviar relatório.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELECT DE ALUNOS DISPONÍVEIS */}
      <div>
        <h3 className="font-medium mb-2">Selecionar Aluno da Turma {activeTurma?.name}</h3>
        
        {alunosDisponiveis.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg border text-center">
            <p className="text-green-600 font-medium">
              ✅ Todos os alunos desta turma já receberam relatório
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Nenhum aluno disponível para novo relatório
            </p>
          </div>
        ) : (
          <Select
            key={`select-${alunosDisponiveis.length}-${alunoSelecionadoParaForm?.id || 'empty'}`}
            name="aluno"
            placeholder="Selecione um aluno..."
            value={alunoSelecionadoParaForm ? alunoSelecionadoParaForm.id.toString() : ''}
            options={alunosDisponiveis.map((aluno) => ({
              label: aluno.name,
              value: aluno.id.toString(),
            }))}
            onChange={(value) => {
              if (!value) {
                setAlunoSelecionadoParaForm(null);
                return;
              }

              const aluno = alunosDisponiveis.find((a) => a.id === Number(value));
              setAlunoSelecionadoParaForm(aluno || null);
            }}
          />
        )}
      </div>

      {/* FORMULÁRIO DE RELATÓRIO */}
      {alunoSelecionadoParaForm && (
        <RelatorioForm
          alunoName={alunoSelecionadoParaForm.name}
          onSubmit={handleSubmitRelatorio}
          hasRelatorio={false}
          isSubmitting={isSubmitting}
        />
      )}

      {/* LISTA DE ALUNOS COM RELATÓRIOS ENVIADOS */}
      {alunosEnviados.length > 0 && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-medium mb-3">Relatórios Enviados</h3>
          <p className="text-sm text-gray-600 mb-3">
            (Clique no nome do aluno para ver o relatório enviado)
          </p>
          <div className="space-y-2">
            {alunosEnviados.map((aluno) => (
              <div key={aluno.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span className="text-green-700 font-medium flex items-center gap-2">
                  <span>✔</span>
                  {aluno.name}
                </span>
                <button
                  onClick={() => handleAbrirModal(aluno)}
                  className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  Ver Relatório
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE RELATÓRIO */}
      <Dialog.Root
        open={!!alunoSelecionadoParaModal}
        onOpenChange={(open) => {
          if (!open) {
            setAlunoSelecionadoParaModal(null);
            setRelatorioSelecionado(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-2xl bg-white border rounded-lg shadow-lg p-6 -translate-x-1/2 -translate-y-1/2 z-50 max-h-[90vh] overflow-hidden flex flex-col">
            <Dialog.Title className="text-lg font-semibold mb-2">
              Relatório de {alunoSelecionadoParaModal?.name}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 mb-4">
              Matéria: {relatorioSelecionado?.materia?.name} • 
              Data: {relatorioSelecionado ? format(new Date(relatorioSelecionado.createdAt), 'dd/MM/yyyy HH:mm') : ''}
            </Dialog.Description>
            
            {relatorioSelecionado && (
              <div className="flex-1 overflow-auto">
                <div className="p-4 bg-gray-50 border rounded whitespace-pre-wrap min-h-[200px]">
                  {relatorioSelecionado.conteudo}
                </div>
              </div>
            )}
            
            <div className="mt-4 text-right pt-4 border-t">
              <Dialog.Close className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Fechar
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* MODAL DE SUCESSO */}
      <Dialog.Root open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-80 bg-white border rounded-lg shadow-lg p-6 -translate-x-1/2 -translate-y-1/2 z-50 text-center">
            <VisuallyHidden>
              <Dialog.Title>Confirmação de Envio</Dialog.Title>
            </VisuallyHidden>
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <p className="text-green-700 font-semibold">Relatório enviado com sucesso!</p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full"
            >
              Continuar
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}