/*
  Warnings:

  - A unique constraint covering the columns `[alunoId,professorId,materiaId,turmaId]` on the table `relatorios` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "relatorios_alunoId_professorId_materiaId_created_at_key";

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_key" ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId");
