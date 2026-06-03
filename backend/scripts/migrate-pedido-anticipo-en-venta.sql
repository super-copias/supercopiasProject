-- Migración: agregar columnas de anticipo del pedido en pos_ventas
-- Permite mostrar el anticipo como línea de pago en el ticket de venta
ALTER TABLE pos_ventas
  ADD COLUMN IF NOT EXISTS pedido_anticipo_monto  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pedido_anticipo_metodo VARCHAR(100);
