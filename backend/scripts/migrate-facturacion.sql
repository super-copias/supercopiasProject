-- ============================================================
-- MIGRACIÓN: Módulo de Facturación CFDI 4.0
-- Fecha: 2026-04-20
-- ============================================================

-- 1. Catálogo de impuestos (configurable desde BD)
CREATE TABLE IF NOT EXISTS public.cat_impuestos_facturacion (
    id                 SERIAL PRIMARY KEY,
    nombre             VARCHAR(100)  NOT NULL,
    tipo               VARCHAR(30)   NOT NULL,  -- 'iva' | 'isr_retencion'
    porcentaje         NUMERIC(6,4)  NOT NULL,  -- 0.1600 / 0.0125
    activo             BOOLEAN       DEFAULT TRUE,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_impuesto_tipo CHECK (tipo IN ('iva','isr_retencion')),
    CONSTRAINT chk_impuesto_pct  CHECK (porcentaje >= 0 AND porcentaje <= 1)
);

INSERT INTO public.cat_impuestos_facturacion (nombre, tipo, porcentaje) VALUES
  ('IVA 16%',       'iva',          0.1600),
  ('ISR Retención', 'isr_retencion',0.0125)
ON CONFLICT DO NOTHING;

-- 2. Tabla principal de facturas
CREATE TABLE IF NOT EXISTS public.facturas (
    id                   SERIAL PRIMARY KEY,
    folio                VARCHAR(25) UNIQUE NOT NULL,  -- FA-2026-00001

    -- Estatus del flujo
    estatus              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT chk_factura_estatus CHECK (
        estatus IN ('pendiente','generada','cancelada')
    ),

    -- Origen (solo uno de los tres será no-nulo)
    venta_id             INTEGER REFERENCES public.pos_ventas(id)       ON DELETE SET NULL,
    pedido_id            INTEGER REFERENCES public.pos_pedidos(id)      ON DELETE SET NULL,
    cotizacion_id        INTEGER REFERENCES public.pos_cotizaciones(id) ON DELETE SET NULL,
    tipo_origen          VARCHAR(20) NOT NULL,
    CONSTRAINT chk_factura_origen CHECK (tipo_origen IN ('venta','pedido','cotizacion')),

    -- Datos fiscales del cliente (snapshot al momento de emitir)
    cliente_id           INTEGER NOT NULL REFERENCES public.clientes(id),
    cliente_nombre       VARCHAR(500),
    cliente_rfc          VARCHAR(13),
    cliente_razon_social VARCHAR(500),
    cliente_regimen      VARCHAR(10),
    cliente_uso_cfdi     VARCHAR(10),
    cliente_cp           VARCHAR(10),

    -- Montos calculados (snapshot de tasas)
    subtotal             NUMERIC(12,2) NOT NULL,
    iva_pct              NUMERIC(6,4)  NOT NULL,
    iva_monto            NUMERIC(12,2) NOT NULL,
    isr_pct              NUMERIC(6,4)  NOT NULL,
    isr_monto            NUMERIC(12,2) NOT NULL,
    total_factura        NUMERIC(12,2) NOT NULL,  -- subtotal + iva - isr

    -- Datos SAT (se llenan al timbrar con un PAC)
    uuid_cfdi            VARCHAR(36),
    xml_cfdi             TEXT,
    pdf_url              VARCHAR(500),
    fecha_timbrado       TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    creado_por_id        INTEGER,
    creado_por_nombre    VARCHAR(255),
    notas                TEXT,
    motivo_cancelacion   TEXT,
    fecha_creacion       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_modificacion   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_venta      ON public.facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido     ON public.facturas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cotizacion ON public.facturas(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente    ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estatus    ON public.facturas(estatus);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha      ON public.facturas(fecha_creacion DESC);

-- Secuencia para folio
CREATE SEQUENCE IF NOT EXISTS public.facturas_folio_seq START WITH 1;

-- 3. Columnas en pos_ventas
ALTER TABLE public.pos_ventas
    ADD COLUMN IF NOT EXISTS requiere_factura BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS factura_id       INTEGER REFERENCES public.facturas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS iva_monto        NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isr_monto        NUMERIC(12,2) DEFAULT 0;

-- 4. Columnas en pos_cotizaciones
ALTER TABLE public.pos_cotizaciones
    ADD COLUMN IF NOT EXISTS requiere_factura BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS factura_id       INTEGER REFERENCES public.facturas(id) ON DELETE SET NULL;

-- 5. Columna factura_id en pos_pedidos (requiere_factura ya existe)
ALTER TABLE public.pos_pedidos
    ADD COLUMN IF NOT EXISTS factura_id INTEGER REFERENCES public.facturas(id) ON DELETE SET NULL;
