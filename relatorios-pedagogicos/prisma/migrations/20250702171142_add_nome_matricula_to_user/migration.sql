/*
  Warnings:

  - A unique constraint covering the columns `[matricula]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matricula` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nome` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "matricula" VARCHAR(20) NOT NULL,
ADD COLUMN     "nome" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_matricula_key" ON "users"("matricula");
