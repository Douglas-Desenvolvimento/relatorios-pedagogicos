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
import AlunoTable from '@/components/ProfessorForm/AlunoTable';
import { format } from 'date-fns';

interface AlunoSelectProps {
  turma: TurmaCompleta;
  professor: ProfessorCompleto;
  materiaId: number | null;
}

export default function AlunoSelect({ turma, professor, materiaId }: AlunoSelectProps) {
  const [alunosEnviados, setAlunosEnviados] = useState<AlunoComRelatorios[]>([]);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoComRelatorios[]>([]);
  const [alunoSelecionadoParaModal, setAlunoSelecionadoParaModal] = useState<AlunoComRelatorios | null>(null);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioCompleto | null>(null);
  const [alunoSelecionadoParaForm, setAlunoSelecionadoParaForm] = useState<AlunoComRelatorios | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const enviados: AlunoComRelatorios[] = [];
    const disponiveis: AlunoComRelatorios[] = [];

    turma.alunos.forEach((aluno) => {
      const relatorioEnviadoMesmoProfessorMateria = aluno.relatorios.some((r) =>
        r.status === 'ENVIADO' &&
        r.professorId === professor.id &&
        r.materiaId === materiaId
      );

      if (relatorioEnviadoMesmoProfessorMateria) {
        enviados.push(aluno);
      } else {
        disponiveis.push(aluno);
      }
    });

    setAlunosEnviados(enviados);
    setAlunosDisponiveis(disponiveis);
    setAlunoSelecionadoParaModal(null);
    setRelatorioSelecionado(null);
    setAlunoSelecionadoParaForm(null);
  }, [turma, professor.id, materiaId]);

  const handleAbrirModal = (aluno: AlunoComRelatorios) => {
    const relatorio = aluno.relatorios.find(
      (r) =>
        r.status === 'ENVIADO' &&
        r.professorId === professor.id &&
        r.materiaId === materiaId
    );

    if (relatorio) {
      setAlunoSelecionadoParaModal(aluno);
      setRelatorioSelecionado(relatorio);
    } else {
      toast.error('Nenhum relatório enviado para este aluno nesta matéria.');
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
          materiaId,
          turmaId: turma.id,
        }),
      });

      if (!response.ok) throw new Error(`Erro ${response.status}`);

      const novoRelatorio: RelatorioCompleto = await response.json();

      setAlunosDisponiveis((prev) => prev.filter((a) => a.id !== novoRelatorio.alunoId));

      setAlunosEnviados((prev) => {
        const existe = prev.some((a) => a.id === novoRelatorio.alunoId);
        if (existe) {
          return prev.map((a) =>
            a.id === novoRelatorio.alunoId
              ? { ...a, relatorios: [...(a.relatorios || []), novoRelatorio] }
              : a
          );
        } else {
          const alunoAtualizado = {
            ...alunoSelecionadoParaForm,
            relatorios: [...(alunoSelecionadoParaForm.relatorios || []), novoRelatorio],
          };
          return [...prev, alunoAtualizado];
        }
      });

      setAlunoSelecionadoParaForm(null);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar relatório.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Selecionar Aluno da Turma {turma.name}</h3>
        <Select
          key={alunoSelecionadoParaForm?.id ?? 'reset'}
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
            if (aluno) {
              setAlunoSelecionadoParaForm(aluno);
            } else {
              toast.error('Erro ao selecionar aluno.');
            }
          }}
        />
      </div>

      {alunoSelecionadoParaForm && (
        <RelatorioForm
          alunoName={alunoSelecionadoParaForm.name}
          onSubmit={handleSubmitRelatorio}
          hasRelatorio={!!alunoSelecionadoParaForm.relatorios.find(
            (r) => r.status === 'ENVIADO' &&
                   r.professorId === professor.id &&
                   r.materiaId === materiaId
          )}
          isSubmitting={isSubmitting}
        />
      )}

      <AlunoTable alunos={alunosEnviados} onVisualizar={handleAbrirModal} />

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
          <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md bg-white border rounded shadow-lg p-6 -translate-x-1/2 -translate-y-1/2 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Relatório de {alunoSelecionadoParaModal?.name}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 mb-4">
              Seu relatório foi enviado com sucesso!
            </Dialog.Description>
            {relatorioSelecionado && (
              <div className="space-y-2 text-sm">
                <p><strong>Status:</strong> {relatorioSelecionado.status}</p>
                <p><strong>Data de Envio:</strong> {format(new Date(relatorioSelecionado.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                <div className="mt-2 p-2 bg-gray-50 border rounded max-h-60 overflow-auto whitespace-pre-wrap">
                  {relatorioSelecionado.conteudo}
                </div>
              </div>
            )}
            <div className="mt-4 text-right">
              <Dialog.Close className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                Fechar
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-72 bg-white border rounded shadow-lg p-6 -translate-x-1/2 -translate-y-1/2 z-50 text-center">
            <Dialog.Title>
              <VisuallyHidden>Confirmação</VisuallyHidden>
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 mb-4">
              Seu relatório foi enviado com sucesso!
            </Dialog.Description>
            <p className="mb-4 text-green-700 font-semibold">Relatório enviado com sucesso!</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Fechar
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
