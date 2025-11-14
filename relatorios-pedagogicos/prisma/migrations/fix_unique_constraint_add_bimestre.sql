-- Remover o constraint antigo que não inclui bimestreId
DROP INDEX IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key";

-- Criar novo constraint único incluindo bimestreId
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");
