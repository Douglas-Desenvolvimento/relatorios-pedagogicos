// src/app/api/login/route.ts - COM DEBUG
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gerarToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🔐 Iniciando processo de login...');
    
    const { matricula, password } = await request.json();
    console.log('📨 Dados recebidos:', { matricula, password: password ? '***' : 'vazia' });

    if (!matricula || !password) {
      console.log('❌ Dados inválidos');
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    console.log('🔍 Buscando usuário com matrícula:', matricula);
    const user = await prisma.user.findUnique({
      where: { matricula },
    });

    console.log('👤 Usuário encontrado:', user ? `Sim (${user.nome})` : 'Não');
    
    if (!user) {
      console.log('❌ Usuário não encontrado para matrícula:', matricula);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    console.log('🔑 Verificando senha...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('✅ Senha confere:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('❌ Senha incorreta para usuário:', user.matricula);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // ✅ Gerar token
    const token = gerarToken({
      sub: user.id,
      role: user.role,
      matricula: user.matricula,
    });

    console.log('🎫 Token gerado para:', user.nome);

    // ✅ Criar response e setar cookie
    const response = NextResponse.json({ 
      success: true,
      role: user.role,
      nome: user.nome 
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log('✅ Login realizado com sucesso para:', user.nome);
    return response;

  } catch (error) {
    console.error('💥 Erro no login:', error);
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    );
  }
}