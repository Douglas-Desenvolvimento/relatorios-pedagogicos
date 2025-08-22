// src/app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  (await cookieStore).delete('token');

  // Retorna resposta simples (pode incluir redirect na chamada client-side)
  return NextResponse.json({ message: 'Logout realizado' });
}
