-- =====================================================
-- SCRIPT DE DATOS DE PRUEBA - SuperCopias
-- =====================================================
-- Este script contiene datos de prueba para poblar la base de datos
-- con información de ejemplo para desarrollo y testing
-- =====================================================
-- IMPORTANTE: Ejecutar DESPUÉS de la migración principal (BD_SUPERCOPIAS.sql)
-- =====================================================

\echo '==================================================================================='
\echo 'INSERTANDO DATOS DE PRUEBA - SuperCopias'
\echo '==================================================================================='

-- =====================================================
-- CLIENTES DE PRUEBA (5 registros)
-- =====================================================
\echo 'Insertando clientes de prueba...'

INSERT INTO clientes (rfc, razon_social, nombre_comercial, email, telefono, direccion_codigo_postal, regimen_fiscal, uso_cfdi, activo, direccion_entrega, segundo_telefono) VALUES
('PEGJ850315ABC', 'Juan Perez Garcia', 'Juan Perez Garcia', 'juan.perez@email.com', '9611234567', '29000', '612', 'G03', true, 'Av. Central 123, Col. Centro, Tuxtla Gutierrez, Chiapas', '9611234568'),
('CLS920810XYZ', 'Comercializadora Lopez S.A. de C.V.', 'Comercializadora Lopez S.A. de C.V.', 'ventas@comlopez.com', '9612345678', '29030', '601', 'G01', true, 'Blvd. Belisario Dominguez 456, Col. Moctezuma, Tuxtla Gutierrez, Chiapas', NULL),
('GOHM750425DEF', 'Maria Gonzalez Hernandez', 'Maria Gonzalez Hernandez', 'maria.gonzalez@email.com', '9673456789', '29200', '612', 'G03', true, 'Real de Guadalupe 789, Centro, San Cristobal de las Casas, Chiapas', '9673456790'),
('CSP180920E56', 'Consultoria y Servicios Profesionales Maya S.C.', 'Consultores Maya', 'contacto@consultoresmaya.com', '9612000005', '29050', '612', 'G01', true, 'Av. Universidad, 321, Universitaria, Tuxtla Gutierrez, Chiapas', NULL),
('DCH170215G78', 'Distribuidora de Chiapas S.A. de C.V.', 'Distribuidora Chiapas', 'ventas@districhiapas.com', '9612000007', '29020', '601', 'G03', true, 'Blvd. Los Castillos, 456, Las Flores, Tuxtla Gutierrez, Chiapas', NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PROVEEDORES DE PRUEBA (Datos reales de la BD local)
-- =====================================================
\echo 'Insertando proveedores de prueba...'

INSERT INTO proveedores (nombre_comercial, razon_social, rfc, tipo_proveedor, activo, nombre_contacto, telefono, email, pagina_web, direccion, metodo_pago_principal, cuenta_bancaria, dias_credito, notas, fecha_registro) VALUES
('Papeleria El Estudiante', 'Papeleria El Estudiante S.A. de C.V.', 'PES910315ABC', 'Productos', true, 'Maria Gonzalez', '555-1001', 'ventas@estudiantepapeleria.com', 'www.papeleriaestudiante.com', 'Av. Universidad 123, Col. Centro, Ciudad de Mexico, CDMX, 06000, Mexico', 'Transferencia', '012345678901234567', 30, 'Proveedor principal de papeleria y suministros de oficina', '2023-01-10'),
('Tecnologia y Sistemas', 'Tecnologia y Sistemas S.A. de C.V.', 'TYS850420DEF', 'Servicios', true, 'Ing. Carlos Ramirez', '555-1002', 'soporte@tecnologiasistemas.com', 'www.tecnologiaysistemas.com', 'Calle Tecnologia 456, Col. Moderna, Ciudad de Mexico, CDMX, 03100, Mexico', 'Transferencia', NULL, 15, 'Mantenimiento de equipos de computo y redes', '2023-02-05'),
('Limpieza Integral', 'Servicios de Limpieza Integral S.A. de C.V.', 'SLI780630GHI', 'Servicios', true, 'Patricia Herrera', '555-1003', 'admin@limpiezaintegral.com', NULL, 'Av. Servicios 789, Col. Industrial, Ciudad de Mexico, CDMX, 07300, Mexico', 'Efectivo', NULL, 0, 'Servicio de limpieza diario para oficinas', '2023-03-12'),
('Toners Express', 'Insumos y Toners Express S.A. de C.V.', 'ITE920815JKL', 'Productos', true, 'Lic. Roberto Silva', '555-1004', 'pedidos@tonersexpress.com', 'www.tonersexpress.com', 'Blvd. Insumos 321, Col. Comercial, Ciudad de Mexico, CDMX, 06500, Mexico', 'Transferencia', '098765432109876543', 45, 'Cartuchos, toners y consumibles para impresoras', '2023-04-18'),
('Capacitacion Pro', 'Capacitacion Empresarial Pro S.C.', 'CEP870925MNO', 'Servicios', true, 'Mtra. Ana Lopez', '555-1005', 'cursos@capacitacionpro.com', 'www.capacitacionpro.com', 'Av. Capacitacion 654, Col. Educativa, Ciudad de Mexico, CDMX, 03900, Mexico', 'Transferencia', NULL, 0, 'Cursos de desarrollo profesional y tecnico', '2023-05-22')
ON CONFLICT DO NOTHING;

-- =====================================================
-- INVENTARIOS DE PRUEBA (Datos reales de la BD local)
-- =====================================================
\echo 'Insertando inventarios de prueba...'

INSERT INTO inventarios (tipo, nombre, categoria, marca, modelo, codigo_sku, proveedor_id, estatus, existencia_actual, unidad_medida, stock_minimo, stock_maximo, ubicacion_fisica, costo_compra, precio_venta, costo_promedio, activo) VALUES
('venta', 'Lapicero BIC 0.5', 'Papeleria', 'BIC', '0.5', 'LAP-BIC-05', 1, 'activo', 10.00, 'pieza', 3.00, 50.00, 'Estante A1', 5.00, 10.00, 5.00, true),
('insumo', 'Papel Bond Carta', 'Papel Operativo', 'BIC', 'BOND', 'PAP-BOND-CTA', 1, 'activo', 5.00, 'caja', 2.00, 20.00, 'Bodega Principal', 550.00, NULL, 550.00, true),
('venta', 'Toner HP 85A', 'Consumibles', 'HP', '85A', 'TON-HP-85A', 4, 'activo', 3.00, 'pieza', 2.00, 15.00, 'Vitrina 1', 450.00, 850.00, 450.00, true),
('insumo', 'Papel Fotogr fix Brillante', 'Hojas Especiales', NULL, 'Glossy A4', 'PAP-FOTO-A4', 1, 'activo', 8.00, 'paquete', 3.00, 25.00, 'Estante B2', 180.00, NULL, 180.00, true),
('venta', 'Engargolado Pasta Negra', 'Engargolado', NULL, 'Oficio', 'ENG-PAST-NEG', NULL, 'activo', 15.00, 'pieza', 5.00, 100.00, 'Estante C1', 8.00, 15.00, 8.00, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- EQUIPOS DE PRUEBA (5 registros con características variadas)
-- =====================================================
\echo 'Insertando equipos de prueba...'

INSERT INTO equipos (tipo_equipo, marca, modelo, numero_serie, nombre_equipo, area_ubicacion, cliente_nombre, estatus, responsable_nombre, observaciones, fecha_alta, mantenimiento_intervalo_dias, mantenimiento_fecha_inicio, activo) VALUES
('fotocopiadora', 'Canon', 'imageRUNNER 2525i', 'CNR2525-001-2023', 'Copiadora Principal', 'Area de Produccion', NULL, 'activo', 'Juan Perez', 'Equipo principal para volumen alto de copias', CURRENT_TIMESTAMP, 90, '2024-01-15', true),
('impresora', 'HP', 'LaserJet Pro M404dn', 'HPM404-045-2023', 'Impresora Oficina 1', 'Oficina Administrativa', NULL, 'activo', 'Maria Lopez', 'Impresora para documentos administrativos', CURRENT_TIMESTAMP, 120, '2024-02-01', true),
('pc', 'Dell', 'OptiPlex 7090', 'DELL7090-123', 'PC Recepcion', 'Recepcion', NULL, 'activo', 'Carlos Ramirez', 'Equipo de atencion al cliente', CURRENT_TIMESTAMP, NULL, NULL, true),
('laptop', 'Lenovo', 'ThinkPad E14', 'LNVE14-789', 'Laptop Gerencia', 'Gerencia', NULL, 'activo', 'Ana Martinez', 'Equipo movil para gerencia', CURRENT_TIMESTAMP, NULL, NULL, true),
('router', 'TP-Link', 'Archer AX50', 'TPAX50-456', 'Router Principal', 'Sala de Servidores', NULL, 'activo', 'Luis Gomez', 'Router principal de red empresarial', CURRENT_TIMESTAMP, 180, '2024-03-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Actualizar secuencias para evitar conflictos
-- =====================================================
\echo 'Actualizando secuencias...'

SELECT setval('clientes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM clientes), true);
SELECT setval('proveedores_id_seq', (SELECT COALESCE(MAX(id), 1) FROM proveedores), true);
SELECT setval('inventarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inventarios), true);
SELECT setval('equipos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM equipos), true);

\echo '==================================================================================='
\echo 'DATOS DE PRUEBA INSERTADOS EXITOSAMENTE'
\echo '==================================================================================='
\echo 'Resumen:'
\echo '- 5 Clientes de prueba'
\echo '- 5 Proveedores'
\echo '- 5 Articulos de inventario'
\echo '- 5 Equipos con caracteristicas variadas'
\echo '==================================================================================='
