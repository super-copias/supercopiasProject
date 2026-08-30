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
 * Genera un código (slug) a partir de un nombre legible.
 * Quita acentos, pasa a minúsculas y reemplaza lo no alfanumérico por "_".
 * Se usa para el campo cat_tipos_equipo.codigo (varchar 30, único).
 */
function slugificarCodigo(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'tipo';
}

/**
 * Ordenamiento de los catálogos: las opciones "comodín" ("Otro" / "Otra")
 * SIEMPRE van al final del combo, aunque después se agreguen registros nuevos
 * con un `orden` mayor.
 */
const ORDER_TIPOS =
  "ORDER BY (CASE WHEN codigo = 'otro' OR LOWER(nombre) LIKE 'otro%' THEN 1 ELSE 0 END), orden ASC, nombre ASC";
const ORDER_MARCAS =
  "ORDER BY (CASE WHEN LOWER(nombre) LIKE 'otra%' OR LOWER(nombre) LIKE 'otro%' THEN 1 ELSE 0 END), orden ASC, nombre ASC";

/**
 * Obtener tipos de equipos
 * GET /api/catalogos-equipos/tipos
 */
exports.getTiposEquipo = async (req, res) => {
  try {
    // ?incluir_inactivos=true -> devuelve también los ocultos (pantalla de administración de catálogos)
    const incluirInactivos = req.query.incluir_inactivos === 'true' || req.query.incluir_inactivos === '1';

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
      ${incluirInactivos ? '' : 'WHERE activo = true'}
      ${ORDER_TIPOS}
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
    const incluirInactivos = req.query.incluir_inactivos === 'true' || req.query.incluir_inactivos === '1';

    const query = `
      SELECT
        id,
        nombre,
        descripcion,
        activo,
        orden
      FROM cat_marcas_equipo
      ${incluirInactivos ? '' : 'WHERE activo = true'}
      ${ORDER_MARCAS}
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
    
    // Obtener el siguiente orden (ignorando la opción comodín "Otra", que queda al final)
    const ordenQuery = `
      SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente_orden
      FROM cat_marcas_equipo
      WHERE LOWER(nombre) NOT LIKE 'otra%' AND LOWER(nombre) NOT LIKE 'otro%'
    `;
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
 * Actualizar marca de equipo
 * PUT /api/catalogos-equipos/marcas/:id
 * Campos editables: nombre, descripcion, activo, orden.
 */
exports.updateMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo, orden } = req.body;

    const actual = await pool.query('SELECT * FROM cat_marcas_equipo WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Marca no encontrada', 'NOT_FOUND'));
    }

    if (nombre !== undefined && nombre.trim() === '') {
      return res.status(400).json(createErrorResponse('El nombre de la marca es obligatorio', 'VALIDATION_ERROR'));
    }

    if (nombre !== undefined) {
      const dup = await pool.query(
        'SELECT id FROM cat_marcas_equipo WHERE LOWER(nombre) = LOWER($1) AND id <> $2',
        [nombre.trim(), id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json(createErrorResponse('Ya existe una marca con ese nombre', 'ALREADY_EXISTS'));
      }
    }

    const result = await pool.query(
      `UPDATE cat_marcas_equipo SET
         nombre      = COALESCE($1, nombre),
         descripcion = $2,
         activo      = COALESCE($3, activo),
         orden       = COALESCE($4, orden)
       WHERE id = $5
       RETURNING id, nombre, descripcion, activo, orden, fecha_creacion`,
      [
        nombre !== undefined ? nombre.trim() : null,
        descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : actual.rows[0].descripcion,
        typeof activo === 'boolean' ? activo : null,
        Number.isInteger(orden) ? orden : null,
        id
      ]
    );

    return res.json(createResponse(true, result.rows[0], 'Marca actualizada exitosamente'));
  } catch (err) {
    console.error('Error al actualizar marca:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar marca', 'DATABASE_ERROR'));
  }
};

/**
 * "Eliminar" marca de equipo (baja lógica)
 * DELETE /api/catalogos-equipos/marcas/:id
 * No borra el registro: solo marca activo = false para ocultarlo del catálogo.
 * No afecta a los equipos que ya tengan esa marca asignada.
 */
exports.deleteMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE cat_marcas_equipo SET activo = false WHERE id = $1 RETURNING id, nombre, activo',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Marca no encontrada', 'NOT_FOUND'));
    }
    return res.json(createResponse(true, result.rows[0], 'Marca desactivada del catálogo'));
  } catch (err) {
    console.error('Error al desactivar marca:', err);
    return res.status(500).json(createErrorResponse('Error al desactivar marca', 'DATABASE_ERROR'));
  }
};

/**
 * Crear nuevo tipo de equipo
 * POST /api/catalogos-equipos/tipos
 *
 * El usuario solo envía "nombre" (y opcionalmente "descripcion" /
 * "requiere_contador"). El "codigo" se genera automáticamente como slug y
 * queda inmutable: es el valor que se guarda en equipos.tipo_equipo, por lo
 * que NO se debe modificar para no afectar registros existentes.
 */
exports.createTipo = async (req, res) => {
  try {
    const { nombre, descripcion, requiere_contador } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json(createErrorResponse('El nombre del tipo de equipo es obligatorio', 'VALIDATION_ERROR'));
    }

    const nombreLimpio = nombre.trim();

    // Verificar si ya existe (por nombre)
    const dupNombre = await pool.query(
      'SELECT id, codigo, activo FROM cat_tipos_equipo WHERE LOWER(nombre) = LOWER($1)',
      [nombreLimpio]
    );

    if (dupNombre.rows.length > 0) {
      const existente = dupNombre.rows[0];
      // Si existía pero estaba inactivo, reactivarlo en vez de duplicar
      if (existente.activo === false) {
        const reactivado = await pool.query(
          `UPDATE cat_tipos_equipo
             SET activo = true,
                 descripcion = COALESCE($2, descripcion),
                 requiere_contador = COALESCE($3, requiere_contador)
           WHERE id = $1
           RETURNING id, codigo, nombre, descripcion, icono, requiere_contador, activo, orden`,
          [existente.id, descripcion ? descripcion.trim() : null,
           typeof requiere_contador === 'boolean' ? requiere_contador : null]
        );
        return res.status(200).json(createResponse(true, reactivado.rows[0], 'Tipo de equipo reactivado'));
      }
      return res.status(409).json(createErrorResponse('Ya existe un tipo de equipo con ese nombre', 'ALREADY_EXISTS'));
    }

    // Generar un codigo único a partir del nombre
    let codigoBase = slugificarCodigo(nombreLimpio);
    let codigo = codigoBase;
    let intento = 1;
    // eslint-disable-next-line no-await-in-loop
    while ((await pool.query('SELECT 1 FROM cat_tipos_equipo WHERE codigo = $1', [codigo])).rows.length > 0) {
      const sufijo = `_${++intento}`;
      codigo = `${codigoBase.slice(0, 30 - sufijo.length)}${sufijo}`;
    }

    const ordenResult = await pool.query(`
      SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente_orden
      FROM cat_tipos_equipo
      WHERE codigo <> 'otro' AND LOWER(nombre) NOT LIKE 'otro%'
    `);
    const siguienteOrden = ordenResult.rows[0].siguiente_orden;

    const insertQuery = `
      INSERT INTO cat_tipos_equipo (codigo, nombre, descripcion, icono, requiere_contador, orden)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, codigo, nombre, descripcion, icono, requiere_contador, activo, orden, fecha_creacion
    `;

    const result = await pool.query(insertQuery, [
      codigo,
      nombreLimpio,
      descripcion ? descripcion.trim() : null,
      'fa-cube',
      requiere_contador === true,
      siguienteOrden
    ]);

    return res.status(201).json(createResponse(true, result.rows[0], 'Tipo de equipo creado exitosamente'));
  } catch (err) {
    console.error('Error al crear tipo de equipo:', err);
    return res.status(500).json(createErrorResponse('Error al crear tipo de equipo', 'DATABASE_ERROR'));
  }
};

/**
 * Actualizar tipo de equipo
 * PUT /api/catalogos-equipos/tipos/:id
 * Campos editables: nombre, descripcion, requiere_contador, activo, orden.
 * El "codigo" NO es editable: es la clave que referencia equipos.tipo_equipo.
 */
exports.updateTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, requiere_contador, activo, orden } = req.body;

    const actual = await pool.query('SELECT * FROM cat_tipos_equipo WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Tipo de equipo no encontrado', 'NOT_FOUND'));
    }

    if (nombre !== undefined && nombre.trim() === '') {
      return res.status(400).json(createErrorResponse('El nombre del tipo de equipo es obligatorio', 'VALIDATION_ERROR'));
    }

    if (nombre !== undefined) {
      const dup = await pool.query(
        'SELECT id FROM cat_tipos_equipo WHERE LOWER(nombre) = LOWER($1) AND id <> $2',
        [nombre.trim(), id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json(createErrorResponse('Ya existe un tipo de equipo con ese nombre', 'ALREADY_EXISTS'));
      }
    }

    const result = await pool.query(
      `UPDATE cat_tipos_equipo SET
         nombre            = COALESCE($1, nombre),
         descripcion       = $2,
         requiere_contador = COALESCE($3, requiere_contador),
         activo            = COALESCE($4, activo),
         orden             = COALESCE($5, orden)
       WHERE id = $6
       RETURNING id, codigo, nombre, descripcion, icono, requiere_contador, activo, orden, fecha_creacion`,
      [
        nombre !== undefined ? nombre.trim() : null,
        descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : actual.rows[0].descripcion,
        typeof requiere_contador === 'boolean' ? requiere_contador : null,
        typeof activo === 'boolean' ? activo : null,
        Number.isInteger(orden) ? orden : null,
        id
      ]
    );

    return res.json(createResponse(true, result.rows[0], 'Tipo de equipo actualizado exitosamente'));
  } catch (err) {
    console.error('Error al actualizar tipo de equipo:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar tipo de equipo', 'DATABASE_ERROR'));
  }
};

/**
 * "Eliminar" tipo de equipo (baja lógica)
 * DELETE /api/catalogos-equipos/tipos/:id
 * No borra el registro: solo marca activo = false para ocultarlo del catálogo.
 * Los equipos que ya usan ese tipo (equipos.tipo_equipo = codigo) no se tocan.
 */
exports.deleteTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE cat_tipos_equipo SET activo = false WHERE id = $1 RETURNING id, codigo, nombre, activo',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Tipo de equipo no encontrado', 'NOT_FOUND'));
    }
    return res.json(createResponse(true, result.rows[0], 'Tipo de equipo desactivado del catálogo'));
  } catch (err) {
    console.error('Error al desactivar tipo de equipo:', err);
    return res.status(500).json(createErrorResponse('Error al desactivar tipo de equipo', 'DATABASE_ERROR'));
  }
};

/**
 * Obtener todos los catálogos
 * GET /api/catalogos-equipos/completos
 */
exports.getCatalogosCompletos = async (req, res) => {
  try {
    const [tipos, estatus, marcas] = await Promise.all([
      pool.query(`SELECT * FROM cat_tipos_equipo WHERE activo = true ${ORDER_TIPOS}`),
      pool.query('SELECT * FROM cat_estatus_equipo WHERE activo = true ORDER BY orden ASC'),
      pool.query(`SELECT * FROM cat_marcas_equipo WHERE activo = true ${ORDER_MARCAS}`)
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
