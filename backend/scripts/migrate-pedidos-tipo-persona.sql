-- Migración: agregar tipo_persona_factura a pos_pedidos
-- Ejecutar una sola vez en cada entorno (usa IF NOT EXISTS, es idempotente)
BEGIN;

ALTER TABLE pos_pedidos
  ADD COLUMN IF NOT EXISTS tipo_persona_factura VARCHAR(2) NOT NULL DEFAULT 'pm';

COMMIT;
