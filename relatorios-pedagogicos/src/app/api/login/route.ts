// src/app/api/login/route.ts - VERSÃO COM HASH
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gerarToken, salvarTokenNosCookies } from "@/lib/auth";
import { hashMatricula } from "@/lib/matriculaHash";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🔐 Iniciando processo de login...');
    
    const { matricula, password } = await request.json();
    console.log('📨 Dados recebidos:', { matricula, password: password ? '***' : 'vazia' });

    if (!matricula) {
      return NextResponse.json({ error: "Matrícula é obrigatória" }, { status: 400 });
    }

    // ✅ Login sem senha para professores (COM HASH)
    if (!password) {
      console.log('🔍 Buscando professor pela matrícula (hash):', matricula);
      
      // Gerar hash da matrícula para busca
      const matriculaHash = hashMatricula(matricula);
      
      const professor = await prisma.professor.findFirst({
        where: { 
          matricula_hash: matriculaHash,
        },
        include: {
          turmas: true,
          materias: true
        }
      });

      console.log('👨‍🏫 Professor encontrado:', professor ? `Sim (${professor.name})` : 'Não');
      
      if (!professor) {
        return NextResponse.json({ 
          error: "Matrícula de professor não encontrada" 
        }, { status: 401 });
      }

      // ✅ Gerar token para professor
      const token = gerarToken({
        sub: professor.id.toString(),
        role: 'PROFESSOR',
        matricula: professor.matricula, // Matrícula original (se disponível)
        nome: professor.name
      });

      console.log('🎫 Token gerado para professor:', professor.name);

      const response = NextResponse.json({ 
        success: true,
        role: 'PROFESSOR',
        nome: professor.name,
        isProfessor: true
      });

      // ✅ Usar sua função existente para salvar cookie
      await salvarTokenNosCookies(token);

      console.log('✅ Login professor realizado com sucesso:', professor.name);
      return response;
    }

    // ✅ Login normal (com senha) para outros usuários
    console.log('🔍 Buscando usuário com matrícula:', matricula);
    const user = await prisma.user.findUnique({
      where: { matricula: matricula.trim() },
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

    // ✅ Gerar token para usuário normal
    const token = gerarToken({
      sub: user.id.toString(),
      role: user.role,
      matricula: user.matricula,
      nome: user.nome
    });

    console.log('🎫 Token gerado para:', user.nome);

    const response = NextResponse.json({ 
      success: true,
      role: user.role,
      nome: user.nome 
    });

    // ✅ Usar sua função existente
    await salvarTokenNosCookies(token);

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