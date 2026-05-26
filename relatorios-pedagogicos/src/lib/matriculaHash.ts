// lib/matriculaHash.ts
import crypto from 'crypto'

function getMatriculaPepper(): string {
  const pepper = process.env.MATRICULA_PEPPER || process.env.JWT_SECRET
  if (!pepper) {
    throw new Error('MATRICULA_PEPPER ou JWT_SECRET deve estar configurado')
  }
  return pepper
}

export function hashMatricula(matricula: string): string {
  return crypto
    .createHmac('sha256', getMatriculaPepper())
    .update(matricula.trim().toLowerCase())
    .digest('hex')
}

export function verifyMatricula(inputMatricula: string, storedHash: string): boolean {
  const inputHash = hashMatricula(inputMatricula)
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  )
}
