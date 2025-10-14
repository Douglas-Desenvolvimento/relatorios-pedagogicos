-- Migration manual para v3-ppi
-- Execute este script no seu banco de dados PostgreSQL

-- 1. Criar tabela anos_letivos
CREATE TABLE IF NOT EXISTS "anos_letivos" (
    "id" SERIAL PRIMARY KEY,
    "ano" VARCHAR(4) UNIQUE NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_ano_letivo" ON "anos_letivos"("ano");

-- 2. Criar tabela bimestres
CREATE TABLE IF NOT EXISTS "bimestres" (
    "id" SERIAL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "anoLetivoId" INTEGER NOT NULL,
    CONSTRAINT "bimestres_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bimestres_numero_anoLetivoId_key" UNIQUE ("numero", "anoLetivoId")
);

CREATE INDEX IF NOT EXISTS "idx_bimestre_ano" ON "bimestres"("anoLetivoId");

-- 3. Criar enum Conceito se não existir
DO $$ BEGIN
    CREATE TYPE "Conceito" AS ENUM ('RI', 'MB', 'B', 'R');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Criar tabela conceitos_alunos_bimestres
CREATE TABLE IF NOT EXISTS "conceitos_alunos_bimestres" (
    "id" SERIAL PRIMARY KEY,
    "alunoId" INTEGER NOT NULL,
    "bimestreId" INTEGER NOT NULL,
    "conceito" "Conceito" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conceitos_alunos_bimestres_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conceitos_alunos_bimestres_bimestreId_fkey" FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conceitos_alunos_bimestres_alunoId_bimestreId_key" UNIQUE ("alunoId", "bimestreId")
);

CREATE INDEX IF NOT EXISTS "idx_conceito_aluno" ON "conceitos_alunos_bimestres"("alunoId");
CREATE INDEX IF NOT EXISTS "idx_conceito_bimestre" ON "conceitos_alunos_bimestres"("bimestreId");
CREATE INDEX IF NOT EXISTS "idx_conceito_valor" ON "conceitos_alunos_bimestres"("conceito");

-- 5. Adicionar campo login em professores
ALTER TABLE "professores" ADD COLUMN IF NOT EXISTS "login" VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS "idx_professor_login" ON "professores"("login");

-- 6. Criar ano letivo 2025 se não existir
INSERT INTO "anos_letivos" ("ano", "ativo")
VALUES ('2025', true)
ON CONFLICT ("ano") DO NOTHING;

-- 7. Criar bimestres para 2025
DO $$
DECLARE
    ano_id INTEGER;
BEGIN
    SELECT id INTO ano_id FROM "anos_letivos" WHERE ano = '2025';
    
    IF ano_id IS NOT NULL THEN
        INSERT INTO "bimestres" ("numero", "ativo", "anoLetivoId")
        VALUES 
            (1, true, ano_id),
            (2, false, ano_id),
            (3, false, ano_id),
            (4, false, ano_id)
        ON CONFLICT ("numero", "anoLetivoId") DO NOTHING;
    END IF;
END $$;

-- 8. Atualizar turmas para usar anoLetivoId
-- Primeiro adicionar a coluna
ALTER TABLE "turmas" ADD COLUMN IF NOT EXISTS "anoLetivoId" INTEGER;

-- Popular com o ano letivo 2025 para turmas existentes
UPDATE "turmas" 
SET "anoLetivoId" = (SELECT id FROM "anos_letivos" WHERE ano = '2025')
WHERE "anoLetivoId" IS NULL;

-- Adicionar constraint NOT NULL após popular
ALTER TABLE "turmas" ALTER COLUMN "anoLetivoId" SET NOT NULL;

-- Adicionar foreign key
DO $$ 
BEGIN
    ALTER TABLE "turmas" ADD CONSTRAINT "turmas_anoLetivoId_fkey" 
    FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_turma_ano_letivo" ON "turmas"("anoLetivoId");

-- Remover coluna antiga ano_letivo (string) se existir
ALTER TABLE "turmas" DROP COLUMN IF EXISTS "ano_letivo";

-- 9. Adicionar bimestreId em relatorios
ALTER TABLE "relatorios" ADD COLUMN IF NOT EXISTS "bimestreId" INTEGER;

-- Popular com o primeiro bimestre do ano ativo
UPDATE "relatorios" 
SET "bimestreId" = (
    SELECT b.id FROM "bimestres" b
    JOIN "anos_letivos" a ON b."anoLetivoId" = a.id
    WHERE a.ativo = true AND b.numero = 1
    LIMIT 1
)
WHERE "bimestreId" IS NULL;

-- Tornar NOT NULL após popular
ALTER TABLE "relatorios" ALTER COLUMN "bimestreId" SET NOT NULL;

-- Adicionar foreign key
DO $$ 
BEGIN
    ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_bimestreId_fkey" 
    FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_relatorio_bimestre" ON "relatorios"("bimestreId");

-- 10. Atualizar unique constraint de relatorios para incluir bimestreId
-- Remover constraint antiga
ALTER TABLE "relatorios" DROP CONSTRAINT IF EXISTS "relatorios_alunoId_professorId_materiaId_turmaId_key";

-- Adicionar nova constraint
DO $$ 
BEGIN
    ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
    UNIQUE ("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 11. Gerar logins para professores existentes
-- Script básico - pode precisar de ajustes manuais para duplicatas
UPDATE "professores"
SET "login" = LOWER(
    REGEXP_REPLACE(
        SPLIT_PART(TRIM("name"), ' ', 1) || '.' || 
        SPLIT_PART(TRIM("name"), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM("name"), ' '), 1)),
        '[^a-z.]', '', 'g'
    )
)
WHERE "login" IS NULL AND "name" IS NOT NULL;

-- Tratar duplicatas adicionando número
WITH duplicates AS (
    SELECT "login", COUNT(*) as cnt, ARRAY_AGG(id ORDER BY id) as ids
    FROM "professores"
    WHERE "login" IS NOT NULL
    GROUP BY "login"
    HAVING COUNT(*) > 1
)
UPDATE "professores" p
SET "login" = p."login" || (idx - 1)::text
FROM (
    SELECT UNNEST(d.ids) as id, 
           GENERATE_SUBSCRIPTS(d.ids, 1) as idx
    FROM duplicates d
) sub
WHERE p.id = sub.id AND sub.idx > 1;

-- Mensagens de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migration v3-ppi concluída com sucesso!';
    RAISE NOTICE '📊 Verificações:';
    RAISE NOTICE '   - Ano letivo 2025 criado e ativado';
    RAISE NOTICE '   - 4 bimestres criados (1º ativo)';
    RAISE NOTICE '   - Campo login adicionado aos professores';
    RAISE NOTICE '   - Turmas vinculadas ao ano letivo';
    RAISE NOTICE '   - Relatórios vinculados ao bimestre';
END $$;
