-- =====================================================================
-- Migración: equipos.nombre_equipo pasa a ser OBLIGATORIO (NOT NULL)
-- Idempotente y segura para producción y desarrollo.
-- Fecha: 2026-08-30
--
-- Qué hace:
--   1. Rellena los nombres faltantes (NULL o vacíos) con un valor
--      trazable "Equipo <id>" para poder aplicar la restricción.
--   2. Aplica NOT NULL a equipos.nombre_equipo solo si aún es nullable.
-- =====================================================================

BEGIN;

-- 1. Backfill de registros sin nombre (si los hubiera)
UPDATE public.equipos
   SET nombre_equipo = 'Equipo ' || id
 WHERE nombre_equipo IS NULL
    OR btrim(nombre_equipo) = '';

-- 2. Aplicar NOT NULL de forma idempotente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'equipos'
       AND column_name  = 'nombre_equipo'
       AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.equipos ALTER COLUMN nombre_equipo SET NOT NULL;
  END IF;
END $$;

COMMIT;
