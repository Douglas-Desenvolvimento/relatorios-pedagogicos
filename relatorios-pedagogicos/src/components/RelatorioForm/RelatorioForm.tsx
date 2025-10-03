import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface RelatorioFormProps {
  onSubmit: (values: { conteudo: string }) => void;
  hasRelatorio: boolean;
  alunoName: string;
  isSubmitting?: boolean;
}

export default function RelatorioForm({
  onSubmit,
  hasRelatorio,
  alunoName,
  isSubmitting = false,
}: RelatorioFormProps) {
  const [conteudo, setConteudo] = useState('');
  const [caracteresRestantes, setCaracteresRestantes] = useState(100);

  useEffect(() => {
    setCaracteresRestantes(100 - conteudo.length);
  }, [conteudo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conteudo.trim().length < 100) {
      toast.error(`O relatório deve conter pelo menos 100 caracteres. Faltam ${100 - conteudo.trim().length} caracteres.`);
      return;
    }

    onSubmit({ conteudo });
    setConteudo('');
  };

  // Verifica se o texto atinge o mínimo necessário
  const atingeMinimo = conteudo.trim().length >= 100;
  const caracteresFaltantes = 100 - conteudo.trim().length;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Relatório para {alunoName}
        {hasRelatorio && (
          <span className="ml-2 text-sm text-green-600 font-medium">
            ✓ Já possui relatório
          </span>
        )}
      </h2>

      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-4 border border-gray-300 rounded-lg mb-3 min-h-[200px] resize-y 
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Digite o relatório pedagógico do aluno com pelo menos 100 caracteres..."
          required
          disabled={isSubmitting}
        />
        
        <div className="flex justify-between items-center mb-4">
          <span
            className={`text-sm font-medium ${
              atingeMinimo 
                ? 'text-green-600' 
                : caracteresFaltantes > 0 
                  ? 'text-orange-600' 
                  : 'text-gray-600'
            }`}
          >
            {atingeMinimo ? (
              <span className="flex items-center gap-1">
                <span className="text-green-500">✓</span>
                Relatório atende ao mínimo de 100 caracteres!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-orange-500">📝</span>
                {caracteresFaltantes > 0 
                  ? `Faltam ${caracteresFaltantes} caracteres para o mínimo de 100`
                  : 'Continue escrevendo para atingir o mínimo necessário'
                }
              </span>
            )}
          </span>
          
          <span className={`text-xs px-2 py-1 rounded ${
            atingeMinimo 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {conteudo.length} caracteres
          </span>
        </div>

        <button
          type="submit"
          className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition-all ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : atingeMinimo
                ? 'bg-green-500 hover:bg-green-600 shadow-sm'
                : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={isSubmitting || !atingeMinimo}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Enviando...
            </span>
          ) : atingeMinimo ? (
            <span className="flex items-center justify-center gap-2">
              ✓ Enviar Relatório
            </span>
          ) : (
            'Preencha pelo menos 100 caracteres'
          )}
        </button>
      </form>
    </div>
  );
}