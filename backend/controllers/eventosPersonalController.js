/**
 * Controlador de Eventos de Personal - SuperCopias
 * Gestiona vacaciones, faltas, permisos y otros eventos de empleados
 */

const { query } = require('../config/database');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Helper: Calcular días entre dos fechas
 */
function calcularDias(fechaInicio, fechaFin) {
  if (!fechaFin) return 1;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diff = Math.abs(fin - inicio);
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
}

/**
 * Obtener eventos de un empleado
 * GET /api/empleados/:empleadoId/eventos
 */
async function listEventos(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const tipo = req.query.tipo; // Filtro opcional por tipo
    const anio = req.query.anio || new Date().getFullYear(); // Año actual por defecto

    let whereConditions = ['ep.empleado_id = $1'];
    let queryParams = [empleadoId];
    let paramCounter = 2;

    if (tipo) {
      whereConditions.push(`ep.tipo = $${paramCounter}`);
      queryParams.push(tipo);
      paramCounter++;
    }

    if (anio) {
      whereConditions.push(`EXTRACT(YEAR FROM ep.fecha_inicio) = $${paramCounter}`);
      queryParams.push(anio);
      paramCounter++;
    }

    const sql = `
      SELECT 
        ep.*,
        u1.username as registrado_por_nombre,
        u2.username as aprobado_por_nombre
      FROM eventos_personal ep
      LEFT JOIN usuarios u1 ON ep.registrado_por = u1.id
      LEFT JOIN usuarios u2 ON ep.aprobado_por = u2.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ep.fecha_inicio DESC, ep.created_at DESC
    `;

    const result = await query(sql, queryParams);

    res.json(createResponse(true, result.rows));
  } catch (error) {
    console.error('Error al listar eventos:', error);
    res.status(500).json(createErrorResponse(
      'Error al obtener eventos del empleado',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

/**
 * Obtener resumen de vacaciones de un empleado
 * GET /api/empleados/:empleadoId/eventos/resumen-vacaciones
 */
async function getResumenVacaciones(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const anio = req.query.anio || new Date().getFullYear();

    const sql = `
      SELECT 
        e.id as empleado_id,
        e.nombre,
        e.dias_vacaciones_sugeridos,
        COALESCE(SUM(CASE 
          WHEN ep.tipo = 'vacaciones' 
          AND ep.estado = 'aprobado'
          AND EXTRACT(YEAR FROM ep.fecha_inicio) = $2
          THEN ep.dias_totales 
          ELSE 0 
        END), 0) as dias_tomados,
        e.dias_vacaciones_sugeridos - COALESCE(SUM(CASE 
          WHEN ep.tipo = 'vacaciones' 
          AND ep.estado = 'aprobado'
          AND EXTRACT(YEAR FROM ep.fecha_inicio) = $2
          THEN ep.dias_totales 
          ELSE 0 
        END), 0) as dias_restantes,
        COALESCE(SUM(CASE 
          WHEN ep.tipo = 'vacaciones' 
          AND ep.estado = 'pendiente'
          AND EXTRACT(YEAR FROM ep.fecha_inicio) = $2
          THEN ep.dias_totales 
          ELSE 0 
        END), 0) as dias_pendientes
      FROM empleados e
      LEFT JOIN eventos_personal ep ON e.id = ep.empleado_id
      WHERE e.id = $1
      GROUP BY e.id, e.nombre, e.dias_vacaciones_sugeridos
    `;

    const result = await query(sql, [empleadoId, anio]);

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(
        'Empleado no encontrado',
        CODIGOS_ERROR.RECURSO_NO_ENCONTRADO
      ));
    }

    const resumen = result.rows[0];
    const excedeDias = parseInt(resumen.dias_tomados) > parseInt(resumen.dias_vacaciones_sugeridos);

    res.json(createResponse(true, {
      ...resumen,
      anio: parseInt(anio),
      excede_sugeridos: excedeDias,
      dias_excedentes: excedeDias ? parseInt(resumen.dias_tomados) - parseInt(resumen.dias_vacaciones_sugeridos) : 0
    }));
  } catch (error) {
    console.error('Error al obtener resumen de vacaciones:', error);
    res.status(500).json(createErrorResponse(
      'Error al obtener resumen de vacaciones',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

/**
 * Crear un nuevo evento
 * POST /api/empleados/:empleadoId/eventos
 */
async function createEvento(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const usuarioId = req.user?.id; // Del middleware de autenticación
    
    const {
      tipo,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      subtipo,
      estado = 'aprobado',
      justificada,
      con_goce_sueldo = true,
      motivo,
      observaciones
    } = req.body;

    // Validaciones
    if (!tipo || !['vacaciones', 'falta', 'permiso', 'otro'].includes(tipo)) {
      return res.status(400).json(createErrorResponse(
        'Tipo de evento inválido',
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));
    }

    if (!fecha_inicio) {
      return res.status(400).json(createErrorResponse(
        'La fecha de inicio es requerida',
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));
    }

    // Verificar que el empleado existe
    const empleadoCheck = await query('SELECT id FROM empleados WHERE id = $1', [empleadoId]);
    if (empleadoCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse(
        'Empleado no encontrado',
        CODIGOS_ERROR.RECURSO_NO_ENCONTRADO
      ));
    }

    // Calcular días/horas totales
    let diasTotales = null;
    let horasTotales = null;

    if (tipo === 'permiso' && hora_inicio && hora_fin) {
      // Calcular horas
      const [horaInicioH, horaInicioM] = hora_inicio.split(':').map(Number);
      const [horaFinH, horaFinM] = hora_fin.split(':').map(Number);
      const minutosInicio = horaInicioH * 60 + horaInicioM;
      const minutosFin = horaFinH * 60 + horaFinM;
      horasTotales = (minutosFin - minutosInicio) / 60;
    } else {
      // Calcular días
      diasTotales = calcularDias(fecha_inicio, fecha_fin);
    }

    // Insertar evento
    const sql = `
      INSERT INTO eventos_personal (
        empleado_id, tipo, fecha_inicio, fecha_fin,
        hora_inicio, hora_fin, horas_totales, dias_totales,
        subtipo, estado, justificada, con_goce_sueldo,
        motivo, observaciones, registrado_por, fecha_registro
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const result = await query(sql, [
      empleadoId, tipo, fecha_inicio, fecha_fin,
      hora_inicio, hora_fin, horasTotales, diasTotales,
      subtipo, estado, justificada, con_goce_sueldo,
      motivo, observaciones, usuarioId
    ]);

    const nuevoEvento = result.rows[0];

    // Si es vacaciones, verificar si excede días sugeridos
    let advertencia = null;
    if (tipo === 'vacaciones') {
      const resumenResult = await query(`
        SELECT 
          e.dias_vacaciones_sugeridos,
          COALESCE(SUM(ep.dias_totales), 0) as dias_tomados
        FROM empleados e
        LEFT JOIN eventos_personal ep ON e.id = ep.empleado_id 
          AND ep.tipo = 'vacaciones' 
          AND ep.estado = 'aprobado'
          AND EXTRACT(YEAR FROM ep.fecha_inicio) = EXTRACT(YEAR FROM $2::date)
        WHERE e.id = $1
        GROUP BY e.id, e.dias_vacaciones_sugeridos
      `, [empleadoId, fecha_inicio]);

      const { dias_vacaciones_sugeridos, dias_tomados } = resumenResult.rows[0];
      const totalDias = parseInt(dias_tomados);

      if (totalDias > dias_vacaciones_sugeridos) {
        advertencia = {
          mensaje: 'Se exceden los días sugeridos',
          dias_excedentes: totalDias - dias_vacaciones_sugeridos,
          dias_sugeridos: dias_vacaciones_sugeridos,
          total_con_registro: totalDias
        };
      }
    }

    res.status(201).json(createResponse(true, nuevoEvento, null, advertencia));
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json(createErrorResponse(
      'Error al crear evento',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

/**
 * Actualizar un evento
 * PUT /api/empleados/:empleadoId/eventos/:id
 */
async function updateEvento(req, res) {
  try {
    const eventoId = parseInt(req.params.id);
    const empleadoId = parseInt(req.params.empleadoId);
    
    const {
      tipo,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      subtipo,
      estado,
      justificada,
      con_goce_sueldo,
      motivo,
      observaciones
    } = req.body;

    // Verificar que el evento existe y pertenece al empleado
    const checkResult = await query(
      'SELECT * FROM eventos_personal WHERE id = $1 AND empleado_id = $2',
      [eventoId, empleadoId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse(
        'Evento no encontrado',
        CODIGOS_ERROR.RECURSO_NO_ENCONTRADO
      ));
    }

    // Calcular días/horas totales
    let diasTotales = null;
    let horasTotales = null;

    if (tipo === 'permiso' && hora_inicio && hora_fin) {
      const [horaInicioH, horaInicioM] = hora_inicio.split(':').map(Number);
      const [horaFinH, horaFinM] = hora_fin.split(':').map(Number);
      const minutosInicio = horaInicioH * 60 + horaInicioM;
      const minutosFin = horaFinH * 60 + horaFinM;
      horasTotales = (minutosFin - minutosInicio) / 60;
    } else if (fecha_inicio) {
      diasTotales = calcularDias(fecha_inicio, fecha_fin);
    }

    // Actualizar evento
    const sql = `
      UPDATE eventos_personal SET
        tipo = COALESCE($1, tipo),
        fecha_inicio = COALESCE($2, fecha_inicio),
        fecha_fin = $3,
        hora_inicio = $4,
        hora_fin = $5,
        horas_totales = $6,
        dias_totales = $7,
        subtipo = $8,
        estado = COALESCE($9, estado),
        justificada = COALESCE($10, justificada),
        con_goce_sueldo = COALESCE($11, con_goce_sueldo),
        motivo = $12,
        observaciones = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND empleado_id = $15
      RETURNING *
    `;

    const result = await query(sql, [
      tipo, fecha_inicio, fecha_fin,
      hora_inicio, hora_fin, horasTotales, diasTotales,
      subtipo, estado, justificada, con_goce_sueldo,
      motivo, observaciones,
      eventoId, empleadoId
    ]);

    res.json(createResponse(true, result.rows[0]));
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json(createErrorResponse(
      'Error al actualizar evento',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

/**
 * Eliminar un evento
 * DELETE /api/empleados/:empleadoId/eventos/:id
 */
async function deleteEvento(req, res) {
  try {
    const eventoId = parseInt(req.params.id);
    const empleadoId = parseInt(req.params.empleadoId);

    const result = await query(
      'DELETE FROM eventos_personal WHERE id = $1 AND empleado_id = $2 RETURNING id',
      [eventoId, empleadoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(
        'Evento no encontrado',
        CODIGOS_ERROR.RECURSO_NO_ENCONTRADO
      ));
    }

    res.json(createResponse(true, { id: eventoId }, 'Evento eliminado correctamente'));
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json(createErrorResponse(
      'Error al eliminar evento',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

/**
 * Obtener estadísticas de eventos por empleado
 * GET /api/empleados/:empleadoId/eventos/estadisticas
 */
async function getEstadisticas(req, res) {
  try {
    const empleadoId = parseInt(req.params.empleadoId);
    const anio = req.query.anio || new Date().getFullYear();

    const sql = `
      SELECT 
        tipo,
        COUNT(*) as cantidad,
        COALESCE(SUM(dias_totales), 0) as total_dias,
        COALESCE(SUM(horas_totales), 0) as total_horas
      FROM eventos_personal
      WHERE empleado_id = $1 
        AND estado = 'aprobado'
        AND EXTRACT(YEAR FROM fecha_inicio) = $2
      GROUP BY tipo
    `;

    const result = await query(sql, [empleadoId, anio]);

    const estadisticas = {
      anio: parseInt(anio),
      eventos: result.rows,
      resumen: {
        total_eventos: result.rows.reduce((sum, row) => sum + parseInt(row.cantidad), 0)
      }
    };

    res.json(createResponse(true, estadisticas));
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json(createErrorResponse(
      'Error al obtener estadísticas',
      CODIGOS_ERROR.ERROR_INTERNO,
      error.message
    ));
  }
}

module.exports = {
  listEventos,
  getResumenVacaciones,
  createEvento,
  updateEvento,
  deleteEvento,
  getEstadisticas
};
