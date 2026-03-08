-- =============================================================
-- MIGRACIÓN: Rediseño módulo Inventarios v2
-- Fecha: 2026-03-07
-- Descripción:
--   - Crea tabla inv_departamentos (reemplaza inventarios_categorias)
--   - Agrega columnas a inventarios: departamento_id, es_servicio,
--     disponible_en_pos, descripcion
--   - Migra categorías existentes a departamentos
--   - Vincula artículos existentes a sus nuevos departamentos
--   - Elimina tablas obsoletas: inventarios_caracteristicas,
--     inventarios_categorias, inventarios_reglas_stock
-- =============================================================

BEGIN;

-- ============================================================
-- 1. CREAR TABLA inv_departamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inv_departamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#6c757d',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_inv_departamentos_nombre UNIQUE (nombre)
);

COMMENT ON TABLE public.inv_departamentos IS 'Departamentos de inventario definidos por el usuario (Papel, Arillos, Servicios, etc.)';
COMMENT ON COLUMN public.inv_departamentos.color IS 'Color hexadecimal para identificación visual del departamento';

-- ============================================================
-- 2. AGREGAR COLUMNAS A inventarios
-- ============================================================
ALTER TABLE public.inventarios
    ADD COLUMN IF NOT EXISTS departamento_id INTEGER,
    ADD COLUMN IF NOT EXISTS es_servicio BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS disponible_en_pos BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ============================================================
-- 3. MIGRAR categorías existentes → departamentos
--    Toma nombre, descripcion y orden tal como están
-- ============================================================
INSERT INTO public.inv_departamentos (nombre, descripcion, orden, activo)
SELECT nombre, descripcion, orden, activo
FROM public.inventarios_categorias
WHERE activo = true
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 4. VINCULAR artículos existentes → departamentos
--    Usando el campo "categoria" como puente
-- ============================================================
UPDATE public.inventarios i
SET departamento_id = d.id
FROM public.inv_departamentos d
WHERE i.categoria = d.nombre;

-- Artículos sin departamento asignado: crear departamento "General"
INSERT INTO public.inv_departamentos (nombre, descripcion, orden)
SELECT 'General', 'Departamento sin categoría previa', 999
WHERE EXISTS (
    SELECT 1 FROM public.inventarios WHERE departamento_id IS NULL AND activo = true
)
ON CONFLICT (nombre) DO NOTHING;

UPDATE public.inventarios
SET departamento_id = (SELECT id FROM public.inv_departamentos WHERE nombre = 'General')
WHERE departamento_id IS NULL AND activo = true;

-- ============================================================
-- 5. ESTABLECER disponible_en_pos y es_servicio
--    Regla: venta → disponible en POS; insumo/generico → no
-- ============================================================
UPDATE public.inventarios
SET
    es_servicio = false,
    disponible_en_pos = CASE
        WHEN tipo = 'venta' THEN true
        ELSE false
    END;

-- ============================================================
-- 6. AGREGAR FK departamento_id → inv_departamentos
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventarios_departamento'
    ) THEN
        ALTER TABLE public.inventarios
            ADD CONSTRAINT fk_inventarios_departamento
            FOREIGN KEY (departamento_id)
            REFERENCES public.inv_departamentos(id);
    END IF;
END $$;

-- ============================================================
-- 7. ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inventarios_departamento
    ON public.inventarios(departamento_id);

CREATE INDEX IF NOT EXISTS idx_inventarios_es_servicio
    ON public.inventarios(es_servicio);

CREATE INDEX IF NOT EXISTS idx_inventarios_disponible_pos
    ON public.inventarios(disponible_en_pos);

CREATE INDEX IF NOT EXISTS idx_inv_departamentos_activo
    ON public.inv_departamentos(activo);

CREATE INDEX IF NOT EXISTS idx_inv_departamentos_orden
    ON public.inv_departamentos(orden);

-- ============================================================
-- 8. ELIMINAR tablas obsoletas (en orden por FKs)
-- ============================================================
DROP TABLE IF EXISTS public.inventarios_reglas_stock CASCADE;
DROP TABLE IF EXISTS public.inventarios_caracteristicas CASCADE;
DROP TABLE IF EXISTS public.inventarios_categorias CASCADE;

-- ============================================================
-- 9. VERIFICACIÓN FINAL
-- ============================================================
DO $$
DECLARE
    v_deptos INTEGER;
    v_arts INTEGER;
    v_sin_depto INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_deptos FROM public.inv_departamentos;
    SELECT COUNT(*) INTO v_arts FROM public.inventarios WHERE activo = true;
    SELECT COUNT(*) INTO v_sin_depto FROM public.inventarios WHERE departamento_id IS NULL AND activo = true;

    RAISE NOTICE '=== MIGRACIÓN COMPLETADA ===';
    RAISE NOTICE 'Departamentos creados: %', v_deptos;
    RAISE NOTICE 'Artículos activos: %', v_arts;
    RAISE NOTICE 'Artículos sin departamento: %', v_sin_depto;

    IF v_sin_depto > 0 THEN
        RAISE WARNING 'Hay % artículos sin departamento asignado', v_sin_depto;
    ELSE
        RAISE NOTICE 'Todos los artículos tienen departamento ✓';
    END IF;
END $$;

COMMIT;
