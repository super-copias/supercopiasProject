/**
 * Controlador de Equipos - SuperCopias
 * Gestiona todas las operaciones CRUD para equipos electrónicos
 */

const { query, queryAudit } = require('../config/database');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Obtener lista de equipos con búsqueda y paginación
 * GET /api/equipos
 */
async function listEquipos(req, res) {
  try {
    const q = (req.query.q || '').toLowerCase();
    const tipo = req.query.tipo;
    const estatus = req.query.estatus;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      SELECT 
        e.*,
        (SELECT contador_actual FROM equipos_historial_contador 
         WHERE equipo_id = e.id ORDER BY fecha_lectura DESC LIMIT 1) AS ultimo_contador,
        (SELECT fecha_servicio FROM equipos_mantenimiento 
         WHERE equipo_id = e.id ORDER BY fecha_servicio DESC LIMIT 1) AS ultimo_mantenimiento
      FROM equipos e
      WHERE e.activo = true
    `;
    
    let countQuery = 'SELECT COUNT(*) FROM equipos e WHERE e.activo = true';
    let queryParams = [];
    let paramCount = 1;
    
    // Filtros
    if (q) {
      const searchCondition = ` AND (
        LOWER(e.marca) LIKE $${paramCount} OR 
        LOWER(e.modelo) LIKE $${paramCount} OR
        LOWER(e.numero_serie) LIKE $${paramCount} OR
        LOWER(e.nombre_equipo) LIKE $${paramCount} OR
        LOWER(e.area_ubicacion) LIKE $${paramCount} OR
        LOWER(e.cliente_nombre) LIKE $${paramCount}
      )`;
      baseQuery += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${q}%`);
      paramCount++;
    }
    
    if (tipo) {
      baseQuery += ` AND e.tipo_equipo = $${paramCount}`;
      countQuery += ` AND e.tipo_equipo = $${paramCount}`;
      queryParams.push(tipo);
      paramCount++;
    }
    
    if (estatus) {
      baseQuery += ` AND e.estatus = $${paramCount}`;
      countQuery += ` AND e.estatus = $${paramCount}`;
      queryParams.push(estatus);
      paramCount++;
    }
    
    baseQuery += ` ORDER BY e.fecha_alta DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    const countParams = [...queryParams];
    queryParams.push(limit, offset);
    
    const [itemsResult, countResult] = await Promise.all([
      query(baseQuery, queryParams),
      query(countQuery, countParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    
    return res.json(
      createPaginatedResponse(itemsResult.rows, page, limit, totalItems)
    );
    
  } catch (error) {
    console.error('Error al obtener equipos:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener equipos', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener equipo por ID con detalles completos
 * GET /api/equipos/:id
 */
async function getEquipoById(req, res) {
  try {
    const { id } = req.params;
    
    const equipoQuery = `
      SELECT e.*
      FROM equipos e
      WHERE e.id = $1
    `;
    
    const caracteristicasQuery = `
      SELECT caracteristicas 
      FROM equipos_caracteristicas 
      WHERE equipo_id = $1
    `;
    
    const [equipoResult, caraResult] = await Promise.all([
      query(equipoQuery, [id]),
      query(caracteristicasQuery, [id])
    ]);
    
    if (equipoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Equipo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const equipo = equipoResult.rows[0];
    equipo.caracteristicas = caraResult.rows.length > 0 ? caraResult.rows[0].caracteristicas : {};
    
    return res.json(createResponse(true, equipo, 'Equipo obtenido correctamente'));
    
  } catch (error) {
    console.error('Error al obtener equipo:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener equipo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Crear nuevo equipo
 * POST /api/equipos
 */
async function createEquipo(req, res) {
  try {
    const {
      tipo_equipo,
      marca,
      modelo,
      numero_serie,
      nombre_equipo,
      area_ubicacion,
      cliente_nombre,
      estatus,
      responsable_nombre,
      observaciones,
      foto_url,
      caracteristicas
    } = req.body;
    
    // Validaciones básicas
    if (!tipo_equipo) {
      return res.status(400).json(
        createErrorResponse('El tipo de equipo es obligatorio', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Insertar equipo
    const insertQuery = `
      INSERT INTO equipos (
        tipo_equipo, marca, modelo, numero_serie, nombre_equipo,
        area_ubicacion, cliente_nombre, estatus, responsable_nombre, 
        observaciones, foto_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await queryAudit(insertQuery, [
      tipo_equipo,
      marca || null,
      modelo || null,
      numero_serie || null,
      nombre_equipo || null,
      area_ubicacion || null,
      cliente_nombre || null,
      estatus || 'activo',
      responsable_nombre || null,
      observaciones || null,
      foto_url || null
    ], req.user?.id, req.user?.nombre || req.user?.username);
    
    const equipo = result.rows[0];
    
    // Insertar características si se proporcionan
    if (caracteristicas && Object.keys(caracteristicas).length > 0) {
      await query(
        'INSERT INTO equipos_caracteristicas (equipo_id, caracteristicas) VALUES ($1, $2)',
        [equipo.id, JSON.stringify(caracteristicas)]
      );
    }
    
    return res.status(201).json(createResponse(equipo, 'Equipo creado exitosamente'));
    
  } catch (error) {
    console.error('Error al crear equipo:', error);
    return res.status(500).json(
      createErrorResponse('Error al crear equipo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Actualizar equipo existente
 * PUT /api/equipos/:id
 */
async function updateEquipo(req, res) {
  try {
    const { id } = req.params;
    const {
      tipo_equipo,
      marca,
      modelo,
      numero_serie,
      nombre_equipo,
      area_ubicacion,
      cliente_nombre,
      estatus,
      responsable_nombre,
      observaciones,
      foto_url,
      caracteristicas
    } = req.body;
    
    // Verificar que existe
    const checkResult = await query('SELECT id FROM equipos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Equipo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Actualizar equipo
    const updateQuery = `
      UPDATE equipos SET
        tipo_equipo = COALESCE($1, tipo_equipo),
        marca = COALESCE($2, marca),
        modelo = COALESCE($3, modelo),
        numero_serie = COALESCE($4, numero_serie),
        nombre_equipo = COALESCE($5, nombre_equipo),
        area_ubicacion = COALESCE($6, area_ubicacion),
        cliente_nombre = $7,
        estatus = COALESCE($8, estatus),
        responsable_nombre = $9,
        observaciones = $10,
        foto_url = $11,
        fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;
    
    const result = await queryAudit(updateQuery, [
      tipo_equipo,
      marca,
      modelo,
      numero_serie,
      nombre_equipo,
      area_ubicacion,
      cliente_nombre,
      estatus,
      responsable_nombre,
      observaciones,
      foto_url,
      id
    ], req.user?.id, req.user?.nombre || req.user?.username);
    
    // Actualizar características
    if (caracteristicas) {
      const caraCheck = await query(
        'SELECT id FROM equipos_caracteristicas WHERE equipo_id = $1', 
        [id]
      );
      
      if (caraCheck.rows.length > 0) {
        await query(
          'UPDATE equipos_caracteristicas SET caracteristicas = $1, fecha_modificacion = CURRENT_TIMESTAMP WHERE equipo_id = $2',
          [JSON.stringify(caracteristicas), id]
        );
      } else {
        await query(
          'INSERT INTO equipos_caracteristicas (equipo_id, caracteristicas) VALUES ($1, $2)',
          [id, JSON.stringify(caracteristicas)]
        );
      }
    }
    
    return res.json(createResponse(result.rows[0], 'Equipo actualizado exitosamente'));
    
  } catch (error) {
    console.error('Error al actualizar equipo:', error);
    return res.status(500).json(
      createErrorResponse('Error al actualizar equipo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Eliminar equipo (soft delete)
 * DELETE /api/equipos/:id
 */
async function deleteEquipo(req, res) {
  try {
    const { id } = req.params;
    
    const result = await queryAudit(
      'UPDATE equipos SET activo = false, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id], req.user?.id, req.user?.nombre || req.user?.username
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Equipo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    return res.json(createResponse(null, 'Equipo eliminado exitosamente'));
    
  } catch (error) {
    console.error('Error al eliminar equipo:', error);
    return res.status(500).json(
      createErrorResponse('Error al eliminar equipo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Agregar registro de contador
 * POST /api/equipos/:id/contador
 */
async function addContador(req, res) {
  try {
    const { id } = req.params;
    const { contador_actual, tecnico_nombre, observaciones } = req.body;
    
    if (!contador_actual) {
      return res.status(400).json(
        createErrorResponse('El contador es obligatorio', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    const insertQuery = `
      INSERT INTO equipos_historial_contador 
      (equipo_id, contador_actual, tecnico_nombre, observaciones)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      id,
      contador_actual,
      tecnico_nombre || null,
      observaciones || null
    ]);
    
    return res.status(201).json(
      createResponse(true, result.rows[0], 'Contador registrado exitosamente')
    );
    
  } catch (error) {
    console.error('Error al registrar contador:', error);
    return res.status(500).json(
      createErrorResponse('Error al registrar contador', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener historial de contadores
 * GET /api/equipos/:id/contador
 */
async function getHistorialContador(req, res) {
  try {
    const { id } = req.params;
    
    const historialQuery = `
      SELECT *
      FROM equipos_historial_contador
      WHERE equipo_id = $1
      ORDER BY fecha_lectura DESC
    `;
    
    const result = await query(historialQuery, [id]);
    
    return res.json(createResponse(true, result.rows, 'Historial de contador obtenido correctamente'));
    
  } catch (error) {
    console.error('Error al obtener historial de contador:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener historial', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Agregar registro de mantenimiento
 * POST /api/equipos/:id/mantenimiento
 */
async function addMantenimiento(req, res) {
  try {
    const { id } = req.params;
    const { descripcion, contador_servicio, costo, tecnico_nombre, proveedor_nombre, observaciones } = req.body;
    
    if (!descripcion) {
      return res.status(400).json(
        createErrorResponse('La descripción es obligatoria', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    const insertQuery = `
      INSERT INTO equipos_mantenimiento 
      (equipo_id, descripcion, contador_servicio, costo, tecnico_nombre, proveedor_nombre, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      id,
      descripcion,
      contador_servicio || null,
      costo || null,
      tecnico_nombre || null,
      proveedor_nombre || null,
      observaciones || null
    ]);
    
    return res.status(201).json(
      createResponse(true, result.rows[0], 'Mantenimiento registrado exitosamente')
    );
    
  } catch (error) {
    console.error('Error al registrar mantenimiento:', error);
    return res.status(500).json(
      createErrorResponse('Error al registrar mantenimiento', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener historial de mantenimientos
 * GET /api/equipos/:id/mantenimiento
 */
async function getHistorialMantenimiento(req, res) {
  try {
    const { id } = req.params;
    
    const historialQuery = `
      SELECT *
      FROM equipos_mantenimiento
      WHERE equipo_id = $1
      ORDER BY fecha_servicio DESC
    `;
    
    const result = await query(historialQuery, [id]);
    
    return res.json(createResponse(true, result.rows, 'Historial de mantenimiento obtenido correctamente'));
    
  } catch (error) {
    console.error('Error al obtener historial de mantenimiento:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener historial', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Agregar consumible
 * POST /api/equipos/:id/consumibles
 */
async function addConsumible(req, res) {
  try {
    const { id } = req.params;
    const {
      tipo_consumible,
      rendimiento_estimado,
      contador_instalacion,
      contador_proximo_cambio,
      observaciones
    } = req.body;
    
    if (!tipo_consumible) {
      return res.status(400).json(
        createErrorResponse('El tipo de consumible es obligatorio', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    const insertQuery = `
      INSERT INTO equipos_consumibles 
      (equipo_id, tipo_consumible, rendimiento_estimado, contador_instalacion, 
       contador_proximo_cambio, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      id,
      tipo_consumible,
      rendimiento_estimado || null,
      contador_instalacion || null,
      contador_proximo_cambio || null,
      observaciones || null
    ]);
    
    return res.status(201).json(
      createResponse(true, result.rows[0], 'Consumible registrado exitosamente')
    );
    
  } catch (error) {
    console.error('Error al registrar consumible:', error);
    return res.status(500).json(
      createErrorResponse('Error al registrar consumible', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener consumibles del equipo
 * GET /api/equipos/:id/consumibles
 */
async function getConsumibles(req, res) {
  try {
    const { id } = req.params;
    
    const consumiblesQuery = `
      SELECT * FROM equipos_consumibles
      WHERE equipo_id = $1
      ORDER BY fecha_instalacion DESC
    `;
    
    const result = await query(consumiblesQuery, [id]);
    
    return res.json(createResponse(true, result.rows, 'Consumibles obtenidos correctamente'));
    
  } catch (error) {
    console.error('Error al obtener consumibles:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener consumibles', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener estadísticas generales
 * GET /api/equipos/stats
 */
async function getStats(req, res) {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE activo = true) as total_activos,
        COUNT(*) FILTER (WHERE estatus = 'en_reparacion') as en_reparacion,
        COUNT(*) FILTER (WHERE tipo_equipo = 'fotocopiadora') as fotocopiadoras,
        COUNT(*) FILTER (WHERE tipo_equipo = 'impresora') as impresoras,
        COUNT(*) FILTER (WHERE tipo_equipo = 'pc') as pcs,
        COUNT(*) FILTER (WHERE tipo_equipo = 'laptop') as laptops
      FROM equipos
    `;
    
    const result = await query(statsQuery);
    
    return res.json(createResponse(true, result.rows[0], 'Estadísticas obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener estadísticas', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Configurar mantenimiento preventivo
 * PUT /api/equipos/:id/mantenimiento-preventivo
 */
async function configurarMantenimientoPreventivo(req, res) {
  try {
    const { id } = req.params;
    const {
      mantenimiento_intervalo_dias,
      mantenimiento_fecha_inicio,
      mantenimiento_dias_alerta
    } = req.body;
    
    // Verificar que existe el equipo
    const checkResult = await query('SELECT id FROM equipos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Equipo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Actualizar configuración de mantenimiento preventivo
    const updateQuery = `
      UPDATE equipos SET
        mantenimiento_intervalo_dias = $1,
        mantenimiento_fecha_inicio = $2,
        mantenimiento_dias_alerta = COALESCE($3, 7),
        fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, nombre_equipo, mantenimiento_intervalo_dias, 
                mantenimiento_fecha_inicio, mantenimiento_dias_alerta
    `;
    
    const result = await queryAudit(updateQuery, [
      mantenimiento_intervalo_dias,
      mantenimiento_fecha_inicio,
      mantenimiento_dias_alerta,
      id
    ], req.user?.id, req.user?.nombre || req.user?.username);
    
    return res.json(
      createResponse(true, result.rows[0], 'Mantenimiento preventivo configurado exitosamente')
    );
    
  } catch (error) {
    console.error('Error al configurar mantenimiento preventivo:', error);
    return res.status(500).json(
      createErrorResponse('Error al configurar mantenimiento preventivo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener alertas de mantenimiento
 * GET /api/equipos/alertas-mantenimiento
 */
async function getAlertasMantenimiento(req, res) {
  try {
    const querySQL = `
      WITH ultimo_mantenimiento AS (
        SELECT 
          equipo_id,
          MAX(fecha_servicio) as fecha_ultimo_servicio
        FROM equipos_mantenimiento
        GROUP BY equipo_id
      )
      SELECT 
        e.id,
        e.nombre_equipo,
        e.tipo_equipo,
        e.marca,
        e.modelo,
        e.cliente_nombre,
        e.area_ubicacion,
        e.mantenimiento_intervalo_dias,
        e.mantenimiento_fecha_inicio,
        e.mantenimiento_dias_alerta,
        COALESCE(um.fecha_ultimo_servicio, e.mantenimiento_fecha_inicio::timestamp with time zone) as fecha_referencia,
        CASE 
          WHEN um.fecha_ultimo_servicio IS NOT NULL THEN
            (um.fecha_ultimo_servicio::date + e.mantenimiento_intervalo_dias)::date
          ELSE
            (e.mantenimiento_fecha_inicio + e.mantenimiento_intervalo_dias)::date
        END as proxima_fecha_mantenimiento,
        CASE 
          WHEN um.fecha_ultimo_servicio IS NOT NULL THEN
            CURRENT_DATE - (um.fecha_ultimo_servicio::date + e.mantenimiento_intervalo_dias)::date
          ELSE
            CURRENT_DATE - (e.mantenimiento_fecha_inicio + e.mantenimiento_intervalo_dias)::date
        END as dias_diferencia
      FROM equipos e
      LEFT JOIN ultimo_mantenimiento um ON e.id = um.equipo_id
      WHERE 
        e.activo = true
        AND e.estatus = 'activo'
        AND e.mantenimiento_intervalo_dias IS NOT NULL
        AND e.mantenimiento_fecha_inicio IS NOT NULL
        AND (
          -- Mantenimiento vencido (fecha pasada)
          CASE 
            WHEN um.fecha_ultimo_servicio IS NOT NULL THEN
              (um.fecha_ultimo_servicio::date + e.mantenimiento_intervalo_dias) <= CURRENT_DATE
            ELSE
              (e.mantenimiento_fecha_inicio + e.mantenimiento_intervalo_dias) <= CURRENT_DATE
          END
          OR
          -- Mantenimiento próximo (dentro del rango de alerta)
          CASE 
            WHEN um.fecha_ultimo_servicio IS NOT NULL THEN
              (um.fecha_ultimo_servicio::date + e.mantenimiento_intervalo_dias) <= CURRENT_DATE + COALESCE(e.mantenimiento_dias_alerta, 7)
            ELSE
              (e.mantenimiento_fecha_inicio + e.mantenimiento_intervalo_dias) <= CURRENT_DATE + COALESCE(e.mantenimiento_dias_alerta, 7)
          END
        )
      ORDER BY proxima_fecha_mantenimiento ASC
    `;

    const result = await query(querySQL);
    
    // Formatear las alertas con información adicional
    const alertas = result.rows.map(equipo => {
      const diasDiferencia = equipo.dias_diferencia;
      const tipo = diasDiferencia >= 0 ? 'vencido' : 'proximo';
      const prioridad = diasDiferencia >= 0 ? 'alta' : 
                       diasDiferencia >= -3 ? 'media' : 'baja';
      
      return {
        id: equipo.id,
        nombre_equipo: equipo.nombre_equipo,
        tipo_equipo: equipo.tipo_equipo,
        marca: equipo.marca,
        modelo: equipo.modelo,
        cliente_nombre: equipo.cliente_nombre,
        area_ubicacion: equipo.area_ubicacion,
        proxima_fecha_mantenimiento: equipo.proxima_fecha_mantenimiento,
        dias_diferencia: Math.abs(diasDiferencia),
        tipo_alerta: tipo,
        prioridad: prioridad,
        mensaje: tipo === 'vencido' 
          ? `Mantenimiento vencido hace ${Math.abs(diasDiferencia)} día${Math.abs(diasDiferencia) !== 1 ? 's' : ''}`
          : `Mantenimiento en ${Math.abs(diasDiferencia)} día${Math.abs(diasDiferencia) !== 1 ? 's' : ''}`
      };
    });

    return res.json(createResponse(true, alertas, 'Alertas obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener alertas', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

module.exports = {
  listEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  addContador,
  getHistorialContador,
  addMantenimiento,
  getHistorialMantenimiento,
  addConsumible,
  getConsumibles,
  getStats,
  configurarMantenimientoPreventivo,
  getAlertasMantenimiento
};
