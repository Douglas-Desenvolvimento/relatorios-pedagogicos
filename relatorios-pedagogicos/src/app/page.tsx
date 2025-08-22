"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  const handleProfessorClick = () => {
    router.push("/professor");
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bem-vindo ao Plano Pedagógico Individualizado (PPI)
        </h1>

        <button
          onClick={handleProfessorClick}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Sou Professor
        </button>

        <Link
          href="/login"
          className="text-sm text-blue-600 hover:underline block"
        >
          Não é professor? Clique aqui
        </Link>
      </div>
    </main>
  );
}
