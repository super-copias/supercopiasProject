-- =====================================================
-- SuperCopias Database Schema - PostgreSQL Version
-- Sistema de Gestión Integral para SuperCopias
-- Fecha: 11 de Octubre de 2025
-- =====================================================

-- Crear base de datos (ejecutar como superuser)
-- CREATE DATABASE supercopias 
--   WITH ENCODING 'UTF8' 
--   LC_COLLATE = 'es_MX.UTF-8' 
--   LC_CTYPE = 'es_MX.UTF-8';

-- Conectar a la base de datos supercopias
-- \c supercopias;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: usuarios
-- Sistema de autenticación y autorización
-- =====================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'empleado',
    roles JSONB DEFAULT '[]'::jsonb,
    empleado_id INTEGER,
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    full_name VARCHAR(500),
    phone VARCHAR(20),
    bio TEXT,
    profile_image VARCHAR(500),
    
    -- Constrains
    CONSTRAINT chk_usuarios_role CHECK (role IN ('admin', 'gerente', 'empleado', 'invitado')),
    CONSTRAINT chk_usuarios_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_empleado_id ON usuarios(empleado_id);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);
CREATE INDEX idx_usuarios_role ON usuarios(role);

-- =====================================================
-- TABLA: sucursales
-- Catálogo de sucursales de la empresa
-- =====================================================
CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    gerente VARCHAR(255),
    activa BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sucursales
CREATE INDEX idx_sucursales_activa ON sucursales(activa);
CREATE INDEX idx_sucursales_nombre ON sucursales(nombre);

-- =====================================================
-- TABLA: puestos
-- Catálogo de puestos de trabajo
-- =====================================================
CREATE TABLE puestos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    salario_minimo DECIMAL(10,2),
    salario_maximo DECIMAL(10,2),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_puestos_salario CHECK (salario_maximo >= salario_minimo)
);

-- Índices para puestos
CREATE INDEX idx_puestos_activo ON puestos(activo);
CREATE INDEX idx_puestos_nombre ON puestos(nombre);

-- =====================================================
-- TABLA: empleados
-- Información completa de empleados
-- =====================================================
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefono VARCHAR(20),
    puesto_id INTEGER,
    sucursal_id INTEGER,
    salario DECIMAL(10,2),
    fecha_ingreso DATE,
    activo BOOLEAN DEFAULT true,
    fecha_baja DATE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tipo_acceso VARCHAR(50) DEFAULT 'limitado',
    usuario_id INTEGER,
    
    -- Foreign Keys
    CONSTRAINT fk_empleados_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    CONSTRAINT fk_empleados_puesto FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    
    -- Constraints
    CONSTRAINT chk_empleados_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_empleados_tipo_acceso CHECK (tipo_acceso IN ('completo', 'limitado', 'solo_lectura')),
    CONSTRAINT chk_empleados_fecha_baja CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_ingreso)
);

-- Índices para empleados
CREATE INDEX idx_empleados_nombre ON empleados(nombre);
CREATE INDEX idx_empleados_email ON empleados(email);
CREATE INDEX idx_empleados_activo ON empleados(activo);
CREATE INDEX idx_empleados_puesto ON empleados(puesto);
CREATE INDEX idx_empleados_sucursal ON empleados(sucursal);
CREATE INDEX idx_empleados_fecha_ingreso ON empleados(fecha_ingreso);

-- =====================================================
-- TABLA: empleados_modulos
-- Permisos granulares por módulo para empleados
-- =====================================================
CREATE TABLE empleados_modulos (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    acceso BOOLEAN DEFAULT false,
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_empleados_modulos_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT uk_empleados_modulos UNIQUE (empleado_id, modulo)
);

-- Índices para empleados_modulos
CREATE INDEX idx_empleados_modulos_empleado_id ON empleados_modulos(empleado_id);
CREATE INDEX idx_empleados_modulos_modulo ON empleados_modulos(modulo);
CREATE INDEX idx_empleados_modulos_acceso ON empleados_modulos(acceso);

-- =====================================================
-- TABLA: clientes
-- Información completa de clientes
-- =====================================================
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    rfc VARCHAR(13) UNIQUE,
    razon_social VARCHAR(500) NOT NULL,
    nombre_comercial VARCHAR(500),
    email VARCHAR(255),
    telefono VARCHAR(20),
    segundo_telefono VARCHAR(20),
    direccion TEXT,
    direccion_codigo_postal VARCHAR(10),
    regimen_fiscal VARCHAR(10),
    uso_cfdi VARCHAR(10),
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_clientes_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_clientes_rfc CHECK (rfc IS NULL OR LENGTH(rfc) IN (12, 13)),
    CONSTRAINT chk_clientes_regimen_fiscal CHECK (regimen_fiscal IS NULL OR regimen_fiscal ~ '^[0-9]{3}$'),
    CONSTRAINT chk_clientes_uso_cfdi CHECK (uso_cfdi IS NULL OR uso_cfdi ~ '^[A-Z][0-9]{2}$')
);

-- Índices para clientes
CREATE INDEX idx_clientes_rfc ON clientes(rfc);
CREATE INDEX idx_clientes_razon_social ON clientes(razon_social);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_activo ON clientes(activo);
CREATE INDEX idx_clientes_codigo_postal ON clientes(direccion_codigo_postal);

-- =====================================================
-- TABLA: proveedores
-- Información de proveedores
-- =====================================================
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(500) NOT NULL,
    rfc VARCHAR(13),
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    codigo_postal VARCHAR(10),
    ciudad VARCHAR(255),
    estado VARCHAR(255),
    contacto VARCHAR(255),
    tipo_proveedor VARCHAR(100),
    condiciones_pago VARCHAR(255),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_proveedores_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_proveedores_rfc CHECK (rfc IS NULL OR LENGTH(rfc) IN (12, 13))
);

-- Índices para proveedores
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX idx_proveedores_rfc ON proveedores(rfc);
CREATE INDEX idx_proveedores_email ON proveedores(email);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);
CREATE INDEX idx_proveedores_tipo ON proveedores(tipo_proveedor);

-- =====================================================
-- TABLA: auditoria
-- Registro de todas las operaciones importantes
-- =====================================================
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    operacion VARCHAR(20) NOT NULL,
    registro_id INTEGER NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id INTEGER,
    ip_address INET,
    fecha_operacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_auditoria_operacion CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Índices para auditoria
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_operacion ON auditoria(operacion);
CREATE INDEX idx_auditoria_registro_id ON auditoria(registro_id);
CREATE INDEX idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_operacion);

-- =====================================================
-- TABLAS DE CATÁLOGOS SAT Y SISTEMA
-- =====================================================

-- Tabla: estados (estados de la República Mexicana)
CREATE TABLE estados (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: regimenes_fiscales (catálogo SAT)
CREATE TABLE regimenes_fiscales (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: usos_cfdi (catálogo SAT)
CREATE TABLE usos_cfdi (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: formas_pago (catálogo SAT)
CREATE TABLE formas_pago (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: metodos_pago (catálogo SAT)
CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: modulos (módulos del sistema)
CREATE TABLE modulos (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para catálogos
CREATE INDEX idx_estados_codigo ON estados(codigo);
CREATE INDEX idx_regimenes_fiscales_codigo ON regimenes_fiscales(codigo);
CREATE INDEX idx_usos_cfdi_codigo ON usos_cfdi(codigo);
CREATE INDEX idx_formas_pago_codigo ON formas_pago(codigo);
CREATE INDEX idx_metodos_pago_codigo ON metodos_pago(codigo);
CREATE INDEX idx_modulos_clave ON modulos(clave);
CREATE INDEX idx_modulos_activo ON modulos(activo);

-- =====================================================
-- FOREIGN KEYS ADICIONALES
-- =====================================================
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_empleado 
    FOREIGN KEY (empleado_id) REFERENCES empleados(id);

-- =====================================================
-- TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Función para auditoría
CREATE OR REPLACE FUNCTION trigger_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO auditoria (tabla, operacion, registro_id, datos_nuevos)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de auditoría
CREATE TRIGGER trg_usuarios_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_empleados_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON empleados
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_clientes_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON clientes
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_proveedores_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- =====================================================
-- TRIGGERS PARA TIMESTAMPS AUTOMÁTICOS
-- =====================================================

-- Función para actualizar fecha_modificacion
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de timestamp
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER trg_empleados_updated_at
    BEFORE UPDATE ON empleados
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
    BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER trg_sucursales_updated_at
    BEFORE UPDATE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER trg_puestos_updated_at
    BEFORE UPDATE ON puestos
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de empleados con información completa
CREATE VIEW vista_empleados_completa AS
SELECT 
    e.id,
    e.nombre,
    e.email,
    e.telefono,
    p.nombre as puesto,
    s.nombre as sucursal,
    e.salario,
    e.fecha_ingreso,
    e.activo,
    e.fecha_baja,
    e.tipo_acceso,
    u.username,
    u.role as rol_usuario,
    u.ultimo_acceso,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'modulo', em.modulo,
                'acceso', em.acceso
            )
        ) FILTER (WHERE em.modulo IS NOT NULL), 
        '[]'::jsonb
    ) as modulos
FROM empleados e
LEFT JOIN usuarios u ON e.id = u.empleado_id
LEFT JOIN empleados_modulos em ON e.id = em.empleado_id
LEFT JOIN puestos p ON e.puesto_id = p.id
LEFT JOIN sucursales s ON e.sucursal_id = s.id
GROUP BY e.id, e.nombre, e.email, e.telefono, p.nombre, s.nombre,
         e.salario, e.fecha_ingreso, e.activo, e.fecha_baja, e.tipo_acceso,
         u.username, u.role, u.ultimo_acceso;

-- Vista de estadísticas de empleados
CREATE VIEW vista_estadisticas_empleados AS
SELECT 
    COUNT(*) as total_empleados,
    COUNT(*) FILTER (WHERE activo = true) as empleados_activos,
    COUNT(*) FILTER (WHERE activo = false) as empleados_inactivos,
    COUNT(DISTINCT sucursal) as sucursales_con_empleados,
    COUNT(DISTINCT puesto) as puestos_ocupados,
    AVG(salario) FILTER (WHERE salario IS NOT NULL) as salario_promedio,
    MIN(fecha_ingreso) as empleado_mas_antiguo,
    MAX(fecha_ingreso) as empleado_mas_reciente
FROM empleados;

-- Vista de clientes activos con resumen
CREATE VIEW vista_clientes_activos AS
SELECT 
    id,
    rfc,
    razon_social,
    nombre_comercial,
    email,
    telefono,
    CONCAT(direccion_calle, ' ', direccion_numero, ', ', direccion_colonia) as direccion_completa,
    direccion_ciudad,
    direccion_estado,
    direccion_codigo_postal,
    regimen_fiscal,
    uso_cfdi,
    fecha_registro,
    fecha_modificacion
FROM clientes 
WHERE activo = true;

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para generar username consecutivo
CREATE OR REPLACE FUNCTION generar_username(p_nombre VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    base_username VARCHAR;
    counter INTEGER := 1;
    final_username VARCHAR;
BEGIN
    -- Limpiar nombre para username
    base_username := LOWER(REGEXP_REPLACE(p_nombre, '[^a-zA-Z]', '', 'g'));
    base_username := LEFT(base_username, 10);
    
    -- Buscar siguiente número disponible
    LOOP
        final_username := LPAD(counter::text, 3, '0') || '.' || base_username;
        
        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        
        -- Expandir a 4 dígitos si es necesario
        IF counter > 999 THEN
            final_username := LPAD(counter::text, 4, '0') || '.' || base_username;
            IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN
                EXIT;
            END IF;
        END IF;
        
        -- Límite de seguridad
        IF counter > 9999 THEN
            RAISE EXCEPTION 'No se puede generar username único para: %', p_nombre;
        END IF;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de la aplicación
CREATE OR REPLACE FUNCTION obtener_estadisticas_generales()
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'usuarios', (SELECT COUNT(*) FROM usuarios WHERE activo = true),
        'empleados', (SELECT COUNT(*) FROM empleados WHERE activo = true),
        'clientes', (SELECT COUNT(*) FROM clientes WHERE activo = true),
        'proveedores', (SELECT COUNT(*) FROM proveedores WHERE activo = true),
        'sucursales', (SELECT COUNT(*) FROM sucursales WHERE activa = true),
        'ultimo_acceso', (SELECT MAX(ultimo_acceso) FROM usuarios),
        'empleados_nuevos_mes', (
            SELECT COUNT(*) FROM empleados 
            WHERE fecha_ingreso >= date_trunc('month', CURRENT_DATE)
        ),
        'clientes_nuevos_mes', (
            SELECT COUNT(*) FROM clientes 
            WHERE fecha_registro >= date_trunc('month', CURRENT_DATE)
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar sucursales base
INSERT INTO sucursales (nombre, direccion, telefono, gerente, activa) VALUES
('Sucursal Centro', 'Av. Principal 123, Centro', '555-0001', 'María García', true),
('Sucursal Norte', 'Blvd. Norte 456, Col. Norte', '555-0002', 'Juan Pérez', true),
('Sucursal Sur', 'Calle Sur 789, Col. Sur', '555-0003', 'Ana López', true);

-- Insertar puestos base
INSERT INTO puestos (nombre, descripcion, salario_minimo, salario_maximo, activo) VALUES
('Gerente General', 'Responsable de la operación general', 25000.00, 35000.00, true),
('Gerente de Sucursal', 'Responsable de sucursal específica', 18000.00, 25000.00, true),
('Supervisor', 'Supervisión de operaciones diarias', 12000.00, 18000.00, true),
('Empleado de Mostrador', 'Atención directa al cliente', 8000.00, 12000.00, true),
('Cajero', 'Manejo de caja y cobros', 8000.00, 10000.00, true);

-- Insertar empleado administrador
INSERT INTO empleados (nombre, email, telefono, puesto_id, sucursal_id, salario, fecha_ingreso, activo, tipo_acceso) VALUES
('Administrador Sistema', 'admin@supercopias.com', '555-1000', 1, 1, 30000.00, '2024-01-01', true, 'completo');

-- Insertar usuario administrador (contraseña: admin123)
INSERT INTO usuarios (username, password, nombre, email, role, roles, empleado_id, activo) VALUES
('admin', '$2a$10$8YJWxKYZHfLxJ1/YQsYKZ.8bK9fX7J1QZ5VeNLqBxWzFvH3Qe4YRi', 'Administrador', 'admin@supercopias.com', 'admin', '["admin", "gerente"]'::jsonb, 1, true);

-- Insertar módulos para el administrador
INSERT INTO empleados_modulos (empleado_id, modulo, acceso) VALUES
(1, 'empleados', true),
(1, 'clientes', true),
(1, 'proveedores', true),
(1, 'reportes', true),
(1, 'configuracion', true),
(1, 'administracion', true);

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON DATABASE supercopias IS 'Base de datos del sistema SuperCopias - Gestión integral de negocio';

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con autenticación y autorización';
COMMENT ON TABLE empleados IS 'Información completa de empleados de la empresa';
COMMENT ON TABLE clientes IS 'Base de datos de clientes con información fiscal';
COMMENT ON TABLE proveedores IS 'Catálogo de proveedores y sus datos de contacto';
COMMENT ON TABLE sucursales IS 'Sucursales de la empresa';
COMMENT ON TABLE puestos IS 'Catálogo de puestos de trabajo';
COMMENT ON TABLE empleados_modulos IS 'Permisos granulares por módulo para cada empleado';
COMMENT ON TABLE auditoria IS 'Registro completo de operaciones para auditoría';

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos SuperCopias creada exitosamente';
    RAISE NOTICE '📊 Tablas: %, Vistas: %, Funciones: %', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public');
    RAISE NOTICE '🚀 Sistema listo para usar con PostgreSQL';
END $$;