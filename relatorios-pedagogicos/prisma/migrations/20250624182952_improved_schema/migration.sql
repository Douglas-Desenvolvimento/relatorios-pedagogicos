-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COORDENADOR', 'ADMIN', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('RASCUNHO', 'ENVIADO', 'REVISADO', 'ARQUIVADO');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COORDENADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "userId" INTEGER,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "matricule" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "turmaId" INTEGER NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "codigo" VARCHAR(10),

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(10) NOT NULL,
    "anoLetivo" VARCHAR(4) NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" SERIAL NOT NULL,
    "conteudo" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessorMaterias" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorMaterias_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_email_key" ON "professores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_userId_key" ON "professores"("userId");

-- CreateIndex
CREATE INDEX "idx_professor_name" ON "professores"("name");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_matricule_key" ON "alunos"("matricule");

-- CreateIndex
CREATE INDEX "idx_aluno_name" ON "alunos"("name");

-- CreateIndex
CREATE INDEX "idx_aluno_turma" ON "alunos"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "materias_name_key" ON "materias"("name");

-- CreateIndex
CREATE UNIQUE INDEX "materias_codigo_key" ON "materias"("codigo");

-- CreateIndex
CREATE INDEX "idx_materia_name" ON "materias"("name");

-- CreateIndex
CREATE INDEX "idx_turma_name" ON "turmas"("name");

-- CreateIndex
CREATE INDEX "idx_turma_materia" ON "turmas"("materiaId");

-- CreateIndex
CREATE INDEX "idx_turma_professor" ON "turmas"("professorId");

-- CreateIndex
CREATE INDEX "idx_relatorio_aluno" ON "relatorios"("alunoId");

-- CreateIndex
CREATE INDEX "idx_relatorio_professor" ON "relatorios"("professorId");

-- CreateIndex
CREATE INDEX "idx_relatorio_created" ON "relatorios"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_key" ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId");

-- CreateIndex
CREATE INDEX "_ProfessorMaterias_B_index" ON "_ProfessorMaterias"("B");

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMaterias" ADD CONSTRAINT "_ProfessorMaterias_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMaterias" ADD CONSTRAINT "_ProfessorMaterias_B_fkey" FOREIGN KEY ("B") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
