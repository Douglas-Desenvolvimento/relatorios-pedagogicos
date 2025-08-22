/*
  Warnings:

  - You are about to drop the column `anoLetivo` on the `turmas` table. All the data in the column will be lost.
  - You are about to drop the column `materiaId` on the `turmas` table. All the data in the column will be lost.
  - You are about to drop the column `professorId` on the `turmas` table. All the data in the column will be lost.
  - You are about to drop the `_ProfessorMaterias` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[alunoId,professorId,materiaId,created_at]` on the table `relatorios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `turmas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ano_letivo` to the `turmas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ProfessorMaterias" DROP CONSTRAINT "_ProfessorMaterias_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorMaterias" DROP CONSTRAINT "_ProfessorMaterias_B_fkey";

-- DropForeignKey
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_materiaId_fkey";

-- DropForeignKey
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_professorId_fkey";

-- DropIndex
DROP INDEX "relatorios_alunoId_professorId_materiaId_turmaId_key";

-- DropIndex
DROP INDEX "idx_turma_materia";

-- DropIndex
DROP INDEX "idx_turma_professor";

-- AlterTable
ALTER TABLE "turmas" DROP COLUMN "anoLetivo",
DROP COLUMN "materiaId",
DROP COLUMN "professorId",
ADD COLUMN     "ano_letivo" VARCHAR(4) NOT NULL;

-- DropTable
DROP TABLE "_ProfessorMaterias";

-- CreateTable
CREATE TABLE "_ProfessorTurma" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorTurma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProfessorMateria" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorMateria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProfessorTurma_B_index" ON "_ProfessorTurma"("B");

-- CreateIndex
CREATE INDEX "_ProfessorMateria_B_index" ON "_ProfessorMateria"("B");

-- CreateIndex
CREATE INDEX "idx_relatorio_materia" ON "relatorios"("materiaId");

-- CreateIndex
CREATE INDEX "idx_relatorio_turma" ON "relatorios"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_created_at_key" ON "relatorios"("alunoId", "professorId", "materiaId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_name_key" ON "turmas"("name");

-- AddForeignKey
ALTER TABLE "_ProfessorTurma" ADD CONSTRAINT "_ProfessorTurma_A_fkey" FOREIGN KEY ("A") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorTurma" ADD CONSTRAINT "_ProfessorTurma_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMateria" ADD CONSTRAINT "_ProfessorMateria_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMateria" ADD CONSTRAINT "_ProfessorMateria_B_fkey" FOREIGN KEY ("B") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
