import * as Select from '@radix-ui/react-select';
import { useEffect, useState } from 'react';
import { AlunoComRelatorios, TurmaCompleta, RelatorioCompleto } from '@/types/types';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface AlunoSelectProps {
  turma: TurmaCompleta;
  onSelect: (aluno: AlunoComRelatorios) => void;
  selectedAlunoId?: number;
}

export default function AlunoSelect({ turma, onSelect, selectedAlunoId }: AlunoSelectProps) {
  const [alunosEnviados, setAlunosEnviados] = useState<AlunoComRelatorios[]>([]);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoComRelatorios[]>([]);

  useEffect(() => {
    const enviados: AlunoComRelatorios[] = [];
    const disponiveis: AlunoComRelatorios[] = [];

    turma.alunos.forEach((aluno: AlunoComRelatorios) => {
      const enviado = aluno.relatorios.some((r: RelatorioCompleto) => r.status === 'ENVIADO');
      if (enviado) {
        enviados.push(aluno);
      } else {
        disponiveis.push(aluno);
      }
    });

    setAlunosEnviados(enviados);
    setAlunosDisponiveis(disponiveis);
  }, [turma]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium">Selecionar Aluno da Turma {turma.name}</h3>
        <Select.Root
          value={selectedAlunoId?.toString()}
          onValueChange={(value) => {
            const aluno = alunosDisponiveis.find((a) => a.id === Number(value));
            if (aluno) onSelect(aluno);
            else toast.error("Erro ao selecionar aluno.");
          }}
        >
          <Select.Trigger className="w-full p-2 border rounded">
            <Select.Value placeholder="Selecione um aluno..." />
          </Select.Trigger>
          <Select.Content className="bg-white border rounded shadow-lg z-50">
            {alunosDisponiveis.map((aluno) => (
              <Select.Item
                key={aluno.id}
                value={aluno.id.toString()}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {aluno.name}
              </Select.Item>
            ))}
            {alunosDisponiveis.length === 0 && (
              <div className="text-gray-500 px-3 py-2">
                Todos os alunos já têm relatório enviado.
              </div>
            )}
          </Select.Content>
        </Select.Root>
      </div>

      {alunosEnviados.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Relatórios Enviados</h3>
          <table className="w-full table-auto border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Aluno</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Enviado em</th>
              </tr>
            </thead>
            <tbody>
              {alunosEnviados.map((aluno) => {
                const relatorio = aluno.relatorios.find(
                  (r: RelatorioCompleto) => r.status === 'ENVIADO'
                );
                return (
                  <tr
                    key={aluno.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelect(aluno)}
                  >
                    <td className="p-2 border">{aluno.name}</td>
                    <td className="p-2 border text-green-600 font-medium">ENVIADO</td>
                    <td className="p-2 border">
                      {relatorio
                        ? format(new Date(relatorio.createdAt), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
