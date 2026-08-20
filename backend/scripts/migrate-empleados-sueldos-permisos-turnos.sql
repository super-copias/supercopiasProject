-- ============================================================
-- Migración: Sueldos, Permisos y Turnos - Módulo Empleados
-- Fecha: 2026-08-18
-- Descripción:
--   1) Historial de sueldos por empleado (eliminación definitiva, no soft-delete).
--      empleados.salario se mantiene sincronizado con el registro más reciente.
--   2) Configuración global (fila única) del límite diario de permisos.
--   3) Catálogo dinámico de turnos + asignación por día de semana, en
--      reemplazo del campo fijo empleados.turno (Matutino/Vespertino).
-- Idempotente: puede ejecutarse más de una vez sin duplicar datos ni romper
-- si ya fue aplicada parcialmente.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1) SUELDOS: historial
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empleados_sueldos_historial (
    id                  SERIAL PRIMARY KEY,
    empleado_id         INTEGER NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    monto               NUMERIC(10,2) NOT NULL,
    fecha_asignacion    DATE NOT NULL,
    observaciones       TEXT,
    registrado_por      INTEGER REFERENCES public.usuarios(id),
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sueldos_historial_monto CHECK (monto > 0)
);

COMMENT ON TABLE public.empleados_sueldos_historial IS
  'Historial de sueldos asignados a cada empleado. La eliminación de un registro es definitiva (no soft-delete). empleados.salario se sincroniza siempre con el registro de fecha_asignacion más reciente.';

CREATE INDEX IF NOT EXISTS idx_sueldos_historial_empleado ON public.empleados_sueldos_historial(empleado_id);
CREATE INDEX IF NOT EXISTS idx_sueldos_historial_fecha ON public.empleados_sueldos_historial(fecha_asignacion DESC);

DROP TRIGGER IF EXISTS trg_sueldos_historial_updated_at ON public.empleados_sueldos_historial;
CREATE TRIGGER trg_sueldos_historial_updated_at
  BEFORE UPDATE ON public.empleados_sueldos_historial
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

DROP TRIGGER IF EXISTS trg_sueldos_historial_auditoria ON public.empleados_sueldos_historial;
CREATE TRIGGER trg_sueldos_historial_auditoria
  AFTER INSERT OR DELETE OR UPDATE ON public.empleados_sueldos_historial
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- Semilla: un registro inicial por empleado con su salario actual (solo si aún no tiene historial)
INSERT INTO public.empleados_sueldos_historial (empleado_id, monto, fecha_asignacion, observaciones)
SELECT e.id, e.salario, COALESCE(e.fecha_ingreso, CURRENT_DATE), 'Migración inicial de historial de sueldos'
FROM public.empleados e
WHERE e.salario IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.empleados_sueldos_historial h WHERE h.empleado_id = e.id
  );

-- ------------------------------------------------------------
-- 2) PERMISOS: configuración global de límite diario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.config_permisos (
    id                  SMALLINT PRIMARY KEY DEFAULT 1,
    limite_diario       INTEGER NOT NULL DEFAULT 2,
    fecha_modificacion  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_por      INTEGER REFERENCES public.usuarios(id),
    CONSTRAINT chk_config_permisos_limite CHECK (limite_diario > 0),
    CONSTRAINT chk_config_permisos_singleton CHECK (id = 1)
);

COMMENT ON TABLE public.config_permisos IS
  'Configuración global (fila única, id=1) del límite diario de permisos permitidos entre todos los empleados. Es informativo: al superarse se permite el registro y solo se emite una advertencia.';

INSERT INTO public.config_permisos (id, limite_diario)
VALUES (1, 2)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3) TURNOS: catálogo dinámico + asignación por día de semana
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turnos (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL,
    hora_entrada        TIME NOT NULL,
    hora_salida         TIME NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_turnos_nombre UNIQUE (nombre)
);

COMMENT ON TABLE public.turnos IS 'Catálogo de turnos definidos por el usuario (nombre + horario de entrada/salida).';

DROP TRIGGER IF EXISTS trg_turnos_updated_at ON public.turnos;
CREATE TRIGGER trg_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TABLE IF NOT EXISTS public.empleados_turnos_dias (
    id                  SERIAL PRIMARY KEY,
    empleado_id         INTEGER NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    dia_semana          SMALLINT NOT NULL,
    turno_id            INTEGER NOT NULL REFERENCES public.turnos(id),
    fecha_modificacion  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_empleados_turnos_dias_rango CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT uq_empleados_turnos_dias UNIQUE (empleado_id, dia_semana)
);

COMMENT ON TABLE public.empleados_turnos_dias IS 'Turno vigente asignado a cada empleado por día de la semana. La ausencia de registro para un día implica que el empleado no tiene turno asignado ese día (descanso).';
COMMENT ON COLUMN public.empleados_turnos_dias.dia_semana IS '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo';

CREATE INDEX IF NOT EXISTS idx_empleados_turnos_dias_empleado ON public.empleados_turnos_dias(empleado_id);

CREATE TABLE IF NOT EXISTS public.empleados_turnos_historial (
    id                  SERIAL PRIMARY KEY,
    empleado_id         INTEGER NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    dia_semana          SMALLINT NOT NULL,
    turno_id            INTEGER REFERENCES public.turnos(id),
    turno_nombre        VARCHAR(50),
    accion              VARCHAR(20) NOT NULL,
    usuario_id          INTEGER REFERENCES public.usuarios(id),
    usuario_nombre      VARCHAR(255),
    fecha_cambio        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_empleados_turnos_historial_rango CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_empleados_turnos_historial_accion CHECK (accion IN ('asignado','modificado','eliminado','migracion_inicial'))
);

COMMENT ON TABLE public.empleados_turnos_historial IS 'Histórico de cambios de turno por empleado y día de la semana (auditoría de negocio).';

CREATE INDEX IF NOT EXISTS idx_empleados_turnos_historial_empleado ON public.empleados_turnos_historial(empleado_id);
CREATE INDEX IF NOT EXISTS idx_empleados_turnos_historial_fecha ON public.empleados_turnos_historial(fecha_cambio DESC);

-- Semilla de turnos por defecto, equivalentes a los valores previos (Matutino/Vespertino)
INSERT INTO public.turnos (nombre, hora_entrada, hora_salida)
VALUES ('Matutino', '08:00', '16:00'), ('Vespertino', '14:00', '22:00')
ON CONFLICT (nombre) DO NOTHING;

-- Migrar el turno fijo de cada empleado a los 7 días de la semana y eliminar la
-- columna vieja (solo si todavía existe, para poder re-ejecutar sin error).
DO $$
DECLARE
  v_matutino_id INTEGER;
  v_vespertino_id INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'empleados' AND column_name = 'turno'
  ) THEN
    SELECT id INTO v_matutino_id FROM public.turnos WHERE nombre = 'Matutino';
    SELECT id INTO v_vespertino_id FROM public.turnos WHERE nombre = 'Vespertino';

    INSERT INTO public.empleados_turnos_dias (empleado_id, dia_semana, turno_id)
    SELECT e.id, dia.n,
           CASE e.turno WHEN 'Matutino' THEN v_matutino_id ELSE v_vespertino_id END
    FROM public.empleados e
    CROSS JOIN generate_series(1, 7) AS dia(n)
    WHERE e.turno IS NOT NULL
    ON CONFLICT (empleado_id, dia_semana) DO NOTHING;

    INSERT INTO public.empleados_turnos_historial (empleado_id, dia_semana, turno_id, turno_nombre, accion)
    SELECT e.id, dia.n,
           CASE e.turno WHEN 'Matutino' THEN v_matutino_id ELSE v_vespertino_id END,
           e.turno,
           'migracion_inicial'
    FROM public.empleados e
    CROSS JOIN generate_series(1, 7) AS dia(n)
    WHERE e.turno IS NOT NULL;

    ALTER TABLE public.empleados DROP CONSTRAINT IF EXISTS empleados_turno_check;
    ALTER TABLE public.empleados DROP COLUMN turno;
  END IF;
END $$;

COMMIT;
