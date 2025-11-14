//src/components/auth/SignInForm.tsx

"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { HiChevronLeft } from "react-icons/hi";
import { toast } from 'react-toastify';

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [loginInput, setLoginInput] = useState(""); // Para professor: login
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<'professor' | 'normal'>('normal');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Se vier com parâmetro ?role=professor, muda automaticamente
  React.useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'professor') {
      setLoginMode('professor');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          loginMode === 'professor'
            ? { login: loginInput } // Professor usa login
            : { matricula, password } // Admin/Coordenador usa matrícula + senha
        ),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Falha no login");
      }

      const { role } = await res.json();

      if (role === "PROFESSOR") {
        router.push("/professor");
      } else if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "COORDENADOR") {
        router.push("/coordenador");
      } else {
        router.push("/login");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLoginMode = () => {
    setLoginMode(loginMode === 'professor' ? 'normal' : 'professor');
    setPassword(""); // Limpa senha ao alternar modos
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <HiChevronLeft size={20} />
          <span className="ml-2">Voltar</span>
        </Link>
      </div>

      <div className="p-6 border border-gray-200 rounded-2xl dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <h1 className="mb-4 font-semibold text-gray-800 dark:text-white text-2xl text-center">
          {loginMode === 'professor' ? "Acesso Professor" : "Acessar sistema"}
        </h1>
        
        <p className="mb-6 text-center text-gray-500 dark:text-gray-400">
          {loginMode === 'professor' 
            ? "Digite seu login (nome.sobrenome) para continuar" 
            : "Informe sua matrícula e senha para continuar"
          }
        </p>

        {/* Seletor de Modo de Login */}
        <div className="mb-6 flex gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setLoginMode('normal')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              loginMode === 'normal'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Coordenador/Admin
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('professor')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              loginMode === 'professor'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Professor
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {loginMode === 'professor' ? (
            <div>
              <Label>
                Login <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="Ex: joao.silva"
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value.toLowerCase())}
                autoComplete="username"
                required
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use o formato: nome.sobrenome
              </p>
            </div>
          ) : (
            <div>
              <Label>
                Matrícula <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="Digite sua matrícula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                autoComplete="username"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {loginMode === 'normal' && (
            <div>
              <Label>
                Senha <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <FiEye size={20} /> : <FiEyeOff size={20} />}
                </button>
              </div>
            </div>
          )}

          {loginMode === 'normal' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none text-gray-700 dark:text-gray-400">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="text-theme-sm font-normal">Manter conectado</span>
              </label>
            </div>
          )}

          <Button 
            className="w-full" 
            size="sm" 
            type="submit"
            disabled={
              isLoading || 
              (loginMode === 'professor' ? !loginInput : (!matricula || !password))
            }
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {loginMode === 'professor' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Não é professor?{" "}
              <button
                type="button"
                onClick={toggleLoginMode}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Clique aqui para login completo
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}