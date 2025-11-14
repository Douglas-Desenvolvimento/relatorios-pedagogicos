-- ============================================
-- SCRIPT PARA VINCULAR PROFESSORES COM MATÉRIAS E TURMAS
-- Execute este script no banco de dados PostgreSQL
-- ============================================

-- 1. Limpar vínculos existentes (OPCIONAL - descomente se quiser recomeçar do zero)
-- DELETE FROM "_MateriaToProfessor";
-- DELETE FROM "_ProfessorToTurma";

-- ============================================
-- 2. VINCULAR PROFESSORES COM MATÉRIAS E TURMAS
-- ============================================

-- Ana Paula de Almeida Ducatti - ARTES
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Arte' 
  AND p.email = 'ana.ducatti@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'ana.ducatti@escola.com'
  AND t.name IN ('1702','1801','1802','1803','1901','1902')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Vivian Fernanda Lacerda Monteiro - ARTES
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Arte' 
  AND p.email = 'vivian.monteiro@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'vivian.monteiro@escola.com'
  AND t.name IN ('1601','1602','1701')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Rosa Maria Moura - EDUCAÇÃO FÍSICA (todas as turmas)
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Educação Física' 
  AND p.email = 'rosa.moura@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'rosa.moura@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Fabíola Guimarães Estima Paiva - ESPANHOL (todas as turmas)
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Língua Estrangeira' 
  AND p.email = 'fabiola.paiva@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'fabiola.paiva@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- José Guilherme de Castro Nóbrega - GEOGRAFIA
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Geografia' 
  AND p.email = 'jose.nobrega@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'jose.nobrega@escola.com'
  AND t.name IN ('1601','1602','1701','1702','1801','1802','1803','1901')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Michele Nascimento Shpakovsky - GEOGRAFIA
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Geografia' 
  AND p.email = 'michele.shpakovsky@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'michele.shpakovsky@escola.com'
  AND t.name IN ('1902')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Shelley Muniz Azanbuja Neves - HISTÓRIA
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'História' 
  AND p.email = 'shelley.neves@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'shelley.neves@escola.com'
  AND t.name IN ('1801','1802','1803','1901','1902')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Dunstana Farias de Mello - HISTÓRIA ⭐ ESTE É O PROFESSOR COM PROBLEMA!
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'História' 
  AND p.email = 'dunstana.mello@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'dunstana.mello@escola.com'
  AND t.name IN ('1601','1602','1701','1702')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Eduardo Moraes Carvalho - MATEMÁTICA
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Matemática' 
  AND p.email = 'eduardo.carvalho@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'eduardo.carvalho@escola.com'
  AND t.name IN ('1801','1802','1803','1901','1902')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Luciana Felix da Costa Santos - MATEMÁTICA
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Matemática' 
  AND p.email = 'luciana.santos@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'luciana.santos@escola.com'
  AND t.name IN ('1601','1602','1701','1702')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Cristiane Teixeira de Carvalho - PORTUGUÊS
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Língua Portuguesa' 
  AND p.email = 'cristiane.carvalho@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'cristiane.carvalho@escola.com'
  AND t.name IN ('1601','1602')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- Maria de Fátima da Silva Leal Azevedo - PORTUGUÊS
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Língua Portuguesa' 
  AND p.email = 'maria.azevedo@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'maria.azevedo@escola.com'
  AND t.name IN ('1702','1801','1802','1803','1901','1902')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- José Roberto Santana de Carvalho - PORTUGUÊS
INSERT INTO "_MateriaToProfessor" ("A", "B")
SELECT m.id, p.id
FROM "materias" m, "professores" p
WHERE m.name = 'Língua Portuguesa' 
  AND p.email = 'jose.carvalho@escola.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_MateriaToProfessor" 
    WHERE "A" = m.id AND "B" = p.id
  );

INSERT INTO "_ProfessorToTurma" ("A", "B")
SELECT p.id, t.id
FROM "professores" p, "turmas" t
WHERE p.email = 'jose.carvalho@escola.com'
  AND t.name IN ('1701')
  AND NOT EXISTS (
    SELECT 1 FROM "_ProfessorToTurma" 
    WHERE "A" = p.id AND "B" = t.id
  );

-- ============================================
-- 3. VERIFICAR RESULTADOS
-- ============================================

-- Ver quantos vínculos foram criados para cada professor
SELECT 
  p.name AS "Professor",
  p.email,
  COUNT(DISTINCT mp."A") AS "Matérias",
  COUNT(DISTINCT pt."B") AS "Turmas"
FROM "professores" p
LEFT JOIN "_MateriaToProfessor" mp ON mp."B" = p.id
LEFT JOIN "_ProfessorToTurma" pt ON pt."A" = p.id
GROUP BY p.id, p.name, p.email
ORDER BY p.name;

-- Ver especificamente o professor Dunstana
SELECT 
  'Dunstana Farias de Mello' AS "Professor",
  m.name AS "Matéria",
  t.name AS "Turma"
FROM "professores" p
LEFT JOIN "_MateriaToProfessor" mp ON mp."B" = p.id
LEFT JOIN "materias" m ON m.id = mp."A"
LEFT JOIN "_ProfessorToTurma" pt ON pt."A" = p.id
LEFT JOIN "turmas" t ON t.id = pt."B"
WHERE p.email = 'dunstana.mello@escola.com'
ORDER BY m.name, t.name;

-- Resultado esperado para Dunstana:
-- Matéria: História
-- Turmas: 1601, 1602, 1701, 1702
