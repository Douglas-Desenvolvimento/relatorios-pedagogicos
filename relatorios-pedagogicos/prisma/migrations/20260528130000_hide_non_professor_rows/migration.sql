-- Remove da tabela/visao de professores os registros vinculados a usuarios que nao sao PROFESSOR.
-- Se houver relatorios, preserva o historico mudando a role e soltando o vinculo.
-- Se nao houver relatorios, remove a linha redundante de professores.

UPDATE "users" u
SET
  id_tb_professor = NULL,
  updated_at = CURRENT_TIMESTAMP
FROM "professores" p
WHERE p."userId" = u.id
  AND u.role <> 'PROFESSOR'::"Role";

WITH non_professor_rows AS (
  SELECT
    p.id,
    u.role AS user_role
  FROM "professores" p
  JOIN "users" u ON u.id = p."userId"
  WHERE u.role <> 'PROFESSOR'::"Role"
    AND EXISTS (
      SELECT 1
      FROM "relatorios" r
      WHERE r."professorId" = p.id
    )
)
UPDATE "professores" p
SET
  "userId" = NULL,
  role = n.user_role
FROM non_professor_rows n
WHERE p.id = n.id;

WITH non_professor_rows AS (
  SELECT p.id
  FROM "professores" p
  JOIN "users" u ON u.id = p."userId"
  WHERE u.role <> 'PROFESSOR'::"Role"
    AND NOT EXISTS (
      SELECT 1
      FROM "relatorios" r
      WHERE r."professorId" = p.id
    )
)
DELETE FROM "professores" p
USING non_professor_rows n
WHERE p.id = n.id;

UPDATE "users"
SET
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
WHERE role = 'PROFESSOR'::"Role";
