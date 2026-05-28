-- Reparo defensivo de sincronismo entre users e professores.
-- Objetivo: todo user PROFESSOR deve exigir troca de senha e estar ligado a um registro em professores.

UPDATE "users"
SET
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
WHERE role = 'PROFESSOR'::"Role";

-- Se o user ja aponta para id_tb_professor, preenche professores."userId" quando nao houver conflito.
WITH explicit_user_links AS (
  SELECT
    u.id AS user_id,
    u.id_tb_professor AS professor_id
  FROM "users" u
  JOIN "professores" p ON p.id = u.id_tb_professor
  WHERE u.role = 'PROFESSOR'::"Role"
    AND u.id_tb_professor IS NOT NULL
    AND (p."userId" IS NULL OR p."userId" = u.id)
    AND NOT EXISTS (
      SELECT 1
      FROM "professores" other_professor
      WHERE other_professor."userId" = u.id
        AND other_professor.id <> p.id
    )
)
UPDATE "professores" p
SET
  "userId" = l.user_id,
  role = 'PROFESSOR'::"Role",
  email = COALESCE(NULLIF(p.email, ''), u.email),
  matricula = COALESCE(NULLIF(p.matricula, ''), u.matricula),
  login = COALESCE(NULLIF(p.login, ''), u.login)
FROM explicit_user_links l
JOIN "users" u ON u.id = l.user_id
WHERE p.id = l.professor_id;

-- Se professores."userId" ja aponta para um user professor, preenche users.id_tb_professor.
UPDATE "users" u
SET
  id_tb_professor = p.id,
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
FROM "professores" p
WHERE p."userId" = u.id
  AND u.role = 'PROFESSOR'::"Role"
  AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
  AND NOT EXISTS (
    SELECT 1
    FROM "users" other_user
    WHERE other_user.id <> u.id
      AND other_user.id_tb_professor = p.id
  );

-- Faz correspondencia segura por login, email ou matricula para registros ainda soltos.
WITH raw_candidates AS (
  SELECT
    p.id AS professor_id,
    u.id AS user_id,
    CASE
      WHEN p.login IS NOT NULL AND trim(p.login) <> '' AND u.login IS NOT NULL AND lower(u.login) = lower(trim(p.login)) THEN 1
      WHEN p.email IS NOT NULL AND trim(p.email) <> '' AND lower(u.email) = lower(trim(p.email)) THEN 2
      WHEN p.matricula IS NOT NULL AND trim(p.matricula) <> ''
        AND regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = regexp_replace(trim(p.matricula), '[-[:space:]]', '', 'g') THEN 3
      ELSE 99
    END AS priority
  FROM "professores" p
  JOIN "users" u
    ON u.role = 'PROFESSOR'::"Role"
   AND p."userId" IS NULL
   AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
   AND (
      (p.login IS NOT NULL AND trim(p.login) <> '' AND u.login IS NOT NULL AND lower(u.login) = lower(trim(p.login)))
      OR (p.email IS NOT NULL AND trim(p.email) <> '' AND lower(u.email) = lower(trim(p.email)))
      OR (
        p.matricula IS NOT NULL AND trim(p.matricula) <> ''
        AND regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = regexp_replace(trim(p.matricula), '[-[:space:]]', '', 'g')
      )
   )
  WHERE p.role = 'PROFESSOR'::"Role"
    AND NOT EXISTS (
      SELECT 1
      FROM "professores" linked
      WHERE linked."userId" = u.id
        AND linked.id <> p.id
    )
), ranked_candidates AS (
  SELECT
    professor_id,
    user_id,
    row_number() OVER (PARTITION BY professor_id ORDER BY priority, user_id) AS professor_rank,
    row_number() OVER (PARTITION BY user_id ORDER BY priority, professor_id) AS user_rank
  FROM raw_candidates
), candidates AS (
  SELECT professor_id, user_id
  FROM ranked_candidates
  WHERE professor_rank = 1
    AND user_rank = 1
)
UPDATE "professores" p
SET "userId" = c.user_id
FROM candidates c
WHERE p.id = c.professor_id;

UPDATE "users" u
SET
  id_tb_professor = p.id,
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
FROM "professores" p
WHERE p."userId" = u.id
  AND u.role = 'PROFESSOR'::"Role"
  AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
  AND NOT EXISTS (
    SELECT 1
    FROM "users" other_user
    WHERE other_user.id <> u.id
      AND other_user.id_tb_professor = p.id
  );

-- Cria usuarios de primeiro acesso para professores que seguem sem userId.
WITH missing_base AS (
  SELECT
    p.id,
    COALESCE(NULLIF(trim(p.name), ''), concat('Professor ', p.id)) AS professor_name,
    lower(NULLIF(trim(p.email), '')) AS email_value,
    NULLIF(trim(p.login), '') AS login_value,
    NULLIF(regexp_replace(COALESCE(p.matricula, ''), '[-[:space:]]', '', 'g'), '') AS matricula_value
  FROM "professores" p
  WHERE p.role = 'PROFESSOR'::"Role"
    AND p."userId" IS NULL
), missing_prepared AS (
  SELECT
    id,
    professor_name,
    CASE
      WHEN email_value IS NULL
        OR count(*) OVER (PARTITION BY email_value) > 1
        OR EXISTS (SELECT 1 FROM "users" u WHERE lower(u.email) = email_value)
      THEN concat('professor-', id, '-', substring(md5(id::text), 1, 8), '@default.local')
      ELSE email_value
    END AS user_email,
    CASE
      WHEN login_value IS NULL
        OR count(*) OVER (PARTITION BY lower(login_value)) > 1
        OR EXISTS (SELECT 1 FROM "users" u WHERE u.login IS NOT NULL AND lower(u.login) = lower(login_value))
      THEN concat('professor.', id, '.', substring(md5(id::text), 1, 8))
      ELSE lower(login_value)
    END AS user_login,
    CASE
      WHEN matricula_value IS NULL
        OR count(*) OVER (PARTITION BY matricula_value) > 1
        OR EXISTS (
          SELECT 1
          FROM "users" u
          WHERE regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = matricula_value
        )
      THEN left(concat('P', id, substring(md5(id::text), 1, 8)), 20)
      ELSE left(matricula_value, 20)
    END AS user_matricula
  FROM missing_base
)
INSERT INTO "users" (
  nome,
  email,
  matricula,
  login,
  password,
  role,
  active,
  id_tb_professor,
  must_change_password,
  created_at,
  updated_at
)
SELECT
  professor_name,
  user_email,
  user_matricula,
  user_login,
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'PROFESSOR'::"Role",
  true,
  id,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM missing_prepared
ON CONFLICT DO NOTHING;

-- Depois da criacao, liga os professores aos users criados ou encontrados.
WITH link_after_insert AS (
  SELECT
    p.id AS professor_id,
    u.id AS user_id
  FROM "professores" p
  JOIN "users" u
    ON u.role = 'PROFESSOR'::"Role"
   AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
   AND (
      u.id_tb_professor = p.id
      OR (p.login IS NOT NULL AND trim(p.login) <> '' AND u.login IS NOT NULL AND lower(u.login) = lower(trim(p.login)))
      OR (p.email IS NOT NULL AND trim(p.email) <> '' AND lower(u.email) = lower(trim(p.email)))
      OR (
        p.matricula IS NOT NULL AND trim(p.matricula) <> ''
        AND regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = regexp_replace(trim(p.matricula), '[-[:space:]]', '', 'g')
      )
      OR u.email = concat('professor-', p.id, '-', substring(md5(p.id::text), 1, 8), '@default.local')
      OR u.login = concat('professor.', p.id, '.', substring(md5(p.id::text), 1, 8))
      OR u.matricula = left(concat('P', p.id, substring(md5(p.id::text), 1, 8)), 20)
   )
  WHERE p.role = 'PROFESSOR'::"Role"
    AND p."userId" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "professores" other_professor
      WHERE other_professor."userId" = u.id
        AND other_professor.id <> p.id
    )
), ranked_link_after_insert AS (
  SELECT
    professor_id,
    user_id,
    row_number() OVER (PARTITION BY professor_id ORDER BY user_id) AS professor_rank,
    row_number() OVER (PARTITION BY user_id ORDER BY professor_id) AS user_rank
  FROM link_after_insert
), final_links AS (
  SELECT professor_id, user_id
  FROM ranked_link_after_insert
  WHERE professor_rank = 1
    AND user_rank = 1
)
UPDATE "professores" p
SET
  "userId" = f.user_id,
  role = 'PROFESSOR'::"Role",
  email = COALESCE(NULLIF(p.email, ''), u.email),
  matricula = COALESCE(NULLIF(p.matricula, ''), u.matricula),
  login = COALESCE(NULLIF(p.login, ''), u.login)
FROM final_links f
JOIN "users" u ON u.id = f.user_id
WHERE p.id = f.professor_id;

UPDATE "users" u
SET
  id_tb_professor = p.id,
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
FROM "professores" p
WHERE p."userId" = u.id
  AND u.role = 'PROFESSOR'::"Role"
  AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
  AND NOT EXISTS (
    SELECT 1
    FROM "users" other_user
    WHERE other_user.id <> u.id
      AND other_user.id_tb_professor = p.id
  );

UPDATE "users"
SET
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
WHERE role = 'PROFESSOR'::"Role";
