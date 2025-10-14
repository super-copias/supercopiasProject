-- Script para corregir el nombre del módulo de punto de venta
-- De 'puntoventa' a 'punto_venta' para consistencia

-- Actualizar la clave del módulo
UPDATE modulos SET clave = 'punto_venta' WHERE clave = 'puntoventa';

-- Actualizar las referencias en empleados_modulos
UPDATE empleados_modulos SET modulo = 'punto_venta' WHERE modulo = 'puntoventa';

-- Verificar los cambios
SELECT id, clave, nombre, activo, orden FROM modulos ORDER BY orden;
