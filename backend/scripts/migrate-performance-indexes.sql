-- ============================================================
-- Migración: índices de rendimiento para reducir p99
-- Fecha: 2026-06-03
-- Problema: picos de p99 > 20s por queries lentas en POS catálogo
-- ============================================================

-- 1. Índice parcial para el JOIN pos_ventas_detalle → pos_ventas
--    Usado por el CTE ventas_por_item en getCatalogo (posController).
--    Al ser parcial (solo ventas 'completada'), es mucho más pequeño y rápido.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_ventas_id_completada
  ON public.pos_ventas (id)
  WHERE estatus = 'completada';

-- 2. Índice compuesto para el reporte de ventas por período + vendedor
--    Cubre el WHERE más común: fecha_venta BETWEEN + vendedor_usuario_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_ventas_fecha_vendedor
  ON public.pos_ventas (fecha_venta DESC, vendedor_usuario_id)
  WHERE estatus = 'completada';

-- 3. Índice en inventarios para búsqueda de texto en POS (ILIKE %q%)
--    pg_trgm permite que ILIKE use el índice GIN.
--    Requiere que la extensión pg_trgm esté habilitada (viene por defecto en Railway/Render).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventarios_nombre_trgm
  ON public.inventarios USING GIN (nombre gin_trgm_ops)
  WHERE activo = true AND estatus = 'activo';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventarios_sku_trgm
  ON public.inventarios USING GIN (codigo_sku gin_trgm_ops)
  WHERE activo = true AND estatus = 'activo' AND codigo_sku IS NOT NULL;
