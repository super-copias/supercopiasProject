-- =====================================================
-- Script: Eliminar columnas de dirección obsoletas
-- Fecha: 11 de noviembre de 2025
-- Propósito: Eliminar columnas de dirección detallada que no se usan
-- =====================================================
-- 
-- CONTEXTO:
-- El sistema ahora usa un solo campo 'direccion' (TEXT) para almacenar
-- la dirección completa. Las columnas individuales (calle, numero, colonia,
-- ciudad, estado) ya no se usan en el código.
-- 
-- IMPORTANTE: Este script elimina datos. Hacer respaldo antes de ejecutar.
-- =====================================================

-- Conectar a la base de datos
\c supercopias;

BEGIN;

-- Verificar si hay datos en estas columnas antes de eliminar
SELECT 
    'Estado actual de las columnas a eliminar:' as info;

SELECT 
    COUNT(*) as total_clientes,
    COUNT(direccion_calle) FILTER (WHERE direccion_calle IS NOT NULL AND direccion_calle != '') as con_calle,
    COUNT(direccion_numero) FILTER (WHERE direccion_numero IS NOT NULL AND direccion_numero != '') as con_numero,
    COUNT(direccion_colonia) FILTER (WHERE direccion_colonia IS NOT NULL AND direccion_colonia != '') as con_colonia,
    COUNT(direccion_ciudad) FILTER (WHERE direccion_ciudad IS NOT NULL AND direccion_ciudad != '') as con_ciudad,
    COUNT(direccion_estado) FILTER (WHERE direccion_estado IS NOT NULL AND direccion_estado != '') as con_estado,
    COUNT(direccion) FILTER (WHERE direccion IS NOT NULL AND direccion != '') as con_direccion_consolidada
FROM clientes;

-- PASO 1: Migrar datos si existen (por precaución)
-- Solo actualizar si el campo consolidado está vacío pero hay datos en campos individuales
UPDATE clientes 
SET direccion = TRIM(
    CONCAT_WS(', ',
        NULLIF(TRIM(direccion_calle), ''),
        NULLIF(TRIM(direccion_numero), ''),
        NULLIF(TRIM(direccion_colonia), ''),
        NULLIF(TRIM(direccion_ciudad), ''),
        NULLIF(TRIM(direccion_estado), '')
    )
)
WHERE (direccion IS NULL OR direccion = '')
  AND (
      (direccion_calle IS NOT NULL AND direccion_calle != '') OR
      (direccion_numero IS NOT NULL AND direccion_numero != '') OR
      (direccion_colonia IS NOT NULL AND direccion_colonia != '') OR
      (direccion_ciudad IS NOT NULL AND direccion_ciudad != '') OR
      (direccion_estado IS NOT NULL AND direccion_estado != '')
  );

-- Mostrar cuántos registros se migraron
SELECT 
    'Registros migrados al campo direccion consolidado:' as info,
    COUNT(*) as cantidad
FROM clientes
WHERE direccion IS NOT NULL AND direccion != '';

-- PASO 2: Eliminar columnas obsoletas
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_calle CASCADE;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_numero CASCADE;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_colonia CASCADE;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_ciudad CASCADE;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_estado CASCADE;

-- PASO 3: Verificar columnas restantes
SELECT 
    'Columnas de dirección después de la limpieza:' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes' 
  AND column_name LIKE 'direccion%'
ORDER BY ordinal_position;

COMMIT;

-- Mensaje de confirmación
SELECT '✓ Columnas de dirección obsoletas eliminadas exitosamente' as resultado;
SELECT '✓ Se mantienen: direccion (TEXT) y direccion_codigo_postal' as info;

-- =====================================================
-- RESULTADO ESPERADO:
-- Solo deben quedar 2 columnas de dirección:
-- - direccion (TEXT) - Dirección completa
-- - direccion_codigo_postal (VARCHAR) - Código postal
-- =====================================================
