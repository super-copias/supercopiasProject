-- Script para verificar que los clientes de prueba se cargaron correctamente
-- Ejecutar DESPUÉS de subir el archivo test_direcciones.xlsx

SELECT 
    id,
    nombre_comercial AS "Cliente",
    direccion_entrega AS "📦 Dirección de Entrega",
    direccion_facturacion AS "📄 Dirección de Facturación",
    CASE 
        WHEN direccion_entrega = direccion_facturacion THEN '✅ Iguales'
        ELSE '🔄 Diferentes'
    END AS "Estado"
FROM clientes 
WHERE email IN ('prueba1@test.com', 'prueba2@test.com')
ORDER BY id DESC;

-- Limpiar los registros de prueba después de verificar
-- DELETE FROM clientes WHERE email IN ('prueba1@test.com', 'prueba2@test.com');
