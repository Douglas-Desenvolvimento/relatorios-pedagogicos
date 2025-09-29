// src/app/api/login/route.ts - CORRIGIDO
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gerarToken, salvarTokenNosCookies } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { matricula, password } = await request.json();

    if (!matricula || !password) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { matricula },
    });

    if (!user) {
      console.log('Usuário não encontrado:', matricula);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Senha incorreta para:', matricula);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // ✅ Gerar token
    const token = gerarToken({
      sub: user.id,
      role: user.role,
      matricula: user.matricula,
    });

    // ✅ Salvar token nos cookies
    await salvarTokenNosCookies(token);

    // ✅ Retornar resposta de sucesso
    return NextResponse.json({ 
      success: true,
      role: user.role,
      nome: user.nome 
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    );
  }
}