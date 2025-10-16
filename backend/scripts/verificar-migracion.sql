-- =====================================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
-- Fecha: 15 de Octubre 2025
-- Propósito: Verificar integridad de datos después de la migración
-- =====================================================

-- PASO 1: Verificar estructura de la tabla clientes
SELECT 
    'Verificando estructura de tabla clientes...' as paso;

SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

-- PASO 2: Verificar que columnas antiguas fueron eliminadas
SELECT 
    'Verificando eliminación de columnas obsoletas...' as paso;

SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Columnas obsoletas eliminadas correctamente'
        ELSE '❌ ERROR: Algunas columnas obsoletas aún existen'
    END as resultado
FROM information_schema.columns 
WHERE table_name = 'clientes' 
  AND column_name IN ('direccion_calle', 'direccion_numero', 'direccion_colonia', 
                      'direccion_ciudad', 'direccion_estado');

-- PASO 3: Verificar constraints agregados
SELECT 
    'Verificando constraints SAT...' as paso;

SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'clientes'
  AND constraint_type = 'CHECK';

-- PASO 4: Contar clientes totales
SELECT 
    'Estadísticas de clientes...' as paso;

SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN activo = true THEN 1 END) as activos,
    COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
    COUNT(direccion) as con_direccion,
    COUNT(direccion_codigo_postal) as con_codigo_postal,
    COUNT(regimen_fiscal) as con_regimen_fiscal,
    COUNT(uso_cfdi) as con_uso_cfdi,
    COUNT(rfc) as con_rfc
FROM clientes;

-- PASO 5: Identificar clientes con régimen fiscal no válido
SELECT 
    'Clientes con régimen fiscal no válido (requieren corrección)...' as paso;

SELECT 
    id,
    razon_social,
    regimen_fiscal,
    '❌ No cumple formato SAT (3 dígitos)' as problema
FROM clientes
WHERE regimen_fiscal IS NOT NULL 
  AND regimen_fiscal !~ '^[0-9]{3}$'
LIMIT 10;

-- PASO 6: Identificar clientes con uso CFDI no válido
SELECT 
    'Clientes con uso CFDI no válido (requieren corrección)...' as paso;

SELECT 
    id,
    razon_social,
    uso_cfdi,
    '❌ No cumple formato SAT (Letra + 2 dígitos)' as problema
FROM clientes
WHERE uso_cfdi IS NOT NULL 
  AND uso_cfdi !~ '^[A-Z][0-9]{2}$'
LIMIT 10;

-- PASO 7: Identificar clientes con RFC no válido
SELECT 
    'Clientes con RFC no válido (requieren corrección)...' as paso;

SELECT 
    id,
    razon_social,
    rfc,
    '❌ No cumple formato SAT' as problema
FROM clientes
WHERE rfc IS NOT NULL 
  AND LENGTH(rfc) NOT IN (12, 13)
LIMIT 10;

-- PASO 8: Verificar índices
SELECT 
    'Verificando índices de la tabla...' as paso;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'clientes'
ORDER BY indexname;

-- PASO 9: Muestra de datos migrados
SELECT 
    'Muestra de datos migrados correctamente...' as paso;

SELECT 
    id,
    razon_social,
    LEFT(direccion, 50) as direccion_preview,
    direccion_codigo_postal,
    regimen_fiscal,
    uso_cfdi,
    rfc
FROM clientes
WHERE activo = true
LIMIT 5;

-- PASO 10: Resumen final
SELECT 
    '=== RESUMEN DE VERIFICACIÓN ===' as titulo;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = 'clientes' 
                AND column_name IN ('direccion_calle', 'direccion_numero', 'direccion_colonia')) = 0
        THEN '✅ Estructura de BD actualizada correctamente'
        ELSE '❌ ERROR en estructura de BD'
    END as estructura_bd,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.table_constraints
              WHERE table_name = 'clientes' 
                AND constraint_name LIKE 'chk_clientes_regimen_fiscal') > 0
        THEN '✅ Constraints SAT agregados'
        ELSE '❌ Falta agregar constraints'
    END as constraints_sat,
    
    (SELECT COUNT(*) FROM clientes WHERE regimen_fiscal IS NOT NULL 
     AND regimen_fiscal !~ '^[0-9]{3}$') as clientes_regimen_invalido,
    
    (SELECT COUNT(*) FROM clientes WHERE uso_cfdi IS NOT NULL 
     AND uso_cfdi !~ '^[A-Z][0-9]{2}$') as clientes_cfdi_invalido,
    
    (SELECT COUNT(*) FROM clientes) as total_clientes;

-- =====================================================
-- ACCIONES RECOMENDADAS
-- =====================================================

-- Si hay clientes con datos inválidos, corregir manualmente:

-- Ejemplo para actualizar régimen fiscal:
-- UPDATE clientes 
-- SET regimen_fiscal = '601' 
-- WHERE id = [ID] AND regimen_fiscal = 'General de Ley Personas Morales';

-- Ejemplo para actualizar uso CFDI:
-- UPDATE clientes 
-- SET uso_cfdi = 'G01' 
-- WHERE id = [ID] AND uso_cfdi LIKE 'G01%';

-- =====================================================
