// lib/matriculaHash.ts
import crypto from 'crypto';

// Use o mesmo JWT_SECRET ou crie um específico para matrículas
const MATRICULA_PEPPER = process.env.JWT_SECRET || 'fallback-secret';

export function hashMatricula(matricula: string): string {
  // Hash seguro usando SHA256 + pepper (mesmo segredo do JWT)
  return crypto
    .createHmac('sha256', MATRICULA_PEPPER)
    .update(matricula.trim().toLowerCase()) // Normaliza a matrícula
    .digest('hex');
}

export function verifyMatricula(inputMatricula: string, storedHash: string): boolean {
  const inputHash = hashMatricula(inputMatricula);
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}