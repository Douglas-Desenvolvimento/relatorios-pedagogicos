/*
  Warnings:

  - You are about to drop the column `materiaId` on the `turmas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "turmas" DROP COLUMN "materiaId";

-- CreateTable
CREATE TABLE "_MateriaTurma" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MateriaTurma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MateriaTurma_B_index" ON "_MateriaTurma"("B");

-- AddForeignKey
ALTER TABLE "_MateriaTurma" ADD CONSTRAINT "_MateriaTurma_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriaTurma" ADD CONSTRAINT "_MateriaTurma_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
