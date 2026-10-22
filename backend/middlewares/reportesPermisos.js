/**
 * Control de acceso por reporte - SuperCopias
 * empleados.reportes_permitidos = NULL → acceso a todos los reportes.
 */

const { query } = require('../config/database');
const { REPORTES_CATALOGO, REPORTES_IDS } = require('../utils/reportesCatalogo');

/**
 * Devuelve los ids de reportes a los que el usuario autenticado tiene acceso.
 * - Usuarios sin empleado vinculado (p. ej. administrador raíz) ven todos.
 * - Empleados no administradores necesitan el módulo de reportes.
 */
async function obtenerReportesPermitidos(user) {
  const usuarioId = parseInt(user?.id);
  if (!Number.isInteger(usuarioId)) return [...REPORTES_IDS];

  // empleados_modulos.modulo puede guardar la clave o el id del módulo
  const result = await query(
    `SELECT e.id AS empleado_id, e.tipo_acceso, e.reportes_permitidos,
            EXISTS (
              SELECT 1 FROM empleados_modulos em
              LEFT JOIN modulos m ON em.modulo = m.id::text
              WHERE em.empleado_id = e.id AND em.acceso = true
                AND (em.modulo = 'reportes' OR m.clave = 'reportes')
            ) AS tiene_modulo_reportes
     FROM usuarios u
     LEFT JOIN empleados e ON e.id = u.empleado_id
     WHERE u.id = $1`,
    [usuarioId]
  );
  const fila = result.rows[0];
  if (!fila || !fila.empleado_id) return [...REPORTES_IDS];
  if (fila.tipo_acceso !== 'completo' && !fila.tiene_modulo_reportes) return [];

  const permitidos = fila.reportes_permitidos;
  if (!Array.isArray(permitidos)) return [...REPORTES_IDS];
  return REPORTES_IDS.filter(id => permitidos.includes(id));
}

/**
 * Middleware: bloquea con 403 si el usuario no tiene permitido el reporte.
 */
function requireReporte(reporteId) {
  return async function (req, res, next) {
    try {
      const permitidos = await obtenerReportesPermitidos(req.user);
      if (!permitidos.includes(reporteId)) {
        const reporte = REPORTES_CATALOGO.find(r => r.id === reporteId);
        return res.status(403).json({
          success: false,
          error: {
            code: 'REPORTE_NO_PERMITIDO',
            message: `No tienes permiso para acceder al reporte "${reporte?.titulo || reporteId}"`
          },
          message: `No tienes permiso para acceder al reporte "${reporte?.titulo || reporteId}"`,
          timestamp: new Date().toISOString()
        });
      }
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Error al verificar permisos del reporte' },
        message: 'Error al verificar permisos del reporte',
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = { obtenerReportesPermitidos, requireReporte };
