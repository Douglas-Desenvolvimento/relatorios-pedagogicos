-- Script para atualizar relatórios existentes do 1º para o 3º bimestre
-- Execute este script apenas UMA VEZ após a migração inicial

DO $$
DECLARE
    bimestre_3_id INTEGER;
BEGIN
    -- Buscar o ID do 3º bimestre do ano ativo
    SELECT b.id INTO bimestre_3_id
    FROM "bimestres" b
    JOIN "anos_letivos" a ON b."anoLetivoId" = a.id
    WHERE a.ativo = true AND b.numero = 3
    LIMIT 1;

    IF bimestre_3_id IS NOT NULL THEN
        -- Atualizar todos os relatórios existentes para o 3º bimestre
        UPDATE "relatorios"
        SET "bimestreId" = bimestre_3_id
        WHERE "bimestreId" = (
            SELECT b2.id FROM "bimestres" b2
            JOIN "anos_letivos" a2 ON b2."anoLetivoId" = a2.id
            WHERE a2.ativo = true AND b2.numero = 1
            LIMIT 1
        );

        RAISE NOTICE '✅ Relatórios atualizados para o 3º bimestre (ID: %)', bimestre_3_id;
    ELSE
        RAISE NOTICE '⚠️  3º bimestre não encontrado. Verifique se o ano letivo e bimestres foram criados.';
    END IF;
END $$;
