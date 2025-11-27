-- Script para agregar campo 'turno' a la tabla empleados
-- Fecha: 2025-11-26
-- Descripción: Agrega columna para identificar si el empleado trabaja turno matutino o vespertino

-- Agregar columna turno
ALTER TABLE empleados 
ADD COLUMN IF NOT EXISTS turno VARCHAR(20) CHECK (turno IN ('Matutino', 'Vespertino'));

-- Comentario descriptivo
COMMENT ON COLUMN empleados.turno IS 'Turno de trabajo del empleado: Matutino o Vespertino';

-- Actualizar empleados existentes con un valor por defecto (Matutino)
UPDATE empleados 
SET turno = 'Matutino' 
WHERE turno IS NULL;

-- Hacer el campo obligatorio después de actualizar registros existentes
ALTER TABLE empleados 
ALTER COLUMN turno SET NOT NULL;

-- Verificación
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'empleados' 
AND column_name = 'turno';
