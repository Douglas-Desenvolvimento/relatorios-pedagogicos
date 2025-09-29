// app/api/warm/route.ts
import { NextResponse } from 'next/server'; // ✅ IMPORT ADICIONADO
import { checkDatabaseConnection } from '@/lib/db-utils';

export async function GET() {
  const isConnected = await checkDatabaseConnection();
  return NextResponse.json({ 
    status: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
}