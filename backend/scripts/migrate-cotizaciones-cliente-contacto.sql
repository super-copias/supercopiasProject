-- ============================================================
-- Migración: contacto de cliente libre y vencimiento en cotizaciones
-- Fecha: 2026-08-30
-- ============================================================
-- 1. Agrega pos_cotizaciones.cliente_telefono para guardar el
--    teléfono de contacto capturado cuando la cotización es de un
--    cliente libre (no registrado). El nombre libre ya se guarda
--    en cliente_nombre.
-- 2. Índice parcial para acelerar el barrido de expiración.
-- 3. Backfill: marca como 'vencida' las cotizaciones pendientes
--    cuya fecha_vencimiento ya pasó (mismo criterio que aplica el
--    backend al listar).
-- Idempotente: se puede ejecutar varias veces sin efectos adversos.
-- ============================================================

BEGIN;

ALTER TABLE public.pos_cotizaciones
    ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(20);

COMMENT ON COLUMN public.pos_cotizaciones.cliente_telefono
    IS 'Teléfono de contacto capturado para cliente libre (no registrado).';

CREATE INDEX IF NOT EXISTS idx_pos_cotizaciones_vencimiento
    ON public.pos_cotizaciones (fecha_vencimiento)
    WHERE estatus = 'pendiente';

-- Backfill de cotizaciones ya caducadas
UPDATE public.pos_cotizaciones
   SET estatus = 'vencida', fecha_modificacion = NOW()
 WHERE estatus = 'pendiente'
   AND fecha_vencimiento IS NOT NULL
   AND fecha_vencimiento < (now() AT TIME ZONE 'America/Mexico_City')::date;

COMMIT;
