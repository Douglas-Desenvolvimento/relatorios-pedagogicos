-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COORDENADOR', 'ADMIN', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('RASCUNHO', 'ENVIADO', 'REVISADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "Conceito" AS ENUM ('RI', 'MB', 'B', 'R');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "matricula" VARCHAR(20) NOT NULL,
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
    "matricula" VARCHAR(20),
    "matricula_hash" VARCHAR(64),
    "login" VARCHAR(100),
    "role" "Role" NOT NULL DEFAULT 'PROFESSOR',
    "data_nascimento" TIMESTAMP(3),

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "matricule" VARCHAR(20),
    "data_nascimento" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "turmaId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

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
    "anoLetivoId" INTEGER NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" SERIAL NOT NULL,
    "conteudo" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'RASCUNHO',
    "bimestreId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "alunoId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audit" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "professor_id" INTEGER,
    "nome" VARCHAR(150),
    "role" VARCHAR(20) NOT NULL,
    "identifier" VARCHAR(150) NOT NULL,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "success" BOOLEAN NOT NULL DEFAULT false,
    "message" VARCHAR(255),
    "executed_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anos_letivos" (
    "id" SERIAL NOT NULL,
    "ano" VARCHAR(4) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anos_letivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bimestres" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "anoLetivoId" INTEGER NOT NULL,

    CONSTRAINT "bimestres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceitos_alunos_bimestres" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "bimestreId" INTEGER NOT NULL,
    "conceito" "Conceito" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceitos_alunos_bimestres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessorTurma" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorTurma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MateriaTurma" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MateriaTurma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProfessorMateria" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorMateria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_matricula_key" ON "users"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_email_key" ON "professores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_userId_key" ON "professores"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "professores_login_key" ON "professores"("login");

-- CreateIndex
CREATE INDEX "idx_professor_name" ON "professores"("name");

-- CreateIndex
CREATE INDEX "idx_professor_login" ON "professores"("login");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_matricule_key" ON "alunos"("matricule");

-- CreateIndex
CREATE INDEX "idx_aluno_name" ON "alunos"("name");

-- CreateIndex
CREATE INDEX "idx_aluno_turma" ON "alunos"("turmaId");

-- CreateIndex
CREATE INDEX "idx_aluno_deleted" ON "alunos"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "materias_name_key" ON "materias"("name");

-- CreateIndex
CREATE UNIQUE INDEX "materias_codigo_key" ON "materias"("codigo");

-- CreateIndex
CREATE INDEX "idx_materia_name" ON "materias"("name");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_name_key" ON "turmas"("name");

-- CreateIndex
CREATE INDEX "idx_turma_name" ON "turmas"("name");

-- CreateIndex
CREATE INDEX "idx_turma_ano_letivo" ON "turmas"("anoLetivoId");

-- CreateIndex
CREATE INDEX "idx_relatorio_aluno" ON "relatorios"("alunoId");

-- CreateIndex
CREATE INDEX "idx_relatorio_professor" ON "relatorios"("professorId");

-- CreateIndex
CREATE INDEX "idx_relatorio_materia" ON "relatorios"("materiaId");

-- CreateIndex
CREATE INDEX "idx_relatorio_turma" ON "relatorios"("turmaId");

-- CreateIndex
CREATE INDEX "idx_relatorio_bimestre" ON "relatorios"("bimestreId");

-- CreateIndex
CREATE INDEX "idx_relatorio_created" ON "relatorios"("created_at");

-- CreateIndex
CREATE INDEX "idx_relatorio_deleted" ON "relatorios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" ON "relatorios"("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");

-- CreateIndex
CREATE INDEX "idx_login_audit_created" ON "login_audit"("created_at");

-- CreateIndex
CREATE INDEX "idx_login_audit_user" ON "login_audit"("user_id");

-- CreateIndex
CREATE INDEX "idx_login_audit_prof" ON "login_audit"("professor_id");

-- CreateIndex
CREATE INDEX "idx_login_audit_success" ON "login_audit"("success");

-- CreateIndex
CREATE UNIQUE INDEX "anos_letivos_ano_key" ON "anos_letivos"("ano");

-- CreateIndex
CREATE INDEX "idx_ano_letivo" ON "anos_letivos"("ano");

-- CreateIndex
CREATE INDEX "idx_bimestre_ano" ON "bimestres"("anoLetivoId");

-- CreateIndex
CREATE UNIQUE INDEX "bimestres_numero_anoLetivoId_key" ON "bimestres"("numero", "anoLetivoId");

-- CreateIndex
CREATE INDEX "idx_conceito_aluno" ON "conceitos_alunos_bimestres"("alunoId");

-- CreateIndex
CREATE INDEX "idx_conceito_bimestre" ON "conceitos_alunos_bimestres"("bimestreId");

-- CreateIndex
CREATE INDEX "idx_conceito_valor" ON "conceitos_alunos_bimestres"("conceito");

-- CreateIndex
CREATE UNIQUE INDEX "conceitos_alunos_bimestres_alunoId_bimestreId_key" ON "conceitos_alunos_bimestres"("alunoId", "bimestreId");

-- CreateIndex
CREATE INDEX "_ProfessorTurma_B_index" ON "_ProfessorTurma"("B");

-- CreateIndex
CREATE INDEX "_MateriaTurma_B_index" ON "_MateriaTurma"("B");

-- CreateIndex
CREATE INDEX "_ProfessorMateria_B_index" ON "_ProfessorMateria"("B");

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_bimestreId_fkey" FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bimestres" ADD CONSTRAINT "bimestres_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceitos_alunos_bimestres" ADD CONSTRAINT "conceitos_alunos_bimestres_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceitos_alunos_bimestres" ADD CONSTRAINT "conceitos_alunos_bimestres_bimestreId_fkey" FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorTurma" ADD CONSTRAINT "_ProfessorTurma_A_fkey" FOREIGN KEY ("A") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorTurma" ADD CONSTRAINT "_ProfessorTurma_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriaTurma" ADD CONSTRAINT "_MateriaTurma_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriaTurma" ADD CONSTRAINT "_MateriaTurma_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMateria" ADD CONSTRAINT "_ProfessorMateria_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorMateria" ADD CONSTRAINT "_ProfessorMateria_B_fkey" FOREIGN KEY ("B") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

