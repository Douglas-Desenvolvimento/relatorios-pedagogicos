-- ============================================
-- SCRIPT COMPLETO PARA CORRIGIR CONSTRAINT
-- ============================================

-- 1. Ver todos os índices únicos atuais na tabela relatorios
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'relatorios'
  AND indexdef LIKE '%UNIQUE%';

-- 2. Remover TODOS os índices únicos antigos (podem ter nomes diferentes)
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key";
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_created_at_key";
DROP INDEX IF EXISTS "Relatorio_alunoId_professorId_materiaId_turmaId_key";

-- 3. Criar o índice único CORRETO com bimestreId
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");

-- 4. Verificar se foi criado corretamente
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'relatorios'
  AND indexdef LIKE '%UNIQUE%';

-- RESULTADO ESPERADO:
-- Deve mostrar apenas UM índice com os 5 campos: alunoId, professorId, materiaId, turmaId, bimestreId
