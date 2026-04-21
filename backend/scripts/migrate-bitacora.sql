-- =====================================================================
-- Migración: Rediseño Bitácora / Auditoría
-- Fecha: 2026-04-20
-- Descripción:
--   1. Amplía tabla `auditoria` con campos usuario_nombre, modulo, accion
--      y cambia registro_id a varchar para folios no-enteros
--   2. Actualiza la función trigger para usar el nuevo tipo
--   3. Agrega triggers de auditoría a tablas faltantes: inventarios,
--      pos_ventas, equipos, facturas, pos_clientes_puntos
--   4. Crea tabla `bitacora_negocio` para eventos semánticos desde backend
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Ampliar tabla auditoria
-- ─────────────────────────────────────────────────────────────

-- Cambiar registro_id de integer a varchar(50) para soportar folios
ALTER TABLE auditoria
  ALTER COLUMN registro_id TYPE varchar(50)
    USING registro_id::text;

-- Nuevos campos contextuales
ALTER TABLE auditoria
  ADD COLUMN IF NOT EXISTS usuario_nombre  varchar(255),
  ADD COLUMN IF NOT EXISTS modulo          varchar(50),
  ADD COLUMN IF NOT EXISTS accion          varchar(100);

COMMENT ON COLUMN auditoria.usuario_nombre IS 'Nombre legible del usuario que generó el cambio (si aplica)';
COMMENT ON COLUMN auditoria.modulo         IS 'Módulo del sistema: clientes, empleados, inventarios, pos, equipos...';
COMMENT ON COLUMN auditoria.accion         IS 'Descripción semántica de la acción, ej. CANCELAR_VENTA';

-- ─────────────────────────────────────────────────────────────
-- 2. Actualizar función trigger para compatibilidad con nuevo tipo
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_auditoria()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores, modulo)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id::varchar, row_to_json(OLD), TG_TABLE_NAME);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores, datos_nuevos, modulo)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::varchar, row_to_json(OLD), row_to_json(NEW), TG_TABLE_NAME);
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, datos_nuevos, modulo)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::varchar, row_to_json(NEW), TG_TABLE_NAME);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Agregar triggers de auditoría a tablas sin cobertura
-- ─────────────────────────────────────────────────────────────

-- inventarios
DROP TRIGGER IF EXISTS trg_inventarios_auditoria ON inventarios;
CREATE TRIGGER trg_inventarios_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON inventarios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- pos_ventas (cambios de estatus: cancelaciones, devoluciones)
DROP TRIGGER IF EXISTS trg_pos_ventas_auditoria ON pos_ventas;
CREATE TRIGGER trg_pos_ventas_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON pos_ventas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- equipos
DROP TRIGGER IF EXISTS trg_equipos_auditoria ON equipos;
CREATE TRIGGER trg_equipos_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON equipos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- facturas
DROP TRIGGER IF EXISTS trg_facturas_auditoria ON facturas;
CREATE TRIGGER trg_facturas_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON facturas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- pos_clientes_puntos (cambios de nivel, ajustes de puntos)
DROP TRIGGER IF EXISTS trg_pos_clientes_puntos_auditoria ON pos_clientes_puntos;
CREATE TRIGGER trg_pos_clientes_puntos_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON pos_clientes_puntos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- ─────────────────────────────────────────────────────────────
-- 4. Crear tabla bitacora_negocio
--    Registrada desde el backend con contexto semántico rico
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bitacora_negocio (
  id              serial        NOT NULL,
  fecha           timestamptz   NOT NULL DEFAULT NOW(),
  modulo          varchar(50)   NOT NULL,
  accion          varchar(100)  NOT NULL,
  entidad         varchar(100),
  entidad_id      varchar(50),
  usuario_id      integer,
  usuario_nombre  varchar(255),
  ip_address      varchar(45),
  detalle         jsonb,
  resultado       varchar(20)   NOT NULL DEFAULT 'exito',
  CONSTRAINT bitacora_negocio_pkey PRIMARY KEY (id),
  CONSTRAINT chk_bitacora_resultado CHECK (resultado IN ('exito','error','bloqueado'))
);

COMMENT ON TABLE  public.bitacora_negocio IS 'Eventos de negocio registrados desde el backend con contexto semántico';
COMMENT ON COLUMN public.bitacora_negocio.modulo        IS 'Módulo origen: pos, pedidos, inventarios, auth, equipos...';
COMMENT ON COLUMN public.bitacora_negocio.accion        IS 'Código de acción: VENTA_COMPLETADA, LOGIN_EXITOSO, AJUSTE_STOCK...';
COMMENT ON COLUMN public.bitacora_negocio.entidad       IS 'Nombre de la tabla/entidad afectada';
COMMENT ON COLUMN public.bitacora_negocio.entidad_id    IS 'ID o folio del registro afectado';
COMMENT ON COLUMN public.bitacora_negocio.detalle       IS 'JSON con contexto específico del evento';
COMMENT ON COLUMN public.bitacora_negocio.resultado     IS 'exito | error | bloqueado';

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha     ON public.bitacora_negocio (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo    ON public.bitacora_negocio (modulo);
CREATE INDEX IF NOT EXISTS idx_bitacora_accion    ON public.bitacora_negocio (accion);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario   ON public.bitacora_negocio (usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad   ON public.bitacora_negocio (entidad, entidad_id);

-- Índice compuesto para búsquedas de auditoría (módulo + rango de fechas)
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo_fecha ON public.bitacora_negocio (modulo, fecha DESC);

COMMIT;
