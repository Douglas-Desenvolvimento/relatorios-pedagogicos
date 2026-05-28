//src/components/auth/SignInForm.tsx

"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { HiChevronLeft } from "react-icons/hi";
import { toast } from 'react-toastify';

type LoginStep = 'identifier' | 'password' | 'forgot';

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<LoginStep>('identifier');
  const [isLoading, setIsLoading] = useState(false);
  const [identifiedName, setIdentifiedName] = useState("");
  const [forgotForm, setForgotForm] = useState({ login: '', email: '', matricula: '' });

  const router = useRouter();

  const identifierValue = identifier.trim();

  const redirectByRole = (role: string) => {
    if (role === "PROFESSOR") router.push("/professor");
    else if (role === "ADMIN") router.push("/admin");
    else if (role === "COORDENADOR") router.push("/coordenador");
    else router.push("/login");
  };

  const handleIdentify = async () => {
    if (!identifierValue) {
      toast.error('Informe seu usuário.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: identifierValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Usuário não encontrado");
      }

      setIdentifiedName(data.nome || identifierValue);
      if (data.firstAccess) {
        router.push("/change-password?first=1");
        return;
      }

      setStep('password');
    } catch (error: any) {
      toast.error(error.message || "Erro ao identificar usuário.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!identifierValue || !password) {
      toast.error('Informe usuário e senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: identifierValue, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Falha no login");
      }

      const { role, mustChangePassword } = await res.json();

      if (mustChangePassword) {
        router.push("/change-password?first=1");
        return;
      }

      redirectByRole(role);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotForm.login.trim() || !forgotForm.email.trim() || !forgotForm.matricula.trim()) {
      toast.error('Informe usuário, email e matrícula.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forgotForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível validar os dados.');
      }

      toast.success('Dados confirmados. Crie uma nova senha.');
      router.push("/change-password?first=1");
    } catch (error: any) {
      toast.error(error.message || 'Erro ao recuperar senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'forgot') await handleForgotPassword();
    else if (step === 'password') await handleLogin();
    else await handleIdentify();
  };

  const resetToIdentifier = () => {
    setPassword("");
    setShowPassword(false);
    setStep('identifier');
    setIdentifiedName("");
  };

  const openForgotPassword = () => {
    setForgotForm((current) => ({ ...current, login: identifierValue }));
    setStep('forgot');
    setPassword("");
    setShowPassword(false);
  };

  const canSubmit = step === 'forgot'
    ? Boolean(forgotForm.login.trim() && forgotForm.email.trim() && forgotForm.matricula.trim())
    : step === 'password'
      ? Boolean(identifierValue && password)
      : Boolean(identifierValue);

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
          {step === 'forgot' ? "Recuperar senha" : "Acessar sistema"}
        </h1>

        <p className="mb-6 text-center text-gray-500 dark:text-gray-400">
          {step === 'identifier'
            ? "Informe seu usuário, email ou matrícula. O sistema abrirá a área correspondente ao seu perfil."
            : step === 'forgot'
              ? "Confirme seus dados cadastrais para criar uma nova senha."
              : `Olá${identifiedName ? `, ${identifiedName}` : ''}. Agora informe sua senha.`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 'forgot' ? (
            <>
              <div>
                <Label>Usuário <span className="text-error-500">*</span></Label>
                <Input
                  type="text"
                  value={forgotForm.login}
                  onChange={(e) => setForgotForm({ ...forgotForm, login: e.target.value })}
                  autoComplete="username"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label>Email cadastrado <span className="text-error-500">*</span></Label>
                <Input
                  type="email"
                  value={forgotForm.email}
                  onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label>Matrícula <span className="text-error-500">*</span></Label>
                <Input
                  type="text"
                  value={forgotForm.matricula}
                  onChange={(e) => setForgotForm({ ...forgotForm, matricula: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div>
              <Label>
                Usuário <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="Login, email ou matrícula"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (step === 'password') {
                    setPassword("");
                    setStep('identifier');
                    setIdentifiedName("");
                  }
                }}
                autoComplete="username"
                required
                disabled={isLoading || step === 'password'}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {step === 'password'
                  ? 'Para trocar o usuário, volte para a etapa anterior.'
                  : 'O destino será definido automaticamente pelo perfil do usuário.'}
              </p>
            </div>
          )}

          {step === 'password' && (
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

          <Button
            className="w-full"
            size="sm"
            type="submit"
            disabled={isLoading || !canSubmit}
          >
            {isLoading
              ? "Aguarde..."
              : step === 'identifier'
                ? "Continuar"
                : step === 'forgot'
                  ? "Confirmar dados"
                  : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {step === 'password' && (
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={resetToIdentifier}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-medium"
              >
                Trocar usuário
              </button>
              <button
                type="button"
                onClick={openForgotPassword}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {step === 'identifier' && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Esqueceu a senha?{" "}
              <button
                type="button"
                onClick={openForgotPassword}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Recuperar acesso
              </button>
            </p>
          )}

          {step === 'forgot' && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Lembrou a senha?{" "}
              <button
                type="button"
                onClick={resetToIdentifier}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Voltar ao login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
