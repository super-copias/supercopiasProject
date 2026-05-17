-- ============================================================
-- migrate-metodos-pago-multiple.sql
-- Agrega soporte para hasta 2 métodos de pago por transacción.
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

-- ─── 1. pos_ventas_pagos ─────────────────────────────────────
-- Registra cada método de pago de una venta POS (máx. 2).
-- Los campos metodo_pago_codigo/monto_recibido/cambio de
-- pos_ventas se conservan para backward-compat (primer método).
CREATE TABLE IF NOT EXISTS public.pos_ventas_pagos (
    id                      SERIAL PRIMARY KEY,
    venta_id                INTEGER NOT NULL REFERENCES public.pos_ventas(id) ON DELETE CASCADE,
    orden                   SMALLINT NOT NULL DEFAULT 1,
    metodo_pago_codigo      VARCHAR(30) NOT NULL
        CHECK (metodo_pago_codigo IN ('efectivo','tarjeta_debito','tarjeta_credito','transferencia')),
    metodo_pago_descripcion VARCHAR(100),
    monto                   NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    monto_recibido          NUMERIC(12,2),   -- solo para efectivo
    cambio                  NUMERIC(12,2)    DEFAULT 0,
    CONSTRAINT chk_pvp_orden CHECK (orden IN (1,2))
);

CREATE INDEX IF NOT EXISTS idx_pos_ventas_pagos_venta
    ON public.pos_ventas_pagos(venta_id);

COMMENT ON TABLE public.pos_ventas_pagos IS
    'Métodos de pago por venta POS. Máximo 2 pagos por transacción.';
COMMENT ON COLUMN public.pos_ventas_pagos.orden IS
    '1 = método principal, 2 = método secundario opcional';

-- ─── 2. pos_pedidos_pagos ────────────────────────────────────
-- Registra métodos de pago del anticipo y del saldo de un pedido.
-- Los campos metodo_pago_anticipo/metodo_pago_saldo de pos_pedidos
-- se conservan para backward-compat (primer método de cada fase).
CREATE TABLE IF NOT EXISTS public.pos_pedidos_pagos (
    id                      SERIAL PRIMARY KEY,
    pedido_id               INTEGER NOT NULL REFERENCES public.pos_pedidos(id) ON DELETE CASCADE,
    tipo                    VARCHAR(10) NOT NULL CHECK (tipo IN ('anticipo','saldo')),
    orden                   SMALLINT NOT NULL DEFAULT 1,
    metodo_pago_codigo      VARCHAR(30) NOT NULL
        CHECK (metodo_pago_codigo IN ('efectivo','tarjeta_debito','tarjeta_credito','transferencia')),
    metodo_pago_descripcion VARCHAR(100),
    monto                   NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    monto_recibido          NUMERIC(12,2),   -- solo para efectivo
    cambio                  NUMERIC(12,2)    DEFAULT 0,
    CONSTRAINT chk_ppp_orden CHECK (orden IN (1,2))
);

CREATE INDEX IF NOT EXISTS idx_pos_pedidos_pagos_pedido
    ON public.pos_pedidos_pagos(pedido_id);

COMMENT ON TABLE public.pos_pedidos_pagos IS
    'Métodos de pago por pedido (anticipo y saldo). Máximo 2 métodos por fase.';
COMMENT ON COLUMN public.pos_pedidos_pagos.tipo IS
    'anticipo = pago inicial al crear pedido, saldo = pago al entregar';
