-- =====================================================================
-- Migración: Catálogos editables de Equipos (tipos y marcas) + ortografía
-- Idempotente: CREATE ... IF NOT EXISTS / INSERT ... ON CONFLICT / UPDATE
-- Aplica en: producción y desarrollo
-- Fecha: 2026-08-29
--
-- Objetivo:
--   1. Garantizar que existan los catálogos cat_tipos_equipo,
--      cat_estatus_equipo y cat_marcas_equipo (usados por el alta de equipos).
--   2. Permitir que el usuario agregue sus propios tipos y marcas
--      (el backend inserta filas nuevas; aquí solo se asegura el esquema).
--   3. Corregir los errores ortográficos / mojibake de los datos semilla
--      (p. ej. "EscÃ¡ner" -> "Escáner") SIN tocar la columna `codigo`,
--      que es la que referencia equipos.tipo_equipo. Los registros de
--      inventario NO se modifican.
--   4. Eliminar el CHECK fijo equipos.chk_equipos_tipo: al ser el catálogo
--      editable, el tipo ya no puede estar restringido a una lista fija.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Quitar el CHECK fijo sobre equipos.tipo_equipo
--    Antes solo permitía ('fotocopiadora','impresora',...,'otro'); ahora el
--    usuario puede dar de alta tipos nuevos, así que la validación pasa a ser
--    por catálogo (cat_tipos_equipo) + capa de aplicación, igual que `marca`.
--    Los registros existentes NO se tocan.
-- ---------------------------------------------------------------------
ALTER TABLE public.equipos DROP CONSTRAINT IF EXISTS chk_equipos_tipo;

-- ---------------------------------------------------------------------
-- 1. Tablas de catálogo (no-op si ya existen)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cat_tipos_equipo (
    id                SERIAL PRIMARY KEY,
    codigo            VARCHAR(30)  NOT NULL UNIQUE,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       TEXT,
    icono             VARCHAR(50),
    requiere_contador BOOLEAN DEFAULT FALSE,
    activo            BOOLEAN DEFAULT TRUE,
    orden             INTEGER DEFAULT 0,
    fecha_creacion    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.cat_estatus_equipo (
    id             SERIAL PRIMARY KEY,
    codigo         VARCHAR(30)  NOT NULL UNIQUE,
    nombre         VARCHAR(100) NOT NULL,
    descripcion    TEXT,
    color          VARCHAR(20),
    activo         BOOLEAN DEFAULT TRUE,
    orden          INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.cat_marcas_equipo (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    descripcion    TEXT,
    activo         BOOLEAN DEFAULT TRUE,
    orden          INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices auxiliares (idempotentes)
CREATE INDEX IF NOT EXISTS idx_cat_tipos_equipo_activo   ON public.cat_tipos_equipo   USING btree (activo);
CREATE INDEX IF NOT EXISTS idx_cat_tipos_equipo_codigo   ON public.cat_tipos_equipo   USING btree (codigo);
CREATE INDEX IF NOT EXISTS idx_cat_estatus_equipo_activo ON public.cat_estatus_equipo USING btree (activo);
CREATE INDEX IF NOT EXISTS idx_cat_estatus_equipo_codigo ON public.cat_estatus_equipo USING btree (codigo);
CREATE INDEX IF NOT EXISTS idx_cat_marcas_equipo_activo  ON public.cat_marcas_equipo  USING btree (activo);
CREATE INDEX IF NOT EXISTS idx_cat_marcas_equipo_nombre  ON public.cat_marcas_equipo  USING btree (nombre);

-- ---------------------------------------------------------------------
-- 2. Datos semilla (solo se insertan si faltan; nunca se duplican)
-- ---------------------------------------------------------------------
INSERT INTO public.cat_tipos_equipo (codigo, nombre, descripcion, icono, requiere_contador, orden) VALUES
    ('fotocopiadora', 'Fotocopiadora',    'Equipos multifuncionales para impresión, copia y escaneo', 'fa-copy',            TRUE,  1),
    ('impresora',     'Impresora',         'Impresoras láser, inkjet y matriciales',                   'fa-print',           TRUE,  2),
    ('pc',            'PC de Escritorio',  'Computadoras de escritorio',                                'fa-desktop',         FALSE, 3),
    ('laptop',        'Laptop',            'Computadoras portátiles',                                   'fa-laptop',          FALSE, 4),
    ('monitor',       'Monitor',           'Pantallas y monitores',                                     'fa-tv',              FALSE, 5),
    ('router',        'Router',            'Equipos de red y conectividad',                             'fa-network-wired',   FALSE, 6),
    ('escaner',       'Escáner',           'Escáneres independientes',                                  'fa-scanner',         FALSE, 7),
    ('otro',          'Otro Equipo',       'Otros equipos electrónicos',                                'fa-laptop-medical',  FALSE, 8)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cat_estatus_equipo (codigo, nombre, descripcion, color, orden) VALUES
    ('activo',        'Activo',        'Equipo en operación normal',            'success',   1),
    ('inactivo',      'Inactivo',      'Equipo temporalmente sin uso',          'secondary', 2),
    ('en_reparacion', 'En Reparación', 'Equipo en proceso de reparación',       'warning',   3),
    ('baja',          'Dado de Baja',  'Equipo fuera de servicio permanente',   'danger',    4)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cat_marcas_equipo (nombre, descripcion, orden) VALUES
    ('HP', 'Hewlett-Packard', 1),
    ('Canon', 'Canon Inc.', 2),
    ('Epson', 'Epson Corporation', 3),
    ('Xerox', 'Xerox Corporation', 4),
    ('Brother', 'Brother Industries', 5),
    ('Ricoh', 'Ricoh Company', 6),
    ('Kyocera', 'Kyocera Document Solutions', 7),
    ('Samsung', 'Samsung Electronics', 8),
    ('Dell', 'Dell Technologies', 9),
    ('Lenovo', 'Lenovo Group', 10),
    ('Acer', 'Acer Inc.', 11),
    ('Asus', 'ASUSTeK Computer', 12),
    ('Toshiba', 'Toshiba Corporation', 13),
    ('LG', 'LG Electronics', 14),
    ('Cisco', 'Cisco Systems', 15),
    ('TP-Link', 'TP-Link Technologies', 16),
    ('Otra', 'Otra marca', 99)
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Corrección de ortografía / mojibake en los datos ya existentes
--    (doble codificación UTF-8: "Ã¡" -> "á", etc.). Solo texto visible;
--    la columna `codigo` NO se toca.
-- ---------------------------------------------------------------------

-- 3a. Valores canónicos para las filas semilla conocidas de cat_tipos_equipo
UPDATE public.cat_tipos_equipo SET nombre = 'Escáner',
       descripcion = 'Escáneres independientes'                          WHERE codigo = 'escaner';
UPDATE public.cat_tipos_equipo
       SET descripcion = 'Equipos multifuncionales para impresión, copia y escaneo' WHERE codigo = 'fotocopiadora';
UPDATE public.cat_tipos_equipo
       SET descripcion = 'Impresoras láser, inkjet y matriciales'        WHERE codigo = 'impresora';
UPDATE public.cat_tipos_equipo
       SET descripcion = 'Computadoras portátiles'                       WHERE codigo = 'laptop';
UPDATE public.cat_tipos_equipo
       SET descripcion = 'Otros equipos electrónicos'                    WHERE codigo = 'otro';

-- 3b. Red de seguridad: repara cualquier mojibake restante en los 3 catálogos
--     (incluye filas creadas por el usuario si llegaran corruptas).
--     Idempotente: si no hay 'Ã', no cambia nada.
UPDATE public.cat_tipos_equipo SET
    nombre = replace(replace(replace(replace(replace(replace(replace(nombre,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ'),
    descripcion = CASE WHEN descripcion IS NULL THEN NULL ELSE
        replace(replace(replace(replace(replace(replace(replace(descripcion,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ') END
WHERE nombre LIKE '%Ã%' OR descripcion LIKE '%Ã%';

UPDATE public.cat_estatus_equipo SET
    nombre = replace(replace(replace(replace(replace(replace(replace(nombre,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ'),
    descripcion = CASE WHEN descripcion IS NULL THEN NULL ELSE
        replace(replace(replace(replace(replace(replace(replace(descripcion,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ') END
WHERE nombre LIKE '%Ã%' OR descripcion LIKE '%Ã%';

UPDATE public.cat_marcas_equipo SET
    nombre = replace(replace(replace(replace(replace(replace(replace(nombre,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ'),
    descripcion = CASE WHEN descripcion IS NULL THEN NULL ELSE
        replace(replace(replace(replace(replace(replace(replace(descripcion,
        'Ã¡','á'),'Ã©','é'),'Ã­','í'),'Ã³','ó'),'Ãº','ú'),'Ã±','ñ'),'Ã‘','Ñ') END
WHERE nombre LIKE '%Ã%' OR descripcion LIKE '%Ã%';

-- ---------------------------------------------------------------------
-- 4. Sincronizar las secuencias por si se insertó con id explícito
-- ---------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('public.cat_tipos_equipo',   'id'), COALESCE((SELECT MAX(id) FROM public.cat_tipos_equipo),   1), true);
SELECT setval(pg_get_serial_sequence('public.cat_estatus_equipo', 'id'), COALESCE((SELECT MAX(id) FROM public.cat_estatus_equipo), 1), true);
SELECT setval(pg_get_serial_sequence('public.cat_marcas_equipo',  'id'), COALESCE((SELECT MAX(id) FROM public.cat_marcas_equipo),  1), true);

COMMIT;
