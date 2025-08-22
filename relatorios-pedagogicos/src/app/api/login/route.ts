// src/app/api/login/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gerarToken, salvarTokenNosCookies } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { matricula, password } = await request.json();

  if (!matricula || !password) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { matricula },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  // ✅ Gerar token com dados essenciais
  const token = gerarToken({
    sub: user.id,
    role: user.role,
    matricula: user.matricula,
  });

  // ✅ Salvar token no cookie httpOnly
  const response = NextResponse.json({ role: user.role });

  await salvarTokenNosCookies(token); // Esta função usa next/headers e adiciona o cookie

  return response;
}
