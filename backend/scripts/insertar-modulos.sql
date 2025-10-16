-- Insertar módulos básicos del sistema
INSERT INTO modulos (clave, nombre, icono, activo, orden) VALUES
('dashboard', 'Dashboard', 'fas fa-tachometer-alt', true, 1),
('empleados', 'Empleados', 'fas fa-users', true, 2),
('clientes', 'Clientes', 'fas fa-user-tie', true, 3),
('proveedores', 'Proveedores', 'fas fa-truck', true, 4),
('inventarios', 'Inventarios', 'fas fa-boxes', true, 5),
('punto_venta', 'Punto de Venta', 'fas fa-cash-register', true, 6),
('equipos', 'Equipos', 'fas fa-desktop', true, 7),
('reportes', 'Reportes', 'fas fa-chart-bar', true, 8),
('configuracion', 'Configuración', 'fas fa-cogs', true, 9)
ON CONFLICT (clave) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    icono = EXCLUDED.icono,
    activo = EXCLUDED.activo,
    orden = EXCLUDED.orden;