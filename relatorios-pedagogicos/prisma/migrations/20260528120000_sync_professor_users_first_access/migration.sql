-- Regra do projeto: must_change_password=false indica primeiro acesso pendente.
-- Esta migration sincroniza professores sem usuario e obriga todos os professores
-- a criarem uma nova senha no proximo acesso.

WITH raw_candidates AS (
  SELECT
    p.id AS professor_id,
    u.id AS user_id,
    CASE
      WHEN u.id_tb_professor = p.id THEN 1
      WHEN p.login IS NOT NULL AND trim(p.login) <> '' AND u.login IS NOT NULL AND lower(u.login) = lower(trim(p.login)) THEN 2
      WHEN p.email IS NOT NULL AND trim(p.email) <> '' AND lower(u.email) = lower(trim(p.email)) THEN 3
      WHEN p.matricula IS NOT NULL AND trim(p.matricula) <> ''
        AND regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = regexp_replace(trim(p.matricula), '[-[:space:]]', '', 'g') THEN 4
      ELSE 99
    END AS priority
  FROM "professores" p
  JOIN "users" u
    ON u.role = 'PROFESSOR'::"Role"
   AND (
      u.id_tb_professor = p.id
      OR (p.login IS NOT NULL AND trim(p.login) <> '' AND u.login IS NOT NULL AND lower(u.login) = lower(trim(p.login)))
      OR (p.email IS NOT NULL AND trim(p.email) <> '' AND lower(u.email) = lower(trim(p.email)))
      OR (
        p.matricula IS NOT NULL AND trim(p.matricula) <> ''
        AND regexp_replace(u.matricula, '[-[:space:]]', '', 'g') = regexp_replace(trim(p.matricula), '[-[:space:]]', '', 'g')
      )
   )
  WHERE p.role = 'PROFESSOR'::"Role"
    AND p."userId" IS NULL
    AND (u.id_tb_professor IS NULL OR u.id_tb_professor = p.id)
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
), inserted AS (
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
  RETURNING id, id_tb_professor, email, matricula, login
)
UPDATE "professores" p
SET
  "userId" = i.id,
  email = COALESCE(NULLIF(p.email, ''), i.email),
  matricula = COALESCE(NULLIF(p.matricula, ''), i.matricula),
  login = COALESCE(NULLIF(p.login, ''), i.login),
  role = 'PROFESSOR'::"Role"
FROM inserted i
WHERE p.id = i.id_tb_professor;

UPDATE "users"
SET
  must_change_password = false,
  updated_at = CURRENT_TIMESTAMP
WHERE role = 'PROFESSOR'::"Role";
