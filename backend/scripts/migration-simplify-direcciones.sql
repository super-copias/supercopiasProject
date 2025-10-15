-- =====================================================
-- MIGRACIÓN: Simplificar estructura de direcciones en clientes
-- Fecha: 15 de Octubre 2025
-- Descripción: Consolidar campos de dirección en un solo campo TEXT
-- =====================================================

-- PASO 1: Agregar nueva columna de dirección consolidada
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion TEXT;

-- PASO 2: Migrar datos existentes - Consolidar dirección en un solo campo
UPDATE clientes 
SET direccion = TRIM(
    CONCAT_WS(', ',
        NULLIF(direccion_calle, ''),
        NULLIF(direccion_numero, ''),
        NULLIF(direccion_colonia, ''),
        CASE 
            WHEN direccion_ciudad IS NOT NULL AND direccion_ciudad != '' 
            THEN direccion_ciudad 
            ELSE NULL 
        END,
        CASE 
            WHEN direccion_estado IS NOT NULL AND direccion_estado != '' 
            THEN direccion_estado 
            ELSE NULL 
        END
    )
)
WHERE direccion_calle IS NOT NULL 
   OR direccion_numero IS NOT NULL 
   OR direccion_colonia IS NOT NULL 
   OR direccion_ciudad IS NOT NULL 
   OR direccion_estado IS NOT NULL;

-- PASO 3: Eliminar índices de columnas que se van a eliminar
DROP INDEX IF EXISTS idx_clientes_ciudad;

-- PASO 4: Eliminar columnas innecesarias
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_calle;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_numero;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_colonia;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_ciudad;
ALTER TABLE clientes DROP COLUMN IF EXISTS direccion_estado;

-- PASO 5: Agregar constraints para validar códigos SAT
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_clientes_regimen_fiscal;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_clientes_uso_cfdi;

ALTER TABLE clientes 
ADD CONSTRAINT chk_clientes_regimen_fiscal 
CHECK (regimen_fiscal IS NULL OR regimen_fiscal ~ '^[0-9]{3}$');

ALTER TABLE clientes 
ADD CONSTRAINT chk_clientes_uso_cfdi 
CHECK (uso_cfdi IS NULL OR uso_cfdi ~ '^[A-Z][0-9]{2}$');

-- PASO 6: Verificar la migración
SELECT 
    id,
    razon_social,
    direccion,
    direccion_codigo_postal,
    regimen_fiscal,
    uso_cfdi
FROM clientes
LIMIT 10;

-- PASO 7: Mostrar resumen
SELECT 
    COUNT(*) as total_clientes,
    COUNT(direccion) as con_direccion,
    COUNT(direccion_codigo_postal) as con_codigo_postal,
    COUNT(regimen_fiscal) as con_regimen,
    COUNT(uso_cfdi) as con_uso_cfdi
FROM clientes;

COMMIT;

-- =====================================================
-- NOTAS:
-- - Los campos direccion_codigo_postal se mantienen separados
-- - La dirección ahora es un campo TEXT genérico
-- - Se agregaron validaciones para códigos SAT
-- - Los datos existentes se consolidaron automáticamente
-- =====================================================
