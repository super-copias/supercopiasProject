-- ============================================================
-- migrate-pos-pedidos-pagos-anulado.sql
--
-- Agrega la posibilidad de anular pagos de pedido (anticipo / saldo)
-- sin borrarlos, para que:
--   * al cancelar una venta originada por un pedido, los montos
--     cobrados dejen de contar en el arqueo del corte de caja
--   * se conserve el histórico completo de movimientos
--
-- Consumido por: controllers/reportesController.js (arqueo del corte)
--                controllers/posController.js      (cancelarVenta)
--
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

BEGIN;

ALTER TABLE public.pos_pedidos_pagos
  ADD COLUMN IF NOT EXISTS anulado            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_anulacion    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS anulado_por_id     INTEGER,
  ADD COLUMN IF NOT EXISTS anulado_por_nombre VARCHAR(255),
  ADD COLUMN IF NOT EXISTS motivo_anulacion   TEXT;

COMMENT ON COLUMN public.pos_pedidos_pagos.anulado IS
  'true = el pago fue revertido (p. ej. al cancelar la venta/pedido). Los pagos anulados se conservan como histórico pero se excluyen del arqueo del corte de caja.';

-- Índice parcial: el arqueo siempre filtra por pagos NO anulados.
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_pagos_vigentes
  ON public.pos_pedidos_pagos (pedido_id, tipo)
  WHERE anulado = false;

COMMIT;
