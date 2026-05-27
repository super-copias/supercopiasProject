-- ============================================================
-- Migración: desglose fiscal en cotizaciones y ventas
-- Fecha: 2026-05-27
-- ============================================================
-- Agrega iva_monto, isr_monto y tipo_persona_factura a
-- pos_cotizaciones para que el ticket muestre el detalle
-- correcto cuando la cotización requiere factura.
-- También agrega tipo_persona_factura a pos_ventas.
-- ============================================================

BEGIN;

ALTER TABLE pos_cotizaciones
  ADD COLUMN IF NOT EXISTS iva_monto            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS isr_monto            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_persona_factura VARCHAR(2)    NOT NULL DEFAULT 'pm';

ALTER TABLE pos_ventas
  ADD COLUMN IF NOT EXISTS tipo_persona_factura VARCHAR(2) NOT NULL DEFAULT 'pm';

COMMENT ON COLUMN pos_cotizaciones.iva_monto
  IS 'Monto IVA (16 %) calculado sobre la base imponible. 0 si no requiere factura.';
COMMENT ON COLUMN pos_cotizaciones.isr_monto
  IS 'Monto retención ISR (1.25 %). 0 para PF o si no requiere factura.';
COMMENT ON COLUMN pos_cotizaciones.tipo_persona_factura
  IS 'Tipo de persona para facturación: pf = Persona Física, pm = Persona Moral.';
COMMENT ON COLUMN pos_ventas.tipo_persona_factura
  IS 'Tipo de persona para facturación: pf = Persona Física, pm = Persona Moral.';

COMMIT;
