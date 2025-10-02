// src/components/CoordenadorDashboard/RelatoriosSection/RelatorioForm.tsx
'use client';

interface RelatorioFormProps {
  relatorio?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function RelatorioForm({ relatorio, onClose, onSave }: RelatorioFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">
          {relatorio ? 'Editar Relatório' : 'Novo Relatório'}
        </h2>
        <p className="text-gray-600 mb-4">Formulário em desenvolvimento...</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}