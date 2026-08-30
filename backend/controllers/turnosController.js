/**
 * Controlador de Turnos - SuperCopias
 * Catálogo dinámico de turnos (nombre + horario) y asignación por día de la
 * semana para cada empleado, en reemplazo del campo fijo empleados.turno.
 */

const { query, queryAudit, transaction } = require('../config/database');
const {
  createResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7]; // 1=Lunes ... 7=Domingo

// ============================================================
// CATÁLOGO DE TURNOS
// ============================================================

/**
 * Listar turnos del catálogo
 * GET /api/empleados/turnos
 */
async function listTurnos(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const whereClause = includeInactive ? '' : 'WHERE activo = true';

    const result = await query(
      `SELECT * FROM turnos ${whereClause} ORDER BY nombre ASC`
    );

    return res.json(createResponse(true, result.rows));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al obtener el catálogo de turnos', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Crear un nuevo turno
 * POST /api/empleados/turnos
 * Body: { nombre, horaEntrada, horaSalida }
 */
async function createTurno(req, res) {
  try {
    const { nombre, horaEntrada, horaSalida } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json(createErrorResponse('El nombre del turno es requerido', CODIGOS_ERROR.REQUIRED_FIELD));
    }
    if (!horaEntrada || !horaSalida) {
      return res.status(400).json(createErrorResponse('La hora de entrada y salida son requeridas', CODIGOS_ERROR.REQUIRED_FIELD));
    }

    const existente = await query('SELECT id FROM turnos WHERE LOWER(nombre) = LOWER($1)', [nombre.trim()]);
    if (existente.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Ya existe un turno con ese nombre', CODIGOS_ERROR.ALREADY_EXISTS));
    }

    const result = await queryAudit(
      `INSERT INTO turnos (nombre, hora_entrada, hora_salida) VALUES ($1, $2, $3) RETURNING *`,
      [nombre.trim(), horaEntrada, horaSalida],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    registrarBitacora({
      modulo: 'empleados', accion: 'TURNO_CREADO',
      entidad: 'turnos', entidadId: result.rows[0].id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { nombre: nombre.trim() }
    });

    return res.status(201).json(createResponse(true, result.rows[0], 'Turno creado exitosamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al crear el turno', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Actualizar un turno existente
 * PUT /api/empleados/turnos/:id
 */
async function updateTurno(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(createErrorResponse('ID de turno inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const { nombre, horaEntrada, horaSalida, activo } = req.body;

    const checkResult = await query('SELECT * FROM turnos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Turno no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    if (nombre && nombre.trim()) {
      const duplicado = await query('SELECT id FROM turnos WHERE LOWER(nombre) = LOWER($1) AND id != $2', [nombre.trim(), id]);
      if (duplicado.rows.length > 0) {
        return res.status(400).json(createErrorResponse('Ya existe otro turno con ese nombre', CODIGOS_ERROR.ALREADY_EXISTS));
      }
    }

    const actual = checkResult.rows[0];
    const result = await queryAudit(
      `UPDATE turnos SET nombre = $1, hora_entrada = $2, hora_salida = $3, activo = $4 WHERE id = $5 RETURNING *`,
      [
        nombre && nombre.trim() ? nombre.trim() : actual.nombre,
        horaEntrada || actual.hora_entrada,
        horaSalida || actual.hora_salida,
        activo !== undefined ? activo : actual.activo,
        id
      ],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    registrarBitacora({
      modulo: 'empleados', accion: 'TURNO_ACTUALIZADO',
      entidad: 'turnos', entidadId: id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req)
    });

    return res.json(createResponse(true, result.rows[0], 'Turno actualizado exitosamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al actualizar el turno', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Activar/desactivar un turno del catálogo
 * PATCH /api/empleados/turnos/:id/toggle-estado
 */
async function toggleEstadoTurno(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(createErrorResponse('ID de turno inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const checkResult = await query('SELECT activo FROM turnos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Turno no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    const nuevoEstado = !checkResult.rows[0].activo;
    await queryAudit('UPDATE turnos SET activo = $1 WHERE id = $2', [nuevoEstado, id], req.user?.id, req.user?.nombre || req.user?.username);

    return res.json(createResponse(true, { id, activo: nuevoEstado }, `Turno ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al cambiar el estado del turno', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

// ============================================================
// ASIGNACIÓN DE TURNOS POR DÍA (por empleado)
// ============================================================

/**
 * Obtener la asignación vigente de turnos por día de un empleado (Lun-Dom)
 * GET /api/empleados/:empleadoId/turnos-dias
 */
async function getTurnosDias(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    if (isNaN(empleadoId)) {
      return res.status(400).json(createErrorResponse('ID del empleado inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const result = await query(
      `SELECT d.dia_semana, d.turno_id, t.nombre as turno_nombre, t.hora_entrada, t.hora_salida
       FROM empleados_turnos_dias d
       JOIN turnos t ON t.id = d.turno_id
       WHERE d.empleado_id = $1
       ORDER BY d.dia_semana ASC`,
      [empleadoId]
    );

    const porDia = new Map(result.rows.map(r => [r.dia_semana, r]));
    const dias = DIAS_SEMANA.map(dia => porDia.get(dia) || { dia_semana: dia, turno_id: null, turno_nombre: null });

    return res.json(createResponse(true, dias));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al obtener el horario semanal del empleado', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Asignar/actualizar el turno de cada día de la semana para un empleado.
 * PUT /api/empleados/:empleadoId/turnos-dias
 * Body: { dias: [{ diaSemana: 1-7, turnoId: number | null }] }
 * turnoId null = sin turno asignado ese día (descanso).
 * Registra en empleados_turnos_historial cada cambio detectado.
 */
async function setTurnosDias(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    if (isNaN(empleadoId)) {
      return res.status(400).json(createErrorResponse('ID del empleado inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const { dias } = req.body;
    if (!Array.isArray(dias) || dias.length === 0) {
      return res.status(400).json(createErrorResponse('Debe proporcionar la asignación de al menos un día', CODIGOS_ERROR.REQUIRED_FIELD));
    }

    for (const d of dias) {
      if (!DIAS_SEMANA.includes(parseInt(d.diaSemana))) {
        return res.status(400).json(createErrorResponse('día de la semana inválido (debe ser 1-7)', CODIGOS_ERROR.VALIDATION_ERROR));
      }
    }

    const empleadoCheck = await query('SELECT id FROM empleados WHERE id = $1', [empleadoId]);
    if (empleadoCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Empleado no encontrado', CODIGOS_ERROR.NOT_FOUND));
    }

    const usuarioIdRaw = parseInt(req.user?.id);
    const usuarioId = Number.isInteger(usuarioIdRaw) ? usuarioIdRaw : null;
    const usuarioNombre = req.user?.nombre || req.user?.username;

    const actualResult = await query(
      'SELECT dia_semana, turno_id FROM empleados_turnos_dias WHERE empleado_id = $1',
      [empleadoId]
    );
    const actualPorDia = new Map(actualResult.rows.map(r => [r.dia_semana, r.turno_id]));

    // Turnos válidos referenciados en el body (para no permitir ids inexistentes)
    const idsTurnos = [...new Set(dias.map(d => d.turnoId).filter(v => v !== null && v !== undefined))];
    let turnosValidos = new Map();
    if (idsTurnos.length > 0) {
      const turnosResult = await query('SELECT id, nombre FROM turnos WHERE id = ANY($1::int[])', [idsTurnos]);
      turnosValidos = new Map(turnosResult.rows.map(t => [t.id, t.nombre]));
      const faltantes = idsTurnos.filter(id => !turnosValidos.has(id));
      if (faltantes.length > 0) {
        return res.status(400).json(createErrorResponse('Uno o más turnos seleccionados no existen', CODIGOS_ERROR.VALIDATION_ERROR));
      }
    }

    await transaction(async (txQuery) => {
      for (const d of dias) {
        const diaSemana = parseInt(d.diaSemana);
        const turnoId = d.turnoId !== undefined && d.turnoId !== null ? parseInt(d.turnoId) : null;
        const existePrevio = actualPorDia.has(diaSemana);
        // Un día sin registro equivale a "descanso" (turno_id null); así evitamos
        // generar historial cuando un día en descanso se "reasigna" a descanso.
        const anterior = existePrevio ? actualPorDia.get(diaSemana) : null;

        if (anterior === turnoId) continue; // sin cambios reales

        if (turnoId === null) {
          await txQuery('DELETE FROM empleados_turnos_dias WHERE empleado_id = $1 AND dia_semana = $2', [empleadoId, diaSemana]);
          await txQuery(
            `INSERT INTO empleados_turnos_historial (empleado_id, dia_semana, turno_id, turno_nombre, accion, usuario_id, usuario_nombre)
             VALUES ($1, $2, NULL, NULL, 'eliminado', $3, $4)`,
            [empleadoId, diaSemana, usuarioId, usuarioNombre]
          );
        } else {
          await txQuery(
            `INSERT INTO empleados_turnos_dias (empleado_id, dia_semana, turno_id, fecha_modificacion)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (empleado_id, dia_semana)
             DO UPDATE SET turno_id = $3, fecha_modificacion = NOW()`,
            [empleadoId, diaSemana, turnoId]
          );
          await txQuery(
            `INSERT INTO empleados_turnos_historial (empleado_id, dia_semana, turno_id, turno_nombre, accion, usuario_id, usuario_nombre)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [empleadoId, diaSemana, turnoId, turnosValidos.get(turnoId), existePrevio ? 'modificado' : 'asignado', usuarioId, usuarioNombre]
          );
        }
      }
    });

    registrarBitacora({
      modulo: 'empleados', accion: 'TURNOS_DIAS_ACTUALIZADOS',
      entidad: 'empleados_turnos_dias', entidadId: empleadoId,
      usuarioId, usuarioNombre,
      ip: getIp(req), detalle: { dias }
    });

    const actualizado = await query(
      `SELECT d.dia_semana, d.turno_id, t.nombre as turno_nombre, t.hora_entrada, t.hora_salida
       FROM empleados_turnos_dias d
       JOIN turnos t ON t.id = d.turno_id
       WHERE d.empleado_id = $1
       ORDER BY d.dia_semana ASC`,
      [empleadoId]
    );
    const porDia = new Map(actualizado.rows.map(r => [r.dia_semana, r]));
    const resultado = DIAS_SEMANA.map(dia => porDia.get(dia) || { dia_semana: dia, turno_id: null, turno_nombre: null });

    return res.json(createResponse(true, resultado, 'Horario semanal actualizado exitosamente'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al actualizar el horario semanal', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

/**
 * Historial de cambios de turno de un empleado
 * GET /api/empleados/:empleadoId/turnos-historial
 */
async function listTurnosHistorial(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    if (isNaN(empleadoId)) {
      return res.status(400).json(createErrorResponse('ID del empleado inválido', CODIGOS_ERROR.INVALID_FORMAT));
    }

    const result = await query(
      `SELECT * FROM empleados_turnos_historial WHERE empleado_id = $1 ORDER BY fecha_cambio DESC, id DESC`,
      [empleadoId]
    );

    return res.json(createResponse(true, result.rows));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Error al obtener el historial de turnos', CODIGOS_ERROR.DATABASE_ERROR));
  }
}

module.exports = {
  listTurnos,
  createTurno,
  updateTurno,
  toggleEstadoTurno,
  getTurnosDias,
  setTurnosDias,
  listTurnosHistorial
};
