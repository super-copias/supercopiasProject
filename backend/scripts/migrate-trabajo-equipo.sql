-- =====================================================================
-- Migración: Funcionalidad "Trabajo en Equipo" en entrega de pedidos
-- Idempotente: usa IF NOT EXISTS / DO $$ en todos los DDL
-- Aplica en: producción y desarrollo
-- Fecha: 2026-08-23
-- =====================================================================

BEGIN;

-- 1. Agregar columna es_trabajo_equipo a pos_ventas
ALTER TABLE pos_ventas
    ADD COLUMN IF NOT EXISTS es_trabajo_equipo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN pos_ventas.es_trabajo_equipo IS
    'true cuando la venta se atribuye a "Trabajo en equipo"; en ese caso vendedor_nombre = ''Trabajo en equipo'' y vendedor_usuario_id apunta al admin maestro.';

-- 2. Agregar columna es_trabajo_equipo a pos_pedidos
ALTER TABLE pos_pedidos
    ADD COLUMN IF NOT EXISTS es_trabajo_equipo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN pos_pedidos.es_trabajo_equipo IS
    'true cuando el pedido se marcó como "Trabajo en equipo" al terminar. Al entregar, la venta hereda este valor.';

-- 3. Crear tabla de participantes del trabajo en equipo
CREATE TABLE IF NOT EXISTS pos_pedidos_trabajo_equipo (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER NOT NULL REFERENCES pos_pedidos(id) ON DELETE CASCADE,
    venta_id        INTEGER REFERENCES pos_ventas(id) ON DELETE SET NULL,
    empleado_id     INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
    empleado_nombre VARCHAR(255) NOT NULL,
    comentario      TEXT,
    fecha_registro  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pos_pedidos_trabajo_equipo IS
    'Empleados participantes cuando un pedido se entrega bajo la modalidad "Trabajo en equipo".';

COMMENT ON COLUMN pos_pedidos_trabajo_equipo.empleado_id IS
    'Referencia al empleado; NULL si fue eliminado del catálogo.';

COMMENT ON COLUMN pos_pedidos_trabajo_equipo.comentario IS
    'Contribución o rol específico del empleado en ese pedido.';

-- 3. Índices (idempotentes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_trabajo_equipo_pedido'
    ) THEN
        CREATE INDEX idx_trabajo_equipo_pedido
            ON pos_pedidos_trabajo_equipo(pedido_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_trabajo_equipo_venta'
    ) THEN
        CREATE INDEX idx_trabajo_equipo_venta
            ON pos_pedidos_trabajo_equipo(venta_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pos_ventas_trabajo_equipo'
    ) THEN
        CREATE INDEX idx_pos_ventas_trabajo_equipo
            ON pos_ventas(es_trabajo_equipo)
            WHERE es_trabajo_equipo = TRUE;
    END IF;
END
$$;

COMMIT;
