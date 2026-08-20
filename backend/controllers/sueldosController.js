/**
 * Controlador de Sueldos - SuperCopias
 * Historial de sueldos por empleado. Los registros permiten edición y
 * eliminación DEFINITIVA (no soft-delete). empleados.salario siempre
 * refleja el registro con la fecha_asignacion más reciente.
 */

const { query, queryAudit } = require('../config/database');
const {
  createResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

/**
 * Recalcula empleados.salario a partir del registro de historial con la
 * fecha_asignacion más reciente (desempate por id) y lo persiste.
 * @returns {number|null} El nuevo salario vigente (null si no queda historial)
 */
async function sincronizarSalarioEmpleado(empleadoId, usuarioId, usuarioNombre) {
  const result = await query(
    `SELECT monto FROM empleados_sueldos_historial
     WHERE empleado_id = $1
     ORDER BY fecha_asignacion DESC, id DESC
     LIMIT 1`,
    [empleadoId]
  );

  const nuevoSalario = result.rows.length > 0 ? result.rows[0].monto : null;

  await queryAudit(
    'UPDATE empleados SET salario = $1, fecha_modificacion = NOW() WHERE id = $2',
    [nuevoSalario, empleadoId],
    usuarioId, usuarioNombre
  );

  return nuevoSalario;
}

/**
 * Listar historial de sueldos de un empleado
 * GET /api/empleados/:empleadoId/sueldos
 */
async function listSueldos(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    if (isNaN(empleadoId)) {
      return res.status(400).json(createErrorResponse('ID del empleado inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const result = await query(
      `SELECT h.*, u.username as registrado_por_nombre
       FROM empleados_sueldos_historial h
       LEFT JOIN usuarios u ON h.registrado_por = u.id
       WHERE h.empleado_id = $1
       ORDER BY h.fecha_asignacion DESC, h.id DESC`,
      [empleadoId]
    );

    return res.json(createResponse(true, result.rows));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al obtener el historial de sueldos', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Crear un nuevo registro de sueldo
 * POST /api/empleados/:empleadoId/sueldos
 * Body: { monto, fechaAsignacion, observaciones }
 */
async function createSueldo(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    if (isNaN(empleadoId)) {
      return res.status(400).json(createErrorResponse('ID del empleado inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const { monto, fechaAsignacion, observaciones } = req.body;

    if (monto === undefined || monto === null || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      return res.status(400).json(createErrorResponse('El monto es requerido y debe ser mayor a 0', CODIGOS_ERROR.VALIDATION_ERROR));
    }
    if (!fechaAsignacion) {
      return res.status(400).json(createErrorResponse('La fecha de asignación es requerida', CODIGOS_ERROR.REQUIRED_FIELD));
    }

    const empleadoCheck = await query('SELECT id FROM empleados WHERE id = $1', [empleadoId]);
    if (empleadoCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Empleado no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    const registradoPor = Number.isInteger(parseInt(req.user?.id)) ? parseInt(req.user.id) : null;

    const result = await queryAudit(
      `INSERT INTO empleados_sueldos_historial (empleado_id, monto, fecha_asignacion, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [empleadoId, parseFloat(monto), fechaAsignacion, observaciones || null, registradoPor],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    const salarioVigente = await sincronizarSalarioEmpleado(empleadoId, req.user?.id, req.user?.nombre || req.user?.username);

    registrarBitacora({
      modulo: 'empleados', accion: 'SUELDO_REGISTRADO',
      entidad: 'empleados_sueldos_historial', entidadId: result.rows[0].id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { empleadoId, monto: parseFloat(monto) }
    });

    return res.status(201).json(createResponse(true, { ...result.rows[0], salario_vigente: salarioVigente }, 'Sueldo registrado exitosamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al registrar el sueldo', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Actualizar un registro de sueldo existente
 * PUT /api/empleados/:empleadoId/sueldos/:id
 */
async function updateSueldo(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const id = parseInt(req.params.id);
    if (isNaN(empleadoId) || isNaN(id)) {
      return res.status(400).json(createErrorResponse('ID inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const { monto, fechaAsignacion, observaciones } = req.body;

    if (monto === undefined || monto === null || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      return res.status(400).json(createErrorResponse('El monto es requerido y debe ser mayor a 0', CODIGOS_ERROR.VALIDATION_ERROR));
    }
    if (!fechaAsignacion) {
      return res.status(400).json(createErrorResponse('La fecha de asignación es requerida', CODIGOS_ERROR.REQUIRED_FIELD));
    }

    const checkResult = await query(
      'SELECT id FROM empleados_sueldos_historial WHERE id = $1 AND empleado_id = $2',
      [id, empleadoId]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Registro de sueldo no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    const result = await queryAudit(
      `UPDATE empleados_sueldos_historial
       SET monto = $1, fecha_asignacion = $2, observaciones = $3
       WHERE id = $4 AND empleado_id = $5
       RETURNING *`,
      [parseFloat(monto), fechaAsignacion, observaciones || null, id, empleadoId],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    const salarioVigente = await sincronizarSalarioEmpleado(empleadoId, req.user?.id, req.user?.nombre || req.user?.username);

    registrarBitacora({
      modulo: 'empleados', accion: 'SUELDO_ACTUALIZADO',
      entidad: 'empleados_sueldos_historial', entidadId: id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { empleadoId, monto: parseFloat(monto) }
    });

    return res.json(createResponse(true, { ...result.rows[0], salario_vigente: salarioVigente }, 'Sueldo actualizado exitosamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al actualizar el sueldo', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Eliminar DEFINITIVAMENTE un registro de sueldo
 * DELETE /api/empleados/:empleadoId/sueldos/:id
 */
async function deleteSueldo(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const id = parseInt(req.params.id);
    if (isNaN(empleadoId) || isNaN(id)) {
      return res.status(400).json(createErrorResponse('ID inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const result = await queryAudit(
      'DELETE FROM empleados_sueldos_historial WHERE id = $1 AND empleado_id = $2 RETURNING id',
      [id, empleadoId],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Registro de sueldo no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    const salarioVigente = await sincronizarSalarioEmpleado(empleadoId, req.user?.id, req.user?.nombre || req.user?.username);

    registrarBitacora({
      modulo: 'empleados', accion: 'SUELDO_ELIMINADO',
      entidad: 'empleados_sueldos_historial', entidadId: id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { empleadoId }
    });

    return res.json(createResponse(true, { id, salario_vigente: salarioVigente }, 'Registro de sueldo eliminado definitivamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al eliminar el sueldo', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

module.exports = {
  listSueldos,
  createSueldo,
  updateSueldo,
  deleteSueldo,
  sincronizarSalarioEmpleado
};
