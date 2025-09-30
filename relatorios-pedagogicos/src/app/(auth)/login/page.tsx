// src/app/(auth)/login/page.tsx
import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PPI login",
  description: "Login de Coordenador ou administrador no PPI",
};

// Componente de loading para o suspense
function SignInFormLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="p-6 border border-gray-200 rounded-2xl dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInFormLoading />}>
      <SignInForm />
    </Suspense>
  );
}