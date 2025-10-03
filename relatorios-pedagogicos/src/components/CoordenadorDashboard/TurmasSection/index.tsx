// src/components/CoordenadorDashboard/index.tsx
'use client';
import AlunosSection from "../AlunosSection";
export default function TurmasSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gestão de Turmas</h2>
      <div className="text-center text-gray-500 py-8">
        Seção de Matérias em desenvolvimento
        <AlunosSection />
      </div>
    </div>
  );
}