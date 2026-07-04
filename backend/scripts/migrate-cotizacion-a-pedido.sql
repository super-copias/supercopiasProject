-- Migración: Cotización a Pedido
-- Fecha: 2026-07-04
-- Descripción: Agrega cotizacion_id a pos_pedidos para trazabilidad de origen.
--              Cuando un pedido se crea desde una cotización, la cotización pasa
--              a estatus 'aceptada' automáticamente dentro de la misma transacción.

BEGIN;

-- Agregar columna cotizacion_id a pos_pedidos
ALTER TABLE public.pos_pedidos
    ADD COLUMN IF NOT EXISTS cotizacion_id INTEGER
        REFERENCES public.pos_cotizaciones(id) ON DELETE SET NULL;

-- Índice parcial para consultas por cotización de origen
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_cotizacion
    ON public.pos_pedidos (cotizacion_id)
    WHERE cotizacion_id IS NOT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN public.pos_pedidos.cotizacion_id
    IS 'Referencia a la cotización de origen si el pedido fue generado desde una cotización';

COMMIT;
