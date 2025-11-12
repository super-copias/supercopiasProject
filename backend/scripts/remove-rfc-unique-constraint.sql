-- =====================================================
-- Script de Migración: Eliminar restricción UNIQUE de RFC en clientes
-- =====================================================
-- Fecha: 11 de noviembre de 2025
-- Propósito: Permitir que múltiples clientes puedan tener el mismo RFC
-- 
-- IMPORTANTE: Este script modifica la estructura de la base de datos.
-- Se recomienda hacer un respaldo antes de ejecutarlo.
-- =====================================================

-- Conectar a la base de datos supercopias
\c supercopias;

BEGIN;

-- 1. Eliminar el índice único de RFC en la tabla clientes
DROP INDEX IF EXISTS idx_clientes_rfc;

-- 2. Eliminar el constraint UNIQUE de RFC
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_rfc_key;

-- 3. Eliminar el constraint CHECK de RFC (si existe)
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_clientes_rfc;

-- 4. Crear un índice normal (no único) para mejorar búsquedas por RFC
CREATE INDEX IF NOT EXISTS idx_clientes_rfc ON clientes USING btree (rfc);

COMMIT;

-- Verificar los cambios
SELECT 
    'Constraints de la tabla clientes:' as info;
SELECT 
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM 
    pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE 
    nsp.nspname = 'public'
    AND rel.relname = 'clientes'
ORDER BY 
    con.conname;

SELECT 
    'Índices de la tabla clientes:' as info;
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'clientes'
    AND schemaname = 'public'
ORDER BY
    indexname;

-- Mensaje de confirmación
SELECT '✓ Migración completada exitosamente' as resultado;
SELECT '✓ Ahora múltiples clientes pueden tener el mismo RFC' as info;
