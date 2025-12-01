-- Script para agregar módulo de equipos a la base de datos existente
-- Se ejecuta sobre una base de datos que ya tiene las tablas principales

-- Tabla principal de equipos
CREATE TABLE IF NOT EXISTS public.equipos (
    id SERIAL PRIMARY KEY,
    tipo_equipo VARCHAR(50) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(100),
    nombre_equipo VARCHAR(150),
    area_ubicacion VARCHAR(150),
    cliente_nombre VARCHAR(255),
    estatus VARCHAR(30) DEFAULT 'activo',
    responsable_nombre VARCHAR(255),
    observaciones TEXT,
    foto_url VARCHAR(500),
    fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    CONSTRAINT chk_equipos_estatus CHECK (estatus IN ('activo', 'inactivo', 'en_reparacion', 'baja')),
    CONSTRAINT chk_equipos_tipo CHECK (tipo_equipo IN ('fotocopiadora', 'impresora', 'pc', 'laptop', 'monitor', 'router', 'escaner', 'otro'))
);

CREATE INDEX IF NOT EXISTS idx_equipos_tipo ON public.equipos(tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_equipos_estatus ON public.equipos(estatus);
CREATE INDEX IF NOT EXISTS idx_equipos_serie ON public.equipos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_equipos_cliente_nombre ON public.equipos(cliente_nombre);

COMMENT ON TABLE public.equipos IS 'Tabla principal de equipos electrónicos del negocio - Módulo independiente';

-- Características de equipos
CREATE TABLE IF NOT EXISTS public.equipos_caracteristicas (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    caracteristicas JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_caracteristicas_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_caracteristicas_equipo ON public.equipos_caracteristicas(equipo_id);

-- Historial de contador
CREATE TABLE IF NOT EXISTS public.equipos_historial_contador (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    fecha_lectura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contador_actual INTEGER NOT NULL,
    tecnico_nombre VARCHAR(255),
    observaciones TEXT,
    CONSTRAINT fk_historial_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_contador_equipo ON public.equipos_historial_contador(equipo_id);
CREATE INDEX IF NOT EXISTS idx_historial_contador_fecha ON public.equipos_historial_contador(fecha_lectura DESC);

-- Mantenimientos
CREATE TABLE IF NOT EXISTS public.equipos_mantenimiento (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    fecha_servicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contador_servicio INTEGER,
    descripcion TEXT NOT NULL,
    costo NUMERIC(10, 2),
    tecnico_nombre VARCHAR(255),
    proveedor_nombre VARCHAR(255),
    observaciones TEXT,
    CONSTRAINT fk_mantenimiento_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mantenimiento_equipo ON public.equipos_mantenimiento(equipo_id);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_fecha ON public.equipos_mantenimiento(fecha_servicio DESC);

-- Consumibles
CREATE TABLE IF NOT EXISTS public.equipos_consumibles (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    tipo_consumible VARCHAR(100) NOT NULL,
    fecha_instalacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rendimiento_estimado INTEGER,
    contador_instalacion INTEGER,
    contador_proximo_cambio INTEGER,
    observaciones TEXT,
    CONSTRAINT fk_consumibles_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consumibles_equipo ON public.equipos_consumibles(equipo_id);
CREATE INDEX IF NOT EXISTS idx_consumibles_tipo ON public.equipos_consumibles(tipo_consumible);

-- Catálogo de tipos de equipo
CREATE TABLE IF NOT EXISTS public.cat_tipos_equipo (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    requiere_contador BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cat_tipos_equipo_activo ON public.cat_tipos_equipo(activo);
CREATE INDEX IF NOT EXISTS idx_cat_tipos_equipo_codigo ON public.cat_tipos_equipo(codigo);

-- Catálogo de estatus
CREATE TABLE IF NOT EXISTS public.cat_estatus_equipo (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cat_estatus_equipo_activo ON public.cat_estatus_equipo(activo);
CREATE INDEX IF NOT EXISTS idx_cat_estatus_equipo_codigo ON public.cat_estatus_equipo(codigo);

-- Catálogo de marcas
CREATE TABLE IF NOT EXISTS public.cat_marcas_equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cat_marcas_equipo_activo ON public.cat_marcas_equipo(activo);
CREATE INDEX IF NOT EXISTS idx_cat_marcas_equipo_nombre ON public.cat_marcas_equipo(nombre);

-- Insertar datos iniciales en catálogos
INSERT INTO public.cat_tipos_equipo (id, codigo, nombre, descripcion, icono, requiere_contador, activo, orden, fecha_creacion) VALUES
(1, 'fotocopiadora', 'Fotocopiadora', 'Equipos multifuncionales para impresión, copia y escaneo', 'fa-copy', true, true, 1, '2025-11-30 12:00:00-06'),
(2, 'impresora', 'Impresora', 'Impresoras láser, inkjet y matriciales', 'fa-print', true, true, 2, '2025-11-30 12:00:00-06'),
(3, 'pc', 'PC de Escritorio', 'Computadoras de escritorio', 'fa-desktop', false, true, 3, '2025-11-30 12:00:00-06'),
(4, 'laptop', 'Laptop', 'Computadoras portátiles', 'fa-laptop', false, true, 4, '2025-11-30 12:00:00-06'),
(5, 'monitor', 'Monitor', 'Pantallas y monitores', 'fa-tv', false, true, 5, '2025-11-30 12:00:00-06'),
(6, 'router', 'Router', 'Equipos de red y conectividad', 'fa-network-wired', false, true, 6, '2025-11-30 12:00:00-06'),
(7, 'escaner', 'Escáner', 'Escáneres independientes', 'fa-scanner', false, true, 7, '2025-11-30 12:00:00-06'),
(8, 'otro', 'Otro Equipo', 'Otros equipos electrónicos', 'fa-laptop-medical', false, true, 8, '2025-11-30 12:00:00-06')
ON CONFLICT (codigo) DO NOTHING;

SELECT pg_catalog.setval('public.cat_tipos_equipo_id_seq', 8, true);

INSERT INTO public.cat_estatus_equipo (id, codigo, nombre, descripcion, color, activo, orden, fecha_creacion) VALUES
(1, 'activo', 'Activo', 'Equipo en operación normal', 'success', true, 1, '2025-11-30 12:00:00-06'),
(2, 'inactivo', 'Inactivo', 'Equipo temporalmente sin uso', 'secondary', true, 2, '2025-11-30 12:00:00-06'),
(3, 'en_reparacion', 'En Reparación', 'Equipo en proceso de reparación', 'warning', true, 3, '2025-11-30 12:00:00-06'),
(4, 'baja', 'Dado de Baja', 'Equipo fuera de servicio permanente', 'danger', true, 4, '2025-11-30 12:00:00-06')
ON CONFLICT (codigo) DO NOTHING;

SELECT pg_catalog.setval('public.cat_estatus_equipo_id_seq', 4, true);

INSERT INTO public.cat_marcas_equipo (id, nombre, descripcion, activo, orden, fecha_creacion) VALUES
(1, 'HP', 'Hewlett-Packard', true, 1, '2025-11-30 12:00:00-06'),
(2, 'Canon', 'Canon Inc.', true, 2, '2025-11-30 12:00:00-06'),
(3, 'Epson', 'Epson Corporation', true, 3, '2025-11-30 12:00:00-06'),
(4, 'Xerox', 'Xerox Corporation', true, 4, '2025-11-30 12:00:00-06'),
(5, 'Brother', 'Brother Industries', true, 5, '2025-11-30 12:00:00-06'),
(6, 'Ricoh', 'Ricoh Company', true, 6, '2025-11-30 12:00:00-06'),
(7, 'Kyocera', 'Kyocera Document Solutions', true, 7, '2025-11-30 12:00:00-06'),
(8, 'Samsung', 'Samsung Electronics', true, 8, '2025-11-30 12:00:00-06'),
(9, 'Dell', 'Dell Technologies', true, 9, '2025-11-30 12:00:00-06'),
(10, 'Lenovo', 'Lenovo Group', true, 10, '2025-11-30 12:00:00-06'),
(11, 'Acer', 'Acer Inc.', true, 11, '2025-11-30 12:00:00-06'),
(12, 'Asus', 'ASUSTeK Computer', true, 12, '2025-11-30 12:00:00-06'),
(13, 'Toshiba', 'Toshiba Corporation', true, 13, '2025-11-30 12:00:00-06'),
(14, 'LG', 'LG Electronics', true, 14, '2025-11-30 12:00:00-06'),
(15, 'Cisco', 'Cisco Systems', true, 15, '2025-11-30 12:00:00-06'),
(16, 'TP-Link', 'TP-Link Technologies', true, 16, '2025-11-30 12:00:00-06'),
(17, 'Otra', 'Otra marca', true, 99, '2025-11-30 12:00:00-06')
ON CONFLICT (nombre) DO NOTHING;

SELECT pg_catalog.setval('public.cat_marcas_equipo_id_seq', 17, true);
