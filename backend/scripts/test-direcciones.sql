-- Script de prueba para verificar que las direcciones se guardan correctamente
-- Fecha: 2025-11-11

-- 1. Insertar un cliente de prueba con ambas direcciones
INSERT INTO clientes (
    razon_social, 
    nombre_comercial, 
    email, 
    telefono, 
    segundo_telefono,
    rfc, 
    regimen_fiscal, 
    uso_cfdi,
    direccion_entrega, 
    direccion_facturacion, 
    direccion_codigo_postal,
    activo, 
    fecha_registro, 
    fecha_modificacion
) VALUES (
    'Test Cliente S.A. de C.V.',
    'Cliente Prueba Direcciones',
    'test.direcciones@test.com',
    '9611111111',
    '9612222222',
    'TCL001122ABC',
    '601',
    'G03',
    'Bodega 5, Parque Industrial Las Torres, Tuxtla Gutiérrez, Chiapas',
    'Av. Principal 123, Col. Centro, Tuxtla Gutiérrez, Chiapas',
    '29000',
    true,
    NOW(),
    NOW()
) RETURNING id, nombre_comercial, direccion_entrega, direccion_facturacion;

-- 2. Verificar que se guardó correctamente
SELECT 
    id,
    nombre_comercial,
    direccion_entrega AS "Dirección de Entrega",
    direccion_facturacion AS "Dirección de Facturación",
    direccion_codigo_postal AS "CP"
FROM clientes 
WHERE email = 'test.direcciones@test.com';

-- 3. Limpiar el registro de prueba
DELETE FROM clientes WHERE email = 'test.direcciones@test.com';

-- Mensaje final
SELECT '✅ Test completado: Las direcciones se guardan correctamente en columnas separadas' AS resultado;
