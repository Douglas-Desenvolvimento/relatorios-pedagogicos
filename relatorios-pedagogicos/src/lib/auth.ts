// src/lib/auth.ts

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Gera um JWT assinado
export function gerarToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Salva o token no cookie
export async function salvarTokenNosCookies(token: string) {
  const cookieStore = cookies(); // ❌ Não precisa de await aqui! cookies() já retorna o objeto certo

  (await cookieStore).set("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

// Remove o token do cookie
export async function removerTokenDosCookies() {
  const cookieStore = cookies(); // ❌ Também aqui: cookies() não é async

  (await cookieStore).delete("token");
}
