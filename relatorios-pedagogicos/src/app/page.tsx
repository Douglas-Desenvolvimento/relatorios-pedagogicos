"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleIniciar = () => {
    setIsLoading(true);
    // Pequeno delay para mostrar o loading
    setTimeout(() => {
      router.push("/login");
    }, 500);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-8 transition-all duration-300 hover:shadow-2xl">
        {/* Logo/Header */}
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">PPI</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Plano Pedagógico Individualizado
          </h1>
          <p className="text-gray-600 text-md">
            Sistema de Gestão de relatórios pedagógicos Individualizados
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600 font-medium">Carregando sistema...</p>
          </div>
        ) : (
          /* Botão Iniciar */
          <div className="space-y-6">
            <button
              onClick={handleIniciar}
              className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
            >
              Iniciar
            </button>
            
            {/* Informações adicionais */}
            <div className="text-sm text-gray-500 space-y-2">
              <p>Versão 2.0</p>
              <p>Sistema seguro e otimizado</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            © 2025 RM Tech Systems. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </main>
  );
}