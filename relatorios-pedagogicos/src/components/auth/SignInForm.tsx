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

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  //const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, password }),
      });

      if (!res.ok) throw new Error("Falha no login");

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
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer login. Verifique suas credenciais.");
    }
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
          Acessar sistema
        </h1>
        <p className="mb-6 text-center text-gray-500 dark:text-gray-400">
          Informe sua matrícula e senha para continuar.
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
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
            />
          </div>

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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer select-none text-gray-700 dark:text-gray-400">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <span className="text-theme-sm font-normal">Manter conectado</span>
            </label>
          </div>

          <Button className="w-full" size="sm" type="submit">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
