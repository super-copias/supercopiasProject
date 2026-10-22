-- ============================================================
-- Migración: Reportes permitidos por empleado - SuperCopias
-- Fecha: 2026-10-22
-- Descripción: Permite restringir a qué reportes del módulo de
--              Reportes tiene acceso un empleado administrador.
--              NULL = acceso a todos los reportes (por defecto).
-- ============================================================

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS reportes_permitidos JSONB DEFAULT NULL;

COMMENT ON COLUMN public.empleados.reportes_permitidos IS
  'Ids de reportes permitidos (ej. ["ventas","corte-caja"]). NULL = todos los reportes';
