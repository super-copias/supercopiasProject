/**
 * Controlador de Configuración de Permisos - SuperCopias
 * Configuración global (fila única) del límite diario de permisos.
 * Es un límite informativo: al superarse se permite el registro y solo
 * se emite una advertencia (ver eventosPersonalController.createEvento).
 */

const { query, queryAudit } = require('../config/database');
const {
  createResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

/**
 * Obtener la configuración vigente
 * GET /api/empleados/permisos-config
 */
async function getConfig(req, res) {
  try {
    const result = await query('SELECT * FROM config_permisos WHERE id = 1');
    const config = result.rows[0] || { id: 1, limite_diario: 2 };
    return res.json(createResponse(true, config));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al obtener la configuración de permisos', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Actualizar el límite diario de permisos
 * PUT /api/empleados/permisos-config
 * Body: { limiteDiario }
 */
async function updateConfig(req, res) {
  try {
    const { limiteDiario } = req.body;
    const limite = parseInt(limiteDiario);

    if (isNaN(limite) || limite <= 0) {
      return res.status(400).json(createErrorResponse('El límite diario debe ser un número entero mayor a 0', CODIGOS_ERROR.VALIDATION_ERROR));
    }

    const result = await queryAudit(
      `INSERT INTO config_permisos (id, limite_diario, modificado_por, fecha_modificacion)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET limite_diario = $1, modificado_por = $2, fecha_modificacion = NOW()
       RETURNING *`,
      [limite, Number.isInteger(parseInt(req.user?.id)) ? parseInt(req.user.id) : null],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    registrarBitacora({
      modulo: 'empleados', accion: 'LIMITE_PERMISOS_ACTUALIZADO',
      entidad: 'config_permisos', entidadId: 1,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { limiteDiario: limite }
    });

    return res.json(createResponse(true, result.rows[0], 'Límite diario de permisos actualizado'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al actualizar la configuración de permisos', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

module.exports = { getConfig, updateConfig };
