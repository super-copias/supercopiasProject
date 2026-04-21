-- ============================================================
-- Migración: Horarios de Acceso - SuperCopias
-- Fecha: 2026-04-13
-- Descripción: Crea la tabla horarios_acceso para controlar
--              automáticamente el acceso de los empleados
--              al sistema según franjas horarias.
-- ============================================================

-- Tabla principal de horarios de acceso
CREATE TABLE IF NOT EXISTS public.horarios_acceso (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    hora_inicio TIME         NOT NULL,
    hora_fin    TIME         NOT NULL,
    activo      BOOLEAN      DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horarios_rango CHECK (hora_fin > hora_inicio)
);

COMMENT ON TABLE public.horarios_acceso IS
  'Franjas horarias que controlan el acceso automático de empleados al sistema';

-- Insertar el horario por defecto (6:40 am – 9:30 pm)
INSERT INTO public.horarios_acceso (nombre, hora_inicio, hora_fin, activo)
VALUES ('Horario laboral', '06:40', '21:30', true)
ON CONFLICT DO NOTHING;
