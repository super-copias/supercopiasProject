/**
 * Controlador de Catálogos - SuperCopias Backend
 * Gestiona todos los catálogos del sistema (estados, regímenes fiscales, sucursales, puestos, etc.)
 * MIGRADO A POSTGRESQL - IDs numéricas
 */

const { query, transaction } = require('../db');
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Estados obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo estados:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Regímenes fiscales obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo regímenes fiscales:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Usos CFDI obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo usos CFDI:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Formas de pago obtenidas correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo formas de pago:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Métodos de pago obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
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
    const result = await query('SELECT * FROM modulos WHERE activo = true ORDER BY orden, nombre');
    
    res.json(createResponse({
      data: result.rows,
      message: 'Módulos del sistema obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo módulos:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Sucursales obtenidas correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
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
    console.error('Error creando sucursal:', error);
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
    
    res.json(createResponse({
      data: result.rows,
      message: 'Puestos obtenidos correctamente',
      count: result.rows.length
    }));
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
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
    console.error('Error creando puesto:', error);
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
// EXPORTACIONES
// ============================================================================

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
  createPuesto
};