// src/lib/loginGenerator.ts
/**
 * Utilitário para gerar logins de professores
 * Formato: nome.ultimonome ou nome.primeiraLetra.ultimonome
 */

import prisma from './prisma';

/**
 * Remove acentos e caracteres especiais
 */
function removerAcentos(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera login baseado no nome completo
 * @param nomeCompleto Nome completo do professor
 * @param loginsExistentes Set de logins já existentes (opcional)
 * @returns Login gerado
 */
export async function gerarLogin(
  nomeCompleto: string,
  loginsExistentes?: Set<string>
): Promise<string> {
  // Se não foi passado o Set, buscar do banco
  if (!loginsExistentes) {
    const professores = await prisma.professor.findMany({
      where: { login: { not: null } },
      select: { login: true }
    });
    loginsExistentes = new Set(professores.map(p => p.login!).filter(Boolean));
  }

  // Limpar e separar nomes
  const nomes = removerAcentos(nomeCompleto)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(n => n.length > 0);

  if (nomes.length === 0) {
    throw new Error(`Nome inválido: ${nomeCompleto}`);
  }

  let login = '';

  if (nomes.length === 1) {
    // Apenas um nome
    login = nomes[0];
  } else if (nomes.length === 2) {
    // Dois nomes: nome.primeiraLetra.sobrenome
    const [primeiro, ultimo] = nomes;
    login = `${primeiro}.${ultimo.charAt(0)}.${ultimo}`;
  } else {
    // Três ou mais nomes: nome.ultimonome
    const primeiro = nomes[0];
    const ultimo = nomes[nomes.length - 1];
    login = `${primeiro}.${ultimo}`;
  }

  // Se já existe, adicionar primeira letra do primeiro sobrenome
  if (loginsExistentes.has(login)) {
    const primeiro = nomes[0];
    const segundo = nomes.length > 2 ? nomes[1] : nomes[0];
    const ultimo = nomes[nomes.length - 1];
    
    login = `${primeiro}.${segundo.charAt(0)}.${ultimo}`;
  }

  // Se ainda existe, adicionar número
  let contador = 1;
  let loginFinal = login;
  while (loginsExistentes.has(loginFinal)) {
    loginFinal = `${login}${contador}`;
    contador++;
  }

  return loginFinal;
}

/**
 * Valida se um login é único no banco
 */
export async function loginEhUnico(login: string, professorIdExcluir?: number): Promise<boolean> {
  const professor = await prisma.professor.findFirst({
    where: {
      login,
      ...(professorIdExcluir && { id: { not: professorIdExcluir } })
    }
  });
  
  return professor === null;
}
