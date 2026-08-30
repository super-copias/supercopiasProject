-- ============================================================
-- Migración: Horarios de Acceso — soporte de rangos nocturnos
-- Fecha: 2026-08-30
-- Descripción:
--   El constraint chk_horarios_rango (hora_fin > hora_inicio) impedía
--   configurar franjas que cruzan la medianoche (p. ej. 22:00–06:00).
--   El scheduler ya interpreta inicio > fin como "cruza la medianoche",
--   así que se reemplaza por un constraint que solo exige que las horas
--   sean distintas.
-- ============================================================

ALTER TABLE public.horarios_acceso
  DROP CONSTRAINT IF EXISTS chk_horarios_rango;

ALTER TABLE public.horarios_acceso
  DROP CONSTRAINT IF EXISTS chk_horarios_distintos;

ALTER TABLE public.horarios_acceso
  ADD CONSTRAINT chk_horarios_distintos CHECK (hora_fin <> hora_inicio);

COMMENT ON COLUMN public.horarios_acceso.hora_inicio IS
  'Inicio de la franja. Si hora_inicio > hora_fin la franja cruza la medianoche.';
