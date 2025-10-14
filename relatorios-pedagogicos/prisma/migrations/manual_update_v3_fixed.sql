-- Migration manual para v3-ppi (VERSÃO CORRIGIDA)
-- Execute este script no seu banco de dados PostgreSQL
-- Esta versão trata melhor os casos de re-execução

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
    "anoLetivoId" INTEGER NOT NULL
);

-- Adicionar foreign key apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bimestres_anoLetivoId_fkey'
    ) THEN
        ALTER TABLE "bimestres" ADD CONSTRAINT "bimestres_anoLetivoId_fkey" 
        FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Adicionar unique constraint apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bimestres_numero_anoLetivoId_key'
    ) THEN
        ALTER TABLE "bimestres" ADD CONSTRAINT "bimestres_numero_anoLetivoId_key" 
        UNIQUE ("numero", "anoLetivoId");
    END IF;
END $$;

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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar foreign keys apenas se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conceitos_alunos_bimestres_alunoId_fkey'
    ) THEN
        ALTER TABLE "conceitos_alunos_bimestres" ADD CONSTRAINT "conceitos_alunos_bimestres_alunoId_fkey" 
        FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conceitos_alunos_bimestres_bimestreId_fkey'
    ) THEN
        ALTER TABLE "conceitos_alunos_bimestres" ADD CONSTRAINT "conceitos_alunos_bimestres_bimestreId_fkey" 
        FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conceitos_alunos_bimestres_alunoId_bimestreId_key'
    ) THEN
        ALTER TABLE "conceitos_alunos_bimestres" ADD CONSTRAINT "conceitos_alunos_bimestres_alunoId_bimestreId_key" 
        UNIQUE ("alunoId", "bimestreId");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_conceito_aluno" ON "conceitos_alunos_bimestres"("alunoId");
CREATE INDEX IF NOT EXISTS "idx_conceito_bimestre" ON "conceitos_alunos_bimestres"("bimestreId");
CREATE INDEX IF NOT EXISTS "idx_conceito_valor" ON "conceitos_alunos_bimestres"("conceito");

-- 5. Adicionar campo login em professores
ALTER TABLE "professores" ADD COLUMN IF NOT EXISTS "login" VARCHAR(100);

-- Adicionar unique constraint no login apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'professores_login_key' AND conrelid = 'professores'::regclass
    ) THEN
        ALTER TABLE "professores" ADD CONSTRAINT "professores_login_key" UNIQUE ("login");
    END IF;
END $$;

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
ALTER TABLE "turmas" ADD COLUMN IF NOT EXISTS "anoLetivoId" INTEGER;

-- Popular com o ano letivo 2025 para turmas existentes
UPDATE "turmas" 
SET "anoLetivoId" = (SELECT id FROM "anos_letivos" WHERE ano = '2025')
WHERE "anoLetivoId" IS NULL;

-- Adicionar constraint NOT NULL apenas se a coluna existir e tiver dados
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'turmas' AND column_name = 'anoLetivoId'
    ) THEN
        ALTER TABLE "turmas" ALTER COLUMN "anoLetivoId" SET NOT NULL;
    END IF;
END $$;

-- Adicionar foreign key apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'turmas_anoLetivoId_fkey'
    ) THEN
        ALTER TABLE "turmas" ADD CONSTRAINT "turmas_anoLetivoId_fkey" 
        FOREIGN KEY ("anoLetivoId") REFERENCES "anos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
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

-- Tornar NOT NULL após popular (apenas se existir coluna e tiver dados)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'relatorios' AND column_name = 'bimestreId'
    ) THEN
        ALTER TABLE "relatorios" ALTER COLUMN "bimestreId" SET NOT NULL;
    END IF;
END $$;

-- Adicionar foreign key apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relatorios_bimestreId_fkey'
    ) THEN
        ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_bimestreId_fkey" 
        FOREIGN KEY ("bimestreId") REFERENCES "bimestres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_relatorio_bimestre" ON "relatorios"("bimestreId");

-- 10. Atualizar unique constraint de relatorios para incluir bimestreId
-- Remover constraint antiga apenas se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relatorios_alunoId_professorId_materiaId_turmaId_key'
    ) THEN
        ALTER TABLE "relatorios" DROP CONSTRAINT "relatorios_alunoId_professorId_materiaId_turmaId_key";
    END IF;
END $$;

-- Adicionar nova constraint apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key'
    ) THEN
        ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" 
        UNIQUE ("alunoId", "professorId", "materiaId", "turmaId", "bimestreId");
    END IF;
END $$;

-- 11. Gerar logins para professores existentes (apenas para quem não tem)
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
    RAISE NOTICE '   - Constraints verificados e corrigidos';
END $$;
