-- =====================================================
-- Script: Separar direcciones de entrega y facturación
-- Fecha: 11 de noviembre de 2025
-- Propósito: Renombrar 'direccion' a 'direccion_entrega' y agregar 'direccion_facturacion'
-- =====================================================

\c supercopias;

BEGIN;

-- PASO 1: Renombrar columna direccion a direccion_entrega
ALTER TABLE clientes RENAME COLUMN direccion TO direccion_entrega;

-- PASO 2: Agregar columna para dirección de facturación
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_facturacion TEXT;

-- PASO 3: Actualizar la vista vista_clientes_activos
DROP VIEW IF EXISTS vista_clientes_activos;

CREATE VIEW vista_clientes_activos AS
SELECT 
    id, rfc, razon_social, nombre_comercial, email,
    telefono, segundo_telefono,
    direccion_entrega,
    direccion_facturacion,
    direccion_codigo_postal,
    regimen_fiscal, uso_cfdi,
    fecha_registro, fecha_modificacion
FROM clientes
WHERE activo = true;

-- PASO 4: Comentarios descriptivos
COMMENT ON COLUMN clientes.direccion_entrega IS 'Dirección de entrega del cliente';
COMMENT ON COLUMN clientes.direccion_facturacion IS 'Dirección de facturación del cliente';

-- PASO 5: Verificar cambios
SELECT 
    'Columnas de dirección actualizadas:' as info;

SELECT column_name, data_type, col_description('clientes'::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_name = 'clientes' 
  AND column_name LIKE '%direccion%'
ORDER BY ordinal_position;

COMMIT;

SELECT '✓ Columnas de dirección actualizadas exitosamente' as resultado;
SELECT '✓ direccion → direccion_entrega (renombrada)' as cambio1;
SELECT '✓ direccion_facturacion (nueva columna agregada)' as cambio2;
