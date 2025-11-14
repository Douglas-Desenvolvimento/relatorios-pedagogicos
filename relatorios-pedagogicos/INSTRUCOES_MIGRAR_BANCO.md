# 🔧 INSTRUÇÕES PARA CORRIGIR ERRO DE CONSTRAINT

## ❌ Erro Atual
```
Unique constraint failed on the fields: (alunoId, professorId, materiaId, turmaId)
```

## 🎯 Causa
O banco de dados tem um constraint único que NÃO inclui o `bimestreId`, mas o código espera que inclua.

## ✅ Solução

### ⚡ Opção 1: SQL Direto no Painel Vercel (MAIS RÁPIDO)

1. **Acesse o Vercel Dashboard**
   - Vá para: https://vercel.com/dashboard
   - Clique no seu projeto "relatorios-pedagogicos"
   - Vá em **Storage** → Selecione seu banco Postgres

2. **Abra o SQL Editor**
   - Clique na aba **"Query"** ou **".sql"** no topo

3. **IMPORTANTE: Execute UM por vez, NA ORDEM:**

**Passo 1 - Ver índices atuais:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'relatorios' AND indexdef LIKE '%UNIQUE%';
```
Clique em **"Run"** - Anote o nome do índice que aparecer

**Passo 2 - Remover TODOS os índices únicos antigos:**
```sql
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key";
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_created_at_key";
DROP INDEX IF EXISTS "Relatorio_alunoId_professorId_materiaId_turmaId_key";
```
Clique em **"Run"**

**Passo 3 - Criar novo índice correto:**
```sql
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");
```
Clique em **"Run"**

**Passo 4 - Verificar se está correto:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'relatorios' AND indexdef LIKE '%UNIQUE%';
```
Clique em **"Run"** - Deve mostrar APENAS o novo índice com 5 campos

4. **Limpar Cache e Redeploy**
   - Vá em **Settings** → **General**
   - Role até **"Build & Development Settings"**
   - Clique em **"Clear Build Cache"**
   - Depois vá em **Deployments**
   - Clique em **"Redeploy"** no último deployment
   - Marque a opção **"Use existing Build Cache: No"**

### Opção 2: Usar Prisma Migrate (Se tiver acesso ao terminal)

```bash
cd /caminho/do/projeto
npx prisma migrate deploy
```

### Opção 3: Reset do Banco (CUIDADO: Apaga todos os dados!)

```bash
npx prisma migrate reset
npx prisma migrate deploy
npx prisma db seed # se tiver seed
```

## 🧪 Como Testar se Funcionou

Após aplicar a migração:
1. Faça o redeploy na Vercel
2. Tente criar um relatório
3. Não deve mais dar erro de constraint

## 📝 Verificação

Para verificar se o constraint está correto, execute no banco:

```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'relatorios'
  AND indexname LIKE '%unique%';
```

Deve retornar um índice com os 5 campos: `alunoId`, `professorId`, `materiaId`, `turmaId`, `bimestreId`

## ⚠️ Importante

- Esta migração é segura e não apaga dados
- Ela apenas atualiza o constraint de unicidade
- Permite criar múltiplos relatórios do mesmo aluno/professor/matéria/turma em BIMESTRES diferentes
