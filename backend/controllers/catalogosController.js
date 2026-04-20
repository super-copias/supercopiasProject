/**
 * Controlador de Catálogos - SuperCopias Backend
 * Gestiona todos los catálogos del sistema (estados, regímenes fiscales, sucursales, puestos, etc.)
 * MIGRADO A POSTGRESQL - IDs numéricas
 */

const { query, transaction } = require('../config/database');
const { reiniciarScheduler } = require('../utils/horariosScheduler');
const { 
  createResponse,
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

// ============================================================================
// CATÁLOGOS SAT (Sistema de Administración Tributaria)
// ============================================================================

/**
 * Obtener catálogo de estados de México
 * GET /api/catalogos/estados
 */
async function getEstados(req, res) {
  try {
    const result = await query('SELECT * FROM estados WHERE activo = true ORDER BY nombre');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Estados obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo estados'));
  }
}

/**
 * Obtener catálogo de regímenes fiscales
 * GET /api/catalogos/regimenes-fiscales
 */
async function getRegimenesFiscales(req, res) {
  try {
    const result = await query('SELECT * FROM regimenes_fiscales WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Regímenes fiscales obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo regímenes fiscales'));
  }
}

/**
 * Obtener catálogo de usos CFDI
 * GET /api/catalogos/usos-cfdi
 */
async function getUsosCFDI(req, res) {
  try {
    const result = await query('SELECT * FROM usos_cfdi WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Usos CFDI obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo usos CFDI'));
  }
}

/**
 * Obtener catálogo de formas de pago
 * GET /api/catalogos/formas-pago
 */
async function getFormasPago(req, res) {
  try {
    const result = await query('SELECT * FROM formas_pago WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Formas de pago obtenidas correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo formas de pago'));
  }
}

/**
 * Obtener catálogo de métodos de pago
 * GET /api/catalogos/metodos-pago
 */
async function getMetodosPago(req, res) {
  try {
    const result = await query('SELECT * FROM metodos_pago WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Métodos de pago obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo métodos de pago'));
  }
}

// ============================================================================
// CATÁLOGOS DEL SISTEMA
// ============================================================================

/**
 * Obtener catálogo de módulos del sistema
 * GET /api/catalogos/modulos
 */
async function getModulos(req, res) {
  try {
    // Siempre upsertear los módulos definidos para garantizar que existan todos
    const modulos = [
      { clave: 'dashboard',    nombre: 'Dashboard',       icono: 'fas fa-tachometer-alt', orden: 1 },
      { clave: 'empleados',   nombre: 'Empleados',       icono: 'fas fa-users',          orden: 2 },
      { clave: 'clientes',    nombre: 'Clientes',        icono: 'fas fa-user-tie',        orden: 3 },
      { clave: 'proveedores', nombre: 'Proveedores',     icono: 'fas fa-truck',           orden: 4 },
      { clave: 'inventarios', nombre: 'Inventarios',     icono: 'fas fa-boxes',           orden: 5 },
      { clave: 'punto_venta', nombre: 'Punto de Venta',  icono: 'fas fa-cash-register',   orden: 6 },
      { clave: 'equipos',     nombre: 'Equipos',         icono: 'fas fa-desktop',         orden: 7 },
      { clave: 'reportes',    nombre: 'Reportes',        icono: 'fas fa-chart-bar',       orden: 8 },
      { clave: 'facturacion', nombre: 'Facturación',     icono: 'fas fa-file-invoice',    orden: 9 },
    ];

    for (const modulo of modulos) {
      await query(`
          INSERT INTO modulos (clave, nombre, icono, activo, orden) 
          VALUES ($1, $2, $3, true, $4)
          ON CONFLICT (clave) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              icono = EXCLUDED.icono,
              activo = EXCLUDED.activo,
              orden = EXCLUDED.orden
        `, [modulo.clave, modulo.nombre, modulo.icono, modulo.orden]);
    }

    const result = await query('SELECT * FROM modulos WHERE activo = true ORDER BY orden, nombre');
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Módulos del sistema obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo módulos'));
  }
}

/**
 * Obtener sucursales
 * GET /api/catalogos/sucursales
 */
async function getSucursales(req, res) {
  try {
    const result = await query(`
      SELECT id, nombre, direccion, telefono, gerente, activa, fecha_creacion
      FROM sucursales 
      WHERE activa = true 
      ORDER BY nombre
    `);
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Sucursales obtenidas correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo sucursales'));
  }
}

/**
 * Crear nueva sucursal
 * POST /api/catalogos/sucursales
 */
async function createSucursal(req, res) {
  try {
    const { nombre, direccion, telefono, gerente } = req.body;

    // Validaciones
    if (!nombre || !direccion) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'Nombre y dirección son obligatorios'
      ));
    }

    const result = await query(`
      INSERT INTO sucursales (nombre, direccion, telefono, gerente, activa, fecha_creacion)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nombre, direccion, telefono, gerente]);

    res.status(201).json(createResponse({
      data: result.rows[0],
      message: 'Sucursal creada exitosamente'
    }));
  } catch (error) {

    if (error.code === '23505') { // Unique violation
      res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_DUPLICADOS,
        'Ya existe una sucursal con ese nombre'
      ));
    } else {
      res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error creando sucursal'));
    }
  }
}

/**
 * Obtener puestos
 * GET /api/catalogos/puestos
 */
async function getPuestos(req, res) {
  try {
    const result = await query(`
      SELECT id, nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion
      FROM puestos 
      WHERE activo = true 
      ORDER BY nombre
    `);
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Puestos obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {

    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo puestos'));
  }
}

/**
 * Crear nuevo puesto
 * POST /api/catalogos/puestos
 */
async function createPuesto(req, res) {
  try {
    const { nombre, descripcion, salario_minimo, salario_maximo } = req.body;

    // Validaciones
    if (!nombre || !descripcion) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'Nombre y descripción son obligatorios'
      ));
    }

    if (salario_minimo && salario_maximo && salario_minimo > salario_maximo) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'El salario mínimo no puede ser mayor al máximo'
      ));
    }

    const result = await query(`
      INSERT INTO puestos (nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nombre, descripcion, salario_minimo, salario_maximo]);

    res.status(201).json(createResponse({
      data: result.rows[0],
      message: 'Puesto creado exitosamente'
    }));
  } catch (error) {

    if (error.code === '23505') { // Unique violation
      res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_DUPLICADOS,
        'Ya existe un puesto con ese nombre'
      ));
    } else {
      res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error creando puesto'));
    }
  }
}

// ============================================================================
// HORARIOS DE ACCESO
// ============================================================================

/**
 * Obtener todos los horarios de acceso
 * GET /api/catalogos/horarios
 */
async function getHorarios(req, res) {
  try {
    const result = await query(
      'SELECT * FROM horarios_acceso ORDER BY hora_inicio ASC'
    );
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Horarios obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo horarios'));
  }
}

/**
 * Crear horario de acceso
 * POST /api/catalogos/horarios
 */
async function createHorario(req, res) {
  try {
    const { nombre, hora_inicio, hora_fin, activo = true } = req.body;

    if (!nombre || !hora_inicio || !hora_fin) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS,
        'Nombre, hora_inicio y hora_fin son obligatorios'
      ));
    }

    const result = await query(
      `INSERT INTO horarios_acceso (nombre, hora_inicio, hora_fin, activo, fecha_creacion)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [nombre, hora_inicio, hora_fin, activo]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Horario creado exitosamente'
    });
    // Reprogramar timers con el nuevo horario
    reiniciarScheduler().catch(() => {});
  } catch (error) {
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error creando horario'));
  }
}

/**
 * Actualizar horario de acceso
 * PUT /api/catalogos/horarios/:id
 */
async function updateHorario(req, res) {
  try {
    const { id } = req.params;
    const { nombre, hora_inicio, hora_fin, activo } = req.body;

    const existing = await query('SELECT id FROM horarios_acceso WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(CODIGOS_ERROR.NOT_FOUND, 'Horario no encontrado'));
    }

    const result = await query(
      `UPDATE horarios_acceso
       SET nombre = COALESCE($1, nombre),
           hora_inicio = COALESCE($2, hora_inicio),
           hora_fin = COALESCE($3, hora_fin),
           activo = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [nombre, hora_inicio, hora_fin, activo, id]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Horario actualizado exitosamente'
    });
    // Reprogramar timers con los tiempos actualizados
    reiniciarScheduler().catch(() => {});
  } catch (error) {
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error actualizando horario'));
  }
}

/**
 * Eliminar horario de acceso
 * DELETE /api/catalogos/horarios/:id
 */
async function deleteHorario(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM horarios_acceso WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(CODIGOS_ERROR.NOT_FOUND, 'Horario no encontrado'));
    }

    await query('DELETE FROM horarios_acceso WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      data: { id: parseInt(id) },
      message: 'Horario eliminado exitosamente'
    });
    // Reprogramar timers quitando el horario eliminado
    reiniciarScheduler().catch(() => {});
  } catch (error) {
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error eliminando horario'));
  }
}

module.exports = {
  // Catálogos SAT
  getEstados,
  getRegimenesFiscales,
  getUsosCFDI,
  getFormasPago,
  getMetodosPago,
  
  // Catálogos del Sistema
  getModulos,
  getSucursales,
  createSucursal,
  getPuestos,
  createPuesto,

  // Horarios de acceso
  getHorarios,
  createHorario,
  updateHorario,
  deleteHorario
};
