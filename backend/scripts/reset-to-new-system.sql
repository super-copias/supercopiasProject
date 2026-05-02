-- =====================================================================
-- SUPERCOPIAS - Reset a Sistema Nuevo
-- =====================================================================
-- Uso:
--   psql "CONNECTION_STRING" < backend/scripts/reset-to-new-system.sql
--
-- Qué CONSERVA:
--   ✓ Catálogos SAT (estados, usos_cfdi, formas_pago, regimenes_fiscales)
--   ✓ Catálogos de equipos (marcas, tipos, estatus)
--   ✓ Catálogos de proveedores (tipos, metodos_pago)
--   ✓ Catálogos generales (metodos_pago, cat_impuestos_facturacion)
--   ✓ Módulos del sistema
--   ✓ Puestos
--   ✓ Sucursales
--   ✓ Departamentos de inventario
--   ✓ Configuración de descuentos POS
--   ✓ Solo el usuario ADMIN (id=1)
--
-- Qué ELIMINA:
--   ✗ Todos los empleados y sus relaciones
--   ✗ Todos los clientes
--   ✗ Todos los proveedores
--   ✗ Todos los equipos y su historial
--   ✗ Todo el inventario y movimientos
--   ✗ Ventas, cotizaciones, pedidos, facturas
--   ✗ Bitácoras y auditoría
--   ✗ Sesiones de usuario
--   ✗ Usuarios de prueba (conserva solo id=1 admin)
-- =====================================================================

BEGIN;

-- Se usa CASCADE en cada TRUNCATE para resolver dependencias de FK entre
-- tablas transaccionales. Los catálogos son padres (referenciados), no hijos,
-- por lo que CASCADE nunca los afecta.
-- IMPORTANTE: usuarios NO está en esta lista para preservar el admin.
-- Se maneja por separado con DELETE WHERE id != 1 al final.

-- Deshabilitar temporalmente el trigger de auditoría para evitar referencias
-- a usuarios durante el truncado
SET session_replication_role = replica;

TRUNCATE TABLE
  public.pos_ventas_detalle,
  public.pos_cotizaciones_detalle,
  public.pos_pedidos_detalle,
  public.pos_pedidos_historial,
  public.pos_clientes_puntos_movimientos,
  public.pos_ventas,
  public.pos_cotizaciones,
  public.pos_pedidos,
  public.pos_clientes_puntos,
  public.pos_alertas_seguridad,
  public.facturas,
  public.inventarios_movimientos,
  public.inventarios,
  public.inv_tabulador_precios,
  public.equipos_consumibles,
  public.equipos_caracteristicas,
  public.equipos_historial_contador,
  public.equipos_mantenimiento,
  public.equipos,
  public.proveedores,
  public.clientes,
  public.eventos_personal,
  public.horarios_acceso,
  public.empleados_modulos,
  public.empleados,
  public.auditoria,
  public.bitacora_negocio,
  public.user_sessions
RESTART IDENTITY;

SET session_replication_role = DEFAULT;

-- ── Usuarios: conservar SOLO el admin (id = 1) ───────────────────────
DELETE FROM public.usuarios WHERE id != 1;
SELECT setval(
  pg_get_serial_sequence('public.usuarios', 'id'),
  COALESCE((SELECT MAX(id) FROM public.usuarios), 1)
);

COMMIT;

-- ── Verificación final ────────────────────────────────────────────────
SELECT tabla, filas FROM (
  SELECT 'auditoria'               AS tabla, COUNT(*) AS filas FROM public.auditoria
  UNION ALL SELECT 'bitacora_negocio',         COUNT(*) FROM public.bitacora_negocio
  UNION ALL SELECT 'clientes',                 COUNT(*) FROM public.clientes
  UNION ALL SELECT 'empleados',                COUNT(*) FROM public.empleados
  UNION ALL SELECT 'equipos',                  COUNT(*) FROM public.equipos
  UNION ALL SELECT 'facturas',                 COUNT(*) FROM public.facturas
  UNION ALL SELECT 'inventarios',              COUNT(*) FROM public.inventarios
  UNION ALL SELECT 'inventarios_movimientos',  COUNT(*) FROM public.inventarios_movimientos
  UNION ALL SELECT 'pos_ventas',               COUNT(*) FROM public.pos_ventas
  UNION ALL SELECT 'pos_pedidos',              COUNT(*) FROM public.pos_pedidos
  UNION ALL SELECT 'pos_cotizaciones',         COUNT(*) FROM public.pos_cotizaciones
  UNION ALL SELECT 'proveedores',              COUNT(*) FROM public.proveedores
  UNION ALL SELECT 'user_sessions',            COUNT(*) FROM public.user_sessions
  UNION ALL SELECT 'usuarios',                 COUNT(*) FROM public.usuarios
  -- Catálogos conservados
  UNION ALL SELECT '--- CONSERVADOS ---',      0
  UNION ALL SELECT 'estados',                  COUNT(*) FROM public.estados
  UNION ALL SELECT 'formas_pago',              COUNT(*) FROM public.formas_pago
  UNION ALL SELECT 'modulos',                  COUNT(*) FROM public.modulos
  UNION ALL SELECT 'puestos',                  COUNT(*) FROM public.puestos
  UNION ALL SELECT 'sucursales',               COUNT(*) FROM public.sucursales
  UNION ALL SELECT 'cat_marcas_equipo',        COUNT(*) FROM public.cat_marcas_equipo
  UNION ALL SELECT 'pos_descuentos_config',    COUNT(*) FROM public.pos_descuentos_config
) AS resultado
ORDER BY tabla;
