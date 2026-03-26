-- ============================================================
-- Migración: Tabulador de precios por volumen
-- Fecha: 2026-03-24
-- Descripción:
--   1. Agrega columna tabulador_activo a inventarios
--   2. Crea tabla inv_tabulador_precios
--   3. Agrega columna tabulador_aplicado a pos_ventas_detalle
-- ============================================================

-- 1. Nueva columna en la tabla principal
ALTER TABLE public.inventarios
    ADD COLUMN IF NOT EXISTS tabulador_activo BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabla de filas del tabulador
CREATE TABLE IF NOT EXISTS public.inv_tabulador_precios (
    id              SERIAL PRIMARY KEY,
    inventario_id   INTEGER NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
    cantidad_desde  NUMERIC(12,2) NOT NULL,
    precio          NUMERIC(12,4) NOT NULL,
    orden           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tabulador_cantidad_positiva CHECK (cantidad_desde > 0),
    CONSTRAINT chk_tabulador_precio_positivo   CHECK (precio > 0),
    CONSTRAINT inv_tabulador_precios_inventario_cantidad_key UNIQUE (inventario_id, cantidad_desde)
);

COMMENT ON TABLE public.inv_tabulador_precios
    IS 'Tabulador de precios por volumen para artículos del inventario. '
       'Cada fila define un precio a partir de cierta cantidad.';

-- Índice para consultas rápidas por artículo
CREATE INDEX IF NOT EXISTS idx_tabulador_inventario_id
    ON public.inv_tabulador_precios (inventario_id, cantidad_desde ASC);

-- 3. Columna para marcar si se aplicó tabulador en cada línea de venta
ALTER TABLE public.pos_ventas_detalle
    ADD COLUMN IF NOT EXISTS tabulador_aplicado BOOLEAN NOT NULL DEFAULT FALSE;
