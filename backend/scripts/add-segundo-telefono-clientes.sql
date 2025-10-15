-- =====================================================
-- Script: Agregar campo segundo_telefono a tabla clientes
-- Fecha: 15 de octubre de 2025
-- Descripción: Agrega la columna segundo_telefono para 
--              almacenar un teléfono adicional del cliente
-- =====================================================

-- Verificar si la columna ya existe antes de agregar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'segundo_telefono'
    ) THEN
        -- Agregar columna segundo_telefono
        ALTER TABLE clientes 
        ADD COLUMN segundo_telefono VARCHAR(20);
        
        RAISE NOTICE 'Columna segundo_telefono agregada exitosamente a la tabla clientes';
    ELSE
        RAISE NOTICE 'La columna segundo_telefono ya existe en la tabla clientes';
    END IF;
END $$;

-- Verificar el resultado
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes' 
  AND column_name = 'segundo_telefono';

-- Mostrar estructura actualizada de la tabla clientes
\d clientes;
