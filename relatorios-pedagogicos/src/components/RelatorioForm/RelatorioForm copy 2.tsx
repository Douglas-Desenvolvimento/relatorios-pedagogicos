import { useState } from 'react';

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
  isSubmitting = false
}: RelatorioFormProps) {
  const [conteudo, setConteudo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ conteudo });
    setConteudo(''); // Limpa o campo após o envio
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Relatório para {alunoName}
        {hasRelatorio && (
          <span className="ml-2 text-sm text-green-600">(Já possui relatório)</span>
        )}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 min-h-[200px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Digite o relatório pedagógico do aluno..."
          required
          disabled={isSubmitting}
        />
        
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            isSubmitting 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Relatório'}
        </button>
      </form>
    </div>
  );
}