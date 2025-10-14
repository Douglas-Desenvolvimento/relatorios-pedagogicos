// src/scripts/gerar-logins-professores.ts
/**
 * Script para gerar logins automáticos para professores existentes
 * Formato: nome.ultimonome ou nome.primeiraLetra.ultimonome (se 2 nomes)
 * Em caso de duplicata: nome.primeiraLetra.ultimonome
 */

import prisma from '../lib/prisma';

function gerarLogin(nomeCompleto: string, loginExistentes: Set<string>): string {
  // Remover acentos e caracteres especiais
  const removerAcentos = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

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
  if (loginExistentes.has(login)) {
    const primeiro = nomes[0];
    const segundo = nomes.length > 2 ? nomes[1] : nomes[0];
    const ultimo = nomes[nomes.length - 1];
    
    login = `${primeiro}.${segundo.charAt(0)}.${ultimo}`;
  }

  // Se ainda existe, adicionar número
  let contador = 1;
  let loginFinal = login;
  while (loginExistentes.has(loginFinal)) {
    loginFinal = `${login}${contador}`;
    contador++;
  }

  return loginFinal;
}

async function migrarLoginsProfe

ssores() {
  try {
    console.log('🚀 Iniciando geração de logins para professores...\n');

    // Buscar todos os professores
    const professores = await prisma.professor.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Total de professores encontrados: ${professores.length}\n`);

    const loginsGerados = new Set<string>();
    const atualizacoes = [];

    for (const professor of professores) {
      const loginAntigo = professor.login;
      
      // Se já tem login válido, manter
      if (loginAntigo && loginAntigo.trim() !== '') {
        loginsGerados.add(loginAntigo);
        console.log(`✓ ${professor.name} - Login existente: ${loginAntigo}`);
        continue;
      }

      // Gerar novo login
      const novoLogin = gerarLogin(professor.name, loginsGerados);
      loginsGerados.add(novoLogin);

      atualizacoes.push({
        id: professor.id,
        nome: professor.name,
        login: novoLogin
      });

      console.log(`➕ ${professor.name} - Novo login: ${novoLogin}`);
    }

    // Aplicar atualizações
    if (atualizacoes.length > 0) {
      console.log(`\n📝 Atualizando ${atualizacoes.length} professores...`);

      for (const update of atualizacoes) {
        await prisma.professor.update({
          where: { id: update.id },
          data: { login: update.login }
        });
      }

      console.log('✅ Atualização concluída!\n');
    } else {
      console.log('\n✅ Nenhuma atualização necessária!\n');
    }

    console.log('📋 Resumo:');
    console.log(`   - Total de professores: ${professores.length}`);
    console.log(`   - Já tinham login: ${professores.length - atualizacoes.length}`);
    console.log(`   - Logins gerados: ${atualizacoes.length}`);
    console.log(`   - Logins únicos: ${loginsGerados.size}\n`);

  } catch (error) {
    console.error('❌ Erro ao migrar logins:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
if (require.main === module) {
  migrarLoginsProfe

ssores()
    .then(() => {
      console.log('✅ Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falhou:', error);
      process.exit(1);
    });
}

export { gerarLogin, migrarLoginsProfe

ssores };
