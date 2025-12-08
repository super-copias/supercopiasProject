/**
 * ===============================================
 * Controlador de Catálogos de Equipos
 * ===============================================
 * Gestiona los catálogos de tipos, estatus y marcas
 * de equipos para el módulo de gestión de inventario
 * ===============================================
 */

const pool = require('../config/database');
const { createResponse, createErrorResponse } = require('../utils/apiStandard');

/**
 * Obtener tipos de equipos
 * GET /api/catalogos-equipos/tipos
 */
exports.getTiposEquipo = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre,
        descripcion,
        icono,
        requiere_contador,
        activo,
        orden
      FROM cat_tipos_equipo
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    
    const result = await pool.query(query);
    
    return res.json(createResponse(true, result.rows, 'Tipos de equipo obtenidos'));
  } catch (err) {
    console.error('Error al obtener tipos de equipo:', err);
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Error al obtener tipos de equipo'));
  }
};

/**
 * Obtener estatus de equipos
 * GET /api/catalogos-equipos/estatus
 */
exports.getEstatusEquipo = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre,
        descripcion,
        color,
        activo,
        orden
      FROM cat_estatus_equipo
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    
    const result = await pool.query(query);
    
    return res.json(createResponse(true, result.rows, 'Estatus de equipo obtenidos'));
  } catch (err) {
    console.error('Error al obtener estatus de equipo:', err);
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Error al obtener estatus de equipo'));
  }
};

/**
 * Obtener marcas de equipos
 * GET /api/catalogos-equipos/marcas
 */
exports.getMarcasEquipo = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        nombre,
        descripcion,
        activo,
        orden
      FROM cat_marcas_equipo
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    
    const result = await pool.query(query);
    
    return res.json(createResponse(true, result.rows, 'Marcas de equipo obtenidas'));
  } catch (err) {
    console.error('Error al obtener marcas de equipo:', err);
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Error al obtener marcas de equipo'));
  }
};

/**
 * Crear nueva marca de equipo
 * POST /api/catalogos-equipos/marcas
 */
exports.createMarca = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'El nombre de la marca es obligatorio'));
    }
    
    // Verificar si ya existe
    const checkQuery = 'SELECT id FROM cat_marcas_equipo WHERE LOWER(nombre) = LOWER($1)';
    const checkResult = await pool.query(checkQuery, [nombre.trim()]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json(createErrorResponse('ALREADY_EXISTS', 'Ya existe una marca con ese nombre'));
    }
    
    // Obtener el siguiente orden
    const ordenQuery = 'SELECT COALESCE(MAX(orden), 0) + 1 as siguiente_orden FROM cat_marcas_equipo';
    const ordenResult = await pool.query(ordenQuery);
    const siguienteOrden = ordenResult.rows[0].siguiente_orden;
    
    // Insertar nueva marca
    const insertQuery = `
      INSERT INTO cat_marcas_equipo (nombre, descripcion, orden)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, descripcion, activo, orden, fecha_creacion
    `;
    
    const result = await pool.query(insertQuery, [
      nombre.trim(),
      descripcion ? descripcion.trim() : null,
      siguienteOrden
    ]);
    
    return res.status(201).json(createResponse(true, result.rows[0], 'Marca creada exitosamente'));
  } catch (err) {
    console.error('Error al crear marca:', err);
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Error al crear marca'));
  }
};

/**
 * Obtener todos los catálogos
 * GET /api/catalogos-equipos/completos
 */
exports.getCatalogosCompletos = async (req, res) => {
  try {
    const [tipos, estatus, marcas] = await Promise.all([
      pool.query('SELECT * FROM cat_tipos_equipo WHERE activo = true ORDER BY orden ASC'),
      pool.query('SELECT * FROM cat_estatus_equipo WHERE activo = true ORDER BY orden ASC'),
      pool.query('SELECT * FROM cat_marcas_equipo WHERE activo = true ORDER BY orden ASC')
    ]);
    
    return res.json(createResponse(true, {
      tipos: tipos.rows,
      estatus: estatus.rows,
      marcas: marcas.rows
    }, 'Catálogos obtenidos'));
  } catch (err) {
    console.error('Error al obtener catálogos:', err);
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Error al obtener catálogos'));
  }
};
