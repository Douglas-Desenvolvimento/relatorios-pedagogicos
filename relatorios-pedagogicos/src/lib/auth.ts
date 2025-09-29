// src/lib/auth.ts - CORRIGIDO
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Gera um JWT assinado
export function gerarToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Salva o token no cookie - CORRIGIDO
export async function salvarTokenNosCookies(token: string) {
  const cookieStore = await cookies(); // ✅ AGORA PRECISA DE AWAIT
  
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
  const cookieStore = await cookies(); // ✅ AGORA PRECISA DE AWAIT
  
  cookieStore.delete("token");
}