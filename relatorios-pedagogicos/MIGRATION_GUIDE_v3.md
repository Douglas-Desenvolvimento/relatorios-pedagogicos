# 🚀 Guia de Migração para v3-ppi

## ⚠️ IMPORTANTE: Execute ANTES de fazer deploy

Este guia contém os passos necessários para migrar do v2-ppi para o v3-ppi.

---

## 📋 Pré-requisitos

- Acesso ao banco de dados PostgreSQL
- Backup do banco de dados (SEMPRE faça backup antes de migrar!)
- Node.js e npm/yarn instalados

---

## 🔧 Passo 1: Backup do Banco de Dados

```bash
# PostgreSQL
pg_dump -U seu_usuario -d nome_do_banco > backup_v2_$(date +%Y%m%d).sql
```

---

## 🗄️ Passo 2: Executar SQL de Migração

**Opção A: Via psql (Recomendado)**
```bash
psql -U seu_usuario -d nome_do_banco -f prisma/migrations/manual_update_v3.sql
```

**Opção B: Via ferramenta visual (pgAdmin, DBeaver, etc)**
1. Abra o arquivo `prisma/migrations/manual_update_v3.sql`
2. Copie todo o conteúdo
3. Execute no seu banco de dados

**O que esse script faz:**
- ✅ Cria tabela `anos_letivos`
- ✅ Cria tabela `bimestres`
- ✅ Cria tabela `conceitos_alunos_bimestres`
- ✅ Cria enum `Conceito` (RI, MB, B, R)
- ✅ Adiciona campo `login` em `professores`
- ✅ Atualiza `turmas` para usar `anoLetivoId` (integer) ao invés de `ano_letivo` (string)
- ✅ Adiciona `bimestreId` em `relatórios`
- ✅ Cria ano letivo 2025 com 4 bimestres
- ✅ Gera logins para professores existentes
- ✅ Atualiza constraints e índices

---

## 📦 Passo 3: Atualizar Dependências

```bash
cd relatorios-pedagogicos
yarn install  # ou npm install
```

---

## 🔄 Passo 4: Gerar Prisma Client

```bash
npx prisma generate
```

---

## ✅ Passo 5: Verificar Migração

Execute este script SQL para verificar se tudo foi criado corretamente:

```sql
-- Verificar ano letivo
SELECT * FROM anos_letivos;

-- Verificar bimestres
SELECT * FROM bimestres;

-- Verificar logins de professores
SELECT id, name, login FROM professores LIMIT 10;

-- Verificar turmas com ano letivo
SELECT t.id, t.name, a.ano 
FROM turmas t
JOIN anos_letivos a ON t."anoLetivoId" = a.id
LIMIT 10;

-- Verificar relatórios com bimestre
SELECT r.id, r.conteudo, b.numero as bimestre
FROM relatorios r
JOIN bimestres b ON r."bimestreId" = b.id
LIMIT 10;
```

**Resultados Esperados:**
- ✅ 1 ano letivo (2025) criado e ativo
- ✅ 4 bimestres criados (1º ativo, demais inativos)
- ✅ Todos os professores têm campo `login` preenchido
- ✅ Todas as turmas têm `anoLetivoId`
- ✅ Todos os relatórios têm `bimestreId`

---

## 🐛 Problemas Comuns e Soluções

### Erro: "column already exists"
**Solução:** A migração já foi executada parcialmente. Verifique quais tabelas/colunas já existem e comente as linhas correspondentes no SQL.

### Erro: "duplicate key value"
**Solução:** Já existe um ano letivo 2025. Isso é normal se você executou o script mais de uma vez. Ignore esse erro.

### Erro: "login must be unique"
**Solução:** Existem professores com nomes duplicados. Execute:

```sql
-- Listar duplicatas
SELECT login, COUNT(*) 
FROM professores 
WHERE login IS NOT NULL
GROUP BY login 
HAVING COUNT(*) > 1;

-- Corrigir manualmente adicionando números
UPDATE professores 
SET login = 'joao.silva2' 
WHERE id = 123; -- ID do professor duplicado
```

### Erro: "foreign key constraint"
**Solução:** Certifique-se de executar o script na ordem correta. Primeiro crie as tabelas pais (anos_letivos, bimestres) antes das filhas.

---

## 🧪 Passo 6: Testar Localmente

```bash
# Terminal 1 - Frontend
cd relatorios-pedagogicos
yarn dev

# Terminal 2 - Testar APIs
curl http://localhost:3000/api/ano-letivo
curl http://localhost:3000/api/materias
```

---

## 🚀 Passo 7: Deploy no Vercel

### Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas no Vercel:

```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # Se usar connection pooling
```

### Deploy

```bash
# Fazer push do branch
git push origin v3-ppi

# Ou via Vercel CLI
vercel --prod
```

---

## 📊 Passo 8: Validação Pós-Deploy

Acesse sua aplicação e teste:

1. **Login Professor:**
   - Acesse `/login`
   - Selecione "Professor"
   - Use login formato `nome.sobrenome`
   - ✅ Deve funcionar SEM senha

2. **Login Coordenador:**
   - Selecione "Coordenador/Admin"
   - Use matrícula + senha
   - ✅ Deve funcionar como antes

3. **APIs:**
   - `/api/ano-letivo` - Deve listar ano 2025
   - `/api/materias` - Deve listar matérias
   - `/api/dashboard/alunos-ri?bimestreId=1` - Deve retornar array vazio ou alunos

---

## 🔄 Rollback (Se necessário)

Se algo der errado, você pode voltar ao v2-ppi:

```bash
# 1. Restaurar backup do banco
psql -U seu_usuario -d nome_do_banco < backup_v2_YYYYMMDD.sql

# 2. Voltar ao branch v2-ppi
git checkout v2-ppi

# 3. Deploy no Vercel
vercel --prod
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Vercel: Settings → Logs
2. Verifique os logs do banco de dados
3. Execute as queries de verificação acima
4. Verifique o CHANGELOG-v3.md para entender as mudanças

---

## ✅ Checklist Final

- [ ] Backup do banco criado
- [ ] SQL de migração executado com sucesso
- [ ] Dependências instaladas (`yarn install`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Queries de verificação executadas
- [ ] Teste local funcionando
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy realizado
- [ ] Login professor testado (com login)
- [ ] Login coordenador testado (com matrícula)
- [ ] APIs testadas

---

## 🎯 Próximos Passos Após Migração

1. **Importar Conceitos:**
   - Acesse `/coordenador/importar-conceitos`
   - Faça upload do Excel com os conceitos
   - Selecione o bimestre (1º, 2º, 3º ou 4º)

2. **Configurar Ano/Bimestre:**
   - Acesse `/coordenador/configuracoes`
   - Verifique ano letivo ativo (2025)
   - Selecione bimestre corrente

3. **Visualizar Alunos RI:**
   - Acesse `/coordenador/alunos-ri`
   - Veja alunos com conceito RI
   - Verifique relatórios faltantes

---

**✅ Migração Completa!**

Seu sistema agora está rodando na versão v3-ppi com todas as novas funcionalidades! 🎉
