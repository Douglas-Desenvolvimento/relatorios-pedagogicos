// src/lib/auth.ts - CORRIGIDO E COMPLETO
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

// Interface para o payload do token
export interface TokenPayload {
  sub: string;
  role: string;
  matricula?: string;
  nome: string;
  iat?: number;
  exp?: number;
}

// Gera um JWT assinado
export function gerarToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Salva o token no cookie - CORRIGIDO
export async function salvarTokenNosCookies(token: string) {
  const cookieStore = await cookies();
  
  cookieStore.set("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

// Remove o token do cookie - CORRIGIDO
export async function removerTokenDosCookies() {
  const cookieStore = await cookies();
  
  cookieStore.delete("token");
}

// ✅ NOVA FUNÇÃO: Obtém e decodifica o token
export async function getToken(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return null;
  }
}

// ✅ FUNÇÃO ALTERNATIVA: Para uso em Server Components/API Routes
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Token inválido:", error);
    return null;
  }
}

// ✅ FUNÇÃO PARA REQUESTS: Obtém token do request (útil para API Routes)
export async function getTokenFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Erro ao decodificar token do request:", error);
    return null;
  }
}