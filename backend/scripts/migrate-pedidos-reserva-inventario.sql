-- =====================================================================
-- Migración: Reserva de inventario en Pedidos
-- Fecha: 2026-06-01
-- Descripción:
--   Implementa el flujo de "apartado" de productos físicos al crear un
--   pedido, y la liberación de ese stock al cancelarlo.
--
--   Cambios estructurales:
--     1. Amplía el CHECK constraint chk_movimientos_concepto en
--        inventarios_movimientos para aceptar dos nuevos valores:
--          'apartado_pedido'    → descuento de stock al crear el pedido
--          'liberacion_apartado' → restitución de stock al cancelarlo
--
--     2. Agrega la columna pedido_id a inventarios_movimientos para
--        rastrear qué pedido originó cada movimiento de apartado.
--
--   Flujo resultante:
--     Crear pedido   → existencia_actual -= cantidad  (apartado_pedido)
--     Tomar pedido   → sin cambio en stock
--     Terminar pedido → sin cambio en stock
--     Entregar pedido → sin cambio en stock (ya descontado al crear)
--                       solo se registra movimiento de auditoría 'venta'
--     Cancelar pedido → existencia_actual += cantidad (liberacion_apartado)
--
--   Idempotente: puede ejecutarse más de una vez sin error.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Ampliar el CHECK constraint de concepto en inventarios_movimientos
-- ─────────────────────────────────────────────────────────────────────

-- Eliminar el constraint existente (si existe con el nombre esperado)
ALTER TABLE public.inventarios_movimientos
  DROP CONSTRAINT IF EXISTS chk_movimientos_concepto;

-- Agregar el constraint ampliado con los dos nuevos conceptos
ALTER TABLE public.inventarios_movimientos
  ADD CONSTRAINT chk_movimientos_concepto CHECK (
    concepto IN (
      'compra',
      'devolucion',
      'ajuste_entrada',
      'venta',
      'uso_operativo',
      'servicio_tecnico',
      'merma',
      'ajuste_salida',
      'transferencia',
      'apartado_pedido',       -- NUEVO: reserva al crear un pedido
      'liberacion_apartado'    -- NUEVO: restauración al cancelar un pedido
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 2. Agregar columna pedido_id para trazabilidad (nullable, idempotente)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.inventarios_movimientos
  ADD COLUMN IF NOT EXISTS pedido_id INTEGER
    REFERENCES public.pos_pedidos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventarios_movimientos.pedido_id IS
  'Referencia al pedido que originó el movimiento (aplica para apartado_pedido y liberacion_apartado)';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Índice para búsquedas por pedido
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inv_movimientos_pedido
  ON public.inventarios_movimientos (pedido_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Verificación final
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_col_exists   BOOLEAN;
  v_check_exists BOOLEAN;
BEGIN
  -- Verificar columna pedido_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'inventarios_movimientos'
      AND column_name  = 'pedido_id'
  ) INTO v_col_exists;

  -- Verificar constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'inventarios_movimientos'
      AND constraint_name = 'chk_movimientos_concepto'
      AND constraint_type = 'CHECK'
  ) INTO v_check_exists;

  IF NOT v_col_exists THEN
    RAISE EXCEPTION 'ERROR: La columna pedido_id no fue creada correctamente.';
  END IF;

  IF NOT v_check_exists THEN
    RAISE EXCEPTION 'ERROR: El constraint chk_movimientos_concepto no fue creado correctamente.';
  END IF;

  RAISE NOTICE 'OK: columna pedido_id existe = %', v_col_exists;
  RAISE NOTICE 'OK: constraint chk_movimientos_concepto existe = %', v_check_exists;
  RAISE NOTICE 'Migración migrate-pedidos-reserva-inventario completada exitosamente.';
END;
$$;

COMMIT;
