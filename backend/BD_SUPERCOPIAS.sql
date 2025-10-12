-- ================================================================================
-- BASE DE DATOS SUPERCOPIAS - DISEÑADA ESPECÍFICAMENTE PARA EL PROYECTO
-- Versión: 1.0
-- Fecha: 11 de octubre de 2025
-- Descripción: Base de datos relacional para el sistema SuperCopias
-- ================================================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS supercopias_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE supercopias_db;

-- ================================================================================
-- TABLA: usuarios
-- Descripción: Usuarios del sistema con credenciales de acceso
-- ================================================================================
CREATE TABLE usuarios (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role ENUM('admin', 'empleado', 'supervisor', 'cajero') DEFAULT 'empleado',
    roles JSON,
    empleado_id VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    profile_image VARCHAR(500),
    INDEX idx_username (username),
    INDEX idx_empleado_id (empleado_id),
    INDEX idx_activo (activo),
    INDEX idx_role (role)
);

-- ================================================================================
-- TABLA: empleados
-- Descripción: Información de empleados de la empresa
-- ================================================================================
CREATE TABLE empleados (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    puesto VARCHAR(100),
    sucursal VARCHAR(100),
    salario DECIMAL(10,2),
    fecha_ingreso DATE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_baja DATE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    tipo_acceso ENUM('administrador', 'personalizado', 'inactivo') DEFAULT 'inactivo',
    usuario_id VARCHAR(50),
    INDEX idx_nombre (nombre),
    INDEX idx_email (email),
    INDEX idx_activo (activo),
    INDEX idx_sucursal (sucursal),
    INDEX idx_puesto (puesto),
    INDEX idx_usuario_id (usuario_id)
);

-- ================================================================================
-- TABLA: empleados_modulos
-- Descripción: Permisos de módulos para cada empleado
-- ================================================================================
CREATE TABLE empleados_modulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id VARCHAR(50) NOT NULL,
    modulo ENUM('dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'configuracion') NOT NULL,
    acceso BOOLEAN DEFAULT FALSE,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_empleado_modulo (empleado_id, modulo),
    INDEX idx_empleado_id (empleado_id),
    INDEX idx_modulo (modulo),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);

-- ================================================================================
-- TABLA: clientes
-- Descripción: Información de clientes empresariales
-- ================================================================================
CREATE TABLE clientes (
    id VARCHAR(50) PRIMARY KEY,
    rfc VARCHAR(13) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion_calle VARCHAR(255),
    direccion_numero VARCHAR(10),
    direccion_colonia VARCHAR(100),
    direccion_codigo_postal VARCHAR(10),
    direccion_ciudad VARCHAR(100),
    direccion_estado VARCHAR(100),
    regimen_fiscal VARCHAR(10),
    uso_cfdi VARCHAR(10),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rfc (rfc),
    INDEX idx_razon_social (razon_social),
    INDEX idx_email (email),
    INDEX idx_activo (activo),
    INDEX idx_ciudad (direccion_ciudad),
    INDEX idx_estado (direccion_estado)
);

-- ================================================================================
-- TABLA: proveedores
-- Descripción: Información de proveedores de la empresa
-- ================================================================================
CREATE TABLE proveedores (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    rfc VARCHAR(13),
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    codigo_postal VARCHAR(10),
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    contacto VARCHAR(255),
    tipo_proveedor VARCHAR(100),
    condiciones_pago VARCHAR(100),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_rfc (rfc),
    INDEX idx_email (email),
    INDEX idx_activo (activo),
    INDEX idx_tipo_proveedor (tipo_proveedor),
    INDEX idx_ciudad (ciudad),
    INDEX idx_estado (estado)
);

-- ================================================================================
-- TABLA: sucursales
-- Descripción: Sucursales de la empresa
-- ================================================================================
CREATE TABLE sucursales (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    gerente VARCHAR(255),
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_activa (activa),
    INDEX idx_gerente (gerente)
);

-- ================================================================================
-- TABLA: puestos
-- Descripción: Catálogo de puestos de trabajo
-- ================================================================================
CREATE TABLE puestos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    salario_minimo DECIMAL(10,2),
    salario_maximo DECIMAL(10,2),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: regimenes_fiscales
-- Descripción: Catálogo de regímenes fiscales SAT
-- ================================================================================
CREATE TABLE regimenes_fiscales (
    codigo VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_descripcion (descripcion),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: usos_cfdi
-- Descripción: Catálogo de usos de CFDI según SAT
-- ================================================================================
CREATE TABLE usos_cfdi (
    codigo VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_descripcion (descripcion),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: formas_pago
-- Descripción: Catálogo de formas de pago según SAT
-- ================================================================================
CREATE TABLE formas_pago (
    codigo VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_descripcion (descripcion),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: metodos_pago
-- Descripción: Catálogo de métodos de pago según SAT
-- ================================================================================
CREATE TABLE metodos_pago (
    codigo VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_descripcion (descripcion),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: estados
-- Descripción: Catálogo de estados de México
-- ================================================================================
CREATE TABLE estados (
    codigo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
);

-- ================================================================================
-- TABLA: sesiones_usuario
-- Descripción: Control de sesiones activas de usuarios
-- ================================================================================
CREATE TABLE sesiones_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME,
    activa BOOLEAN DEFAULT TRUE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_token (token),
    INDEX idx_activa (activa),
    INDEX idx_fecha_expiracion (fecha_expiracion),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ================================================================================
-- TABLA: auditoria
-- Descripción: Log de auditoría para cambios importantes
-- ================================================================================
CREATE TABLE auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id VARCHAR(50) NOT NULL,
    accion ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    usuario_id VARCHAR(50),
    datos_anteriores JSON,
    datos_nuevos JSON,
    ip_address VARCHAR(45),
    fecha_evento DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tabla (tabla),
    INDEX idx_registro_id (registro_id),
    INDEX idx_accion (accion),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_evento (fecha_evento)
);

-- ================================================================================
-- RELACIONES ENTRE TABLAS (FOREIGN KEYS)
-- ================================================================================

-- Relación usuarios -> empleados
ALTER TABLE usuarios 
ADD CONSTRAINT fk_usuarios_empleados 
FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL;

-- Relación empleados -> usuarios
ALTER TABLE empleados 
ADD CONSTRAINT fk_empleados_usuarios 
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ================================================================================
-- INSERTAR DATOS INICIALES
-- ================================================================================

-- Estados iniciales
INSERT INTO estados (codigo, nombre) VALUES
('CHP', 'Chiapas'),
('CDMX', 'Ciudad de México'),
('GTO', 'Guanajuato');

-- Regímenes fiscales iniciales
INSERT INTO regimenes_fiscales (codigo, descripcion) VALUES
('601', 'General de Ley Personas Morales'),
('612', 'Personas Físicas con Actividades Empresariales'),
('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios');

-- Usos de CFDI iniciales
INSERT INTO usos_cfdi (codigo, descripcion) VALUES
('G01', 'Adquisición de mercancías'),
('G02', 'Devoluciones, descuentos o bonificaciones'),
('G03', 'Gastos en general'),
('I01', 'Construcciones'),
('I02', 'Mobiliario y equipo de oficina por inversiones'),
('I03', 'Equipo de transporte'),
('I04', 'Equipo de cómputo y accesorios'),
('D01', 'Honorarios médicos, dentales y gastos hospitalarios'),
('D10', 'Pagos por servicios educativos (colegiaturas)'),
('S01', 'Sin efectos fiscales'),
('CP01', 'Pagos'),
('CN01', 'Nómina');

-- Formas de pago iniciales
INSERT INTO formas_pago (codigo, descripcion) VALUES
('01', 'Efectivo'),
('02', 'Cheque nominativo'),
('03', 'Transferencia electrónica de fondos'),
('04', 'Tarjeta de crédito');

-- Métodos de pago iniciales
INSERT INTO metodos_pago (codigo, descripcion) VALUES
('PUE', 'Pago en una sola exhibición'),
('PPD', 'Pago en parcialidades o diferido');

-- Sucursales iniciales
INSERT INTO sucursales (id, nombre, direccion, telefono, gerente) VALUES
('SUC_001', 'Sucursal Centro', 'Centro de Tuxtla Gutiérrez', '961-100-1001', 'María Gómez Hernández'),
('SUC_002', 'Sucursal Norte', 'Norte de Tuxtla Gutiérrez', '961-100-1002', 'Juan Pérez Martínez'),
('SUC_003', 'Sucursal Sur', 'Sur de Tuxtla Gutiérrez', '961-100-1003', 'Ana López Silva');

-- Puestos iniciales
INSERT INTO puestos (id, nombre, descripcion, salario_minimo, salario_maximo) VALUES
('PUESTO_001', 'Gerente de Sucursal', 'Responsable de la administración general de la sucursal', 20000.00, 35000.00),
('PUESTO_002', 'Asistente de Ventas', 'Apoyo en atención al cliente y ventas', 12000.00, 18000.00),
('PUESTO_003', 'Auxiliar Administrativo', 'Apoyo en tareas administrativas y de oficina', 10000.00, 15000.00),
('PUESTO_004', 'Operador de Equipos', 'Manejo y mantenimiento de equipos de copiado e impresión', 11000.00, 16000.00);

-- Usuario administrador inicial
INSERT INTO usuarios (id, username, password, nombre, email, role, roles, activo, full_name, phone, bio) VALUES
('USR_ADMIN_001', 'admin', '$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW', 'Administrador SuperCopias', 'admin@supercopias.com', 'admin', '["admin"]', TRUE, 'Administrador SuperCopias', '+52 961 100 0000', 'Administrador principal del sistema SuperCopias');

-- ================================================================================
-- VISTAS ÚTILES PARA EL SISTEMA
-- ================================================================================

-- Vista: Empleados con información de usuario
CREATE VIEW v_empleados_completos AS
SELECT 
    e.id,
    e.nombre,
    e.email,
    e.telefono,
    e.puesto,
    e.sucursal,
    e.salario,
    e.fecha_ingreso,
    e.activo,
    e.fecha_baja,
    e.tipo_acceso,
    u.username,
    u.ultimo_acceso,
    DATEDIFF(CURDATE(), e.fecha_ingreso) as dias_antiguedad,
    CASE 
        WHEN e.activo = 1 THEN 'Activo'
        ELSE 'Inactivo'
    END as estado_texto
FROM empleados e
LEFT JOIN usuarios u ON e.usuario_id = u.id;

-- Vista: Clientes con dirección completa
CREATE VIEW v_clientes_completos AS
SELECT 
    c.id,
    c.rfc,
    c.razon_social,
    c.nombre_comercial,
    c.email,
    c.telefono,
    CONCAT(
        COALESCE(c.direccion_calle, ''), ' ',
        COALESCE(c.direccion_numero, ''), ', ',
        COALESCE(c.direccion_colonia, ''), ', ',
        COALESCE(c.direccion_ciudad, ''), ', ',
        COALESCE(c.direccion_estado, ''), ' ',
        COALESCE(c.direccion_codigo_postal, '')
    ) as direccion_completa,
    rf.descripcion as regimen_fiscal_desc,
    uc.descripcion as uso_cfdi_desc,
    c.activo,
    c.fecha_registro,
    c.fecha_modificacion
FROM clientes c
LEFT JOIN regimenes_fiscales rf ON c.regimen_fiscal = rf.codigo
LEFT JOIN usos_cfdi uc ON c.uso_cfdi = uc.codigo;

-- Vista: Proveedores completos
CREATE VIEW v_proveedores_completos AS
SELECT 
    p.*,
    CASE 
        WHEN p.activo = 1 THEN 'Activo'
        ELSE 'Inactivo'
    END as estado_texto
FROM proveedores p;

-- ================================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- ================================================================================

DELIMITER //

-- Procedimiento: Crear empleado con usuario
CREATE PROCEDURE sp_crear_empleado_con_usuario(
    IN p_empleado_id VARCHAR(50),
    IN p_nombre VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_telefono VARCHAR(20),
    IN p_puesto VARCHAR(100),
    IN p_sucursal VARCHAR(100),
    IN p_salario DECIMAL(10,2),
    IN p_fecha_ingreso DATE,
    IN p_tipo_acceso ENUM('administrador', 'personalizado', 'inactivo'),
    IN p_usuario_id VARCHAR(50),
    IN p_username VARCHAR(50),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insertar empleado
    INSERT INTO empleados (
        id, nombre, email, telefono, puesto, sucursal, salario,
        fecha_ingreso, tipo_acceso, usuario_id
    ) VALUES (
        p_empleado_id, p_nombre, p_email, p_telefono, p_puesto, p_sucursal,
        p_salario, p_fecha_ingreso, p_tipo_acceso, p_usuario_id
    );
    
    -- Insertar usuario si se proporcionan datos
    IF p_usuario_id IS NOT NULL AND p_username IS NOT NULL THEN
        INSERT INTO usuarios (
            id, username, password, nombre, email, empleado_id,
            full_name, phone
        ) VALUES (
            p_usuario_id, p_username, p_password, p_nombre, p_email,
            p_empleado_id, p_nombre, p_telefono
        );
    END IF;
    
    COMMIT;
END //

-- Procedimiento: Eliminar empleado y usuario relacionado
CREATE PROCEDURE sp_eliminar_empleado(
    IN p_empleado_id VARCHAR(50)
)
BEGIN
    DECLARE v_usuario_id VARCHAR(50);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener usuario_id antes de eliminar
    SELECT usuario_id INTO v_usuario_id 
    FROM empleados 
    WHERE id = p_empleado_id;
    
    -- Eliminar registros relacionados
    DELETE FROM empleados_modulos WHERE empleado_id = p_empleado_id;
    DELETE FROM empleados WHERE id = p_empleado_id;
    
    -- Eliminar usuario si existe
    IF v_usuario_id IS NOT NULL THEN
        DELETE FROM usuarios WHERE id = v_usuario_id;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

-- ================================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ================================================================================

-- Índices compuestos para búsquedas frecuentes
CREATE INDEX idx_empleados_activo_sucursal ON empleados(activo, sucursal);
CREATE INDEX idx_clientes_activo_ciudad ON clientes(activo, direccion_ciudad);
CREATE INDEX idx_proveedores_activo_tipo ON proveedores(activo, tipo_proveedor);
CREATE INDEX idx_usuarios_activo_role ON usuarios(activo, role);

-- Índices para auditoría y sesiones
CREATE INDEX idx_auditoria_fecha_tabla ON auditoria(fecha_evento, tabla);
CREATE INDEX idx_sesiones_usuario_fecha ON sesiones_usuario(usuario_id, fecha_inicio);

-- ================================================================================
-- CONFIGURACIÓN DE LA BASE DE DATOS
-- ================================================================================

-- Configurar zona horaria
SET time_zone = '-06:00'; -- Hora de México

-- Configurar charset por defecto
ALTER DATABASE supercopias_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ================================================================================
-- FIN DEL SCRIPT DE CREACIÓN
-- Fecha: 11 de octubre de 2025
-- Base de datos lista para el sistema SuperCopias
-- ================================================================================
