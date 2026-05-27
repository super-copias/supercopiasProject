-- =====================================================================
-- Migración: Origen de Venta en POS
-- Fecha: 2026-05-26
-- Descripción:
--   Agrega la columna `origen_venta` a la tabla `pos_ventas` para
--   distinguir si una venta fue generada directamente (venta rápida),
--   desde un pedido, o desde una cotización.
--
--   Valores posibles:
--     'directa'    → Venta rápida registrada en el POS
--     'pedido'     → Generada al finalizar un pedido (pos_pedidos)
--     'cotizacion' → Generada al cobrar una cotización (pos_cotizaciones)
--
--   Los datos históricos se retroalimentan usando las relaciones inversas
--   ya existentes en pos_pedidos.venta_id y pos_cotizaciones.venta_id.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Agregar columna con valor por defecto 'directa'
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.pos_ventas
  ADD COLUMN IF NOT EXISTS origen_venta VARCHAR(15)
    NOT NULL DEFAULT 'directa'
    CONSTRAINT chk_pos_ventas_origen
      CHECK (origen_venta IN ('directa', 'pedido', 'cotizacion'));

COMMENT ON COLUMN public.pos_ventas.origen_venta IS
  'Origen de la venta: directa (venta rápida POS), pedido (desde pos_pedidos), cotizacion (desde pos_cotizaciones)';

-- ─────────────────────────────────────────────────────────────
-- 2. Retroalimentar datos históricos: ventas generadas por pedidos
-- ─────────────────────────────────────────────────────────────
UPDATE public.pos_ventas
  SET origen_venta = 'pedido'
  WHERE id IN (
    SELECT venta_id FROM public.pos_pedidos
    WHERE venta_id IS NOT NULL
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Retroalimentar datos históricos: ventas generadas por cotizaciones
-- ─────────────────────────────────────────────────────────────
UPDATE public.pos_ventas
  SET origen_venta = 'cotizacion'
  WHERE id IN (
    SELECT venta_id FROM public.pos_cotizaciones
    WHERE venta_id IS NOT NULL
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Índice para filtrado por origen (opcional, bajo cardinalidad
--    pero útil para reportes y filtros del historial)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pos_ventas_origen
  ON public.pos_ventas (origen_venta);

-- ─────────────────────────────────────────────────────────────
-- 5. Verificación: resumen de ventas clasificadas
-- ─────────────────────────────────────────────────────────────
SELECT
  origen_venta,
  COUNT(*) AS total_ventas
FROM public.pos_ventas
GROUP BY origen_venta
ORDER BY origen_venta;

COMMIT;
