# 🔧 INSTRUÇÕES PARA CORRIGIR ERRO DE CONSTRAINT

## ❌ Erro Atual
```
Unique constraint failed on the fields: (alunoId, professorId, materiaId, turmaId)
```

## 🎯 Causa
O banco de dados tem um constraint único que NÃO inclui o `bimestreId`, mas o código espera que inclua.

## ✅ Solução

### Opção 1: Aplicar Migração Manualmente (RECOMENDADO)

**Se você usa PostgreSQL no Vercel/Supabase:**

1. Acesse o painel do seu banco de dados (Vercel Storage ou Supabase)
2. Vá para a aba "SQL Editor" ou "Query"
3. Execute este SQL:

```sql
-- Remover o constraint antigo
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key";

-- Criar novo constraint incluindo bimestreId
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");
```

4. Clique em "Run" ou "Execute"

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
