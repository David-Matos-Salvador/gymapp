-- Catálogo de ejercicios en español (#165) y rutinas generadas sin «3d» ni descripción que
-- repite el nombre (#188). Solo cambia textos: no borra filas. Si ya existe una fila con el
-- nombre nuevo, la vieja se deja como está para no chocar con las claves únicas.

-- 1. Ejercicios del catálogo. «Burpees» se queda: así se dice en los gimnasios.
UPDATE "Exercise" e
SET "name" = t.nuevo
FROM (VALUES
  ('Hip thrust', 'Empuje de cadera'),
  ('Kettlebell swing', 'Balanceo con pesa rusa'),
  ('Face Pull', 'Jalón a la cara'),
  ('Crunch', 'Abdominales'),
  ('Crunches en máquina', 'Abdominales en máquina'),
  ('Russian Twist', 'Giro ruso'),
  ('Clean and Press', 'Cargada y press'),
  ('Thrusters', 'Sentadilla con press'),
  ('Battle ropes', 'Cuerdas de batalla'),
  ('Mountain climbers', 'Escaladores')
) AS t(viejo, nuevo)
WHERE e."name" = t.viejo
  AND NOT EXISTS (SELECT 1 FROM "Exercise" x WHERE x."name" = t.nuevo);

UPDATE "Exercise"
SET "description" = 'Cuerpo completo + cardio.'
WHERE "description" = 'Full body + cardio.';

-- El historial guarda el nombre del ejercicio: se actualiza para que coincida con el catálogo.
UPDATE "WorkoutSetLog" l
SET "exerciseName" = t.nuevo
FROM (VALUES
  ('Hip thrust', 'Empuje de cadera'),
  ('Kettlebell swing', 'Balanceo con pesa rusa'),
  ('Face Pull', 'Jalón a la cara'),
  ('Crunch', 'Abdominales'),
  ('Crunches en máquina', 'Abdominales en máquina'),
  ('Russian Twist', 'Giro ruso'),
  ('Clean and Press', 'Cargada y press'),
  ('Thrusters', 'Sentadilla con press'),
  ('Battle ropes', 'Cuerdas de batalla'),
  ('Mountain climbers', 'Escaladores')
) AS t(viejo, nuevo)
WHERE l."exerciseName" = t.viejo;

-- 2. Rutinas generadas en el onboarding (del súper admin, terminan en «· 3d»):
--    «Full Body · Ganancia muscular · 3d» → «Cuerpo completo · Ganar masa muscular · 3 días».
--    El nombre es la clave con la que se reutilizan, así que se renombran en vez de duplicarse.
WITH generadas AS (
  SELECT
    p."id",
    p."userId",
    regexp_replace(
      replace(replace(replace(replace(replace(p."name",
        'Full Body', 'Cuerpo completo'),
        'Hombros+Abs', 'Hombros+Abdomen'),
        ' · Quema de grasa · ', ' · Perder peso · '),
        ' · Ganancia muscular · ', ' · Ganar masa muscular · '),
        ' · Acondicionamiento general · ', ' · Mejorar forma física · '),
      ' · ([345])d$', ' · \1 días') AS nuevo
  FROM "RoutinePlan" p
  JOIN "User" u ON u."id" = p."userId"
  WHERE u."role" = 'SUPER_ADMIN' AND p."name" ~ ' · [345]d$'
)
UPDATE "RoutinePlan" p
SET "name" = g.nuevo, "description" = NULL
FROM generadas g
WHERE p."id" = g."id"
  AND NOT EXISTS (
    SELECT 1 FROM "RoutinePlan" x WHERE x."userId" = g."userId" AND x."name" = g.nuevo
  );

-- 3. Plantillas del súper admin que venían del seed con nombres en inglés.
UPDATE "RoutinePlan" p
SET "name" = t.nuevo
FROM (VALUES
  ('Hipertrofia Push-Pull-Legs', 'Hipertrofia Empuje-Tracción-Piernas'),
  ('Upper/Lower Split — Hipertrofia', 'Superior / Inferior — Hipertrofia'),
  ('Weider Split — Arnold Clásico', 'Weider — Arnold clásico')
) AS t(viejo, nuevo), "User" u
WHERE p."name" = t.viejo
  AND u."id" = p."userId" AND u."role" = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "RoutinePlan" x WHERE x."userId" = p."userId" AND x."name" = t.nuevo
  );

-- 4. Días de esas rutinas («Full Body - A», «Push (Empuje)», «Upper A — Empuje»…).
UPDATE "RoutineSplit" s
SET "name" =
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(s."name",
    'Full Body Cardio', 'Cuerpo completo + cardio'),
    'Full Body', 'Cuerpo completo'),
    'Hombros+Abs', 'Hombros+Abdomen'),
    'Push (Empuje)', 'Empuje'),
    'Pull (Tracción)', 'Tracción'),
    'Legs (Piernas)', 'Piernas'),
    'Upper A', 'Superior A'),
    'Upper B', 'Superior B'),
    'Lower A', 'Inferior A'),
    'Lower B', 'Inferior B')
FROM "RoutinePlan" p, "User" u
WHERE s."planId" = p."id"
  AND u."id" = p."userId" AND u."role" = 'SUPER_ADMIN'
  AND s."name" ~ '(Full Body|Hombros\+Abs|Push \(Empuje\)|Pull \(Tracción\)|Legs \(Piernas\)|Upper [AB]|Lower [AB])';
