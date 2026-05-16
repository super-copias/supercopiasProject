-- ============================================================
-- MIGRACIÓN: Tipo de persona en facturación
-- Fecha: 2026-05-16
-- Descripción:
--   Agrega la columna tipo_persona a la tabla facturas para
--   distinguir si la factura aplica a:
--     'pf'  → Persona Física (solo IVA, sin ISR retención)
--     'pm'  → Persona Moral o Persona Física con Actividad Empresarial
--              (IVA + ISR retención)
-- ============================================================

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(4) NOT NULL DEFAULT 'pm'
  CONSTRAINT chk_factura_tipo_persona CHECK (tipo_persona IN ('pf', 'pm'));

COMMENT ON COLUMN public.facturas.tipo_persona IS
  'pf = Persona Física (solo IVA). pm = Persona Moral / PFAE (IVA + ISR retención).';
