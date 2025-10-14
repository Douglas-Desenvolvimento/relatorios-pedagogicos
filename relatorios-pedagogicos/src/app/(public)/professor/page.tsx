// src/app/(public)/professor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import ProfessorDashboard from '@/components/ProfessorDashboard';
import type { ProfessorCompleto } from '@/types/types';

export default function ProfessorPage() {
  const router = useRouter();
  const [professor, setProfessor] = useState<ProfessorCompleto | null>(null);
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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return <ProfessorDashboard professor={professor} />;
}