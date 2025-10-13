/**
 * Controlador de Proveedores - SuperCopias Backend
 * Gestiona CRUD completo de proveedores
 */

const { query } = require('../config/database');
const { nanoid } = require('nanoid');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

class ProveedoresController {
  /**
   * Obtener lista de proveedores con paginación y búsqueda
   * GET /api/proveedores
   */
  async getList(req, res) {
    try {
      const { page = 1, limit = 10, q = '', includeInactive = false } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let baseQuery = `
        SELECT * FROM proveedores
        WHERE activo = true
      `;
      let countQuery = 'SELECT COUNT(*) FROM proveedores WHERE activo = true';
      let queryParams = [];
      
      // Incluir inactivos si se solicita
      if (includeInactive) {
        baseQuery = baseQuery.replace('WHERE activo = true', 'WHERE 1=1');
        countQuery = countQuery.replace('WHERE activo = true', 'WHERE 1=1');
      }
      
      // Búsqueda por texto
      if (q) {
        const searchCondition = ` AND (
          LOWER(nombre) LIKE $1 OR
          LOWER(contacto) LIKE $1 OR
          LOWER(email) LIKE $1 OR
          LOWER(telefono) LIKE $1
        )`;
        baseQuery += searchCondition;
        countQuery += searchCondition;
        queryParams.push(`%${q.toLowerCase()}%`);
      }
      
      // Agregar ordenamiento y paginación
      baseQuery += ` ORDER BY nombre ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(parseInt(limit), offset);
      
      // Ejecutar consultas
      const [itemsResult, countResult] = await Promise.all([
        query(baseQuery, queryParams),
        query(countQuery, queryParams.slice(0, -2))
      ]);
      
      const proveedores = itemsResult.rows;
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / parseInt(limit));
      
      return res.json(
        createPaginatedResponse(
          proveedores,
          parseInt(page),
          totalPages,
          total,
          'Proveedores obtenidos exitosamente'
        )
      );
      
    } catch (error) {
      console.error('Error en getList proveedores:', error);
      return res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.DATABASE_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Obtener proveedor por ID
   * GET /api/proveedores/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      // Convertir ID a número
      const proveedorId = parseInt(id);
      if (isNaN(proveedorId)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_DATA,
            'ID del proveedor debe ser un número válido'
          )
        );
      }
      
      const result = await query('SELECT * FROM proveedores WHERE id = $1', [proveedorId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json(
          createErrorResponse(
            CODIGOS_ERROR.NOT_FOUND,
            'Proveedor no encontrado'
          )
        );
      }
      
      const proveedor = result.rows[0];
      
      res.json(createResponse(proveedor, 'Proveedor obtenido exitosamente'));
      
    } catch (error) {
      console.error('Error en getById proveedor:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.DATABASE_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Crear nuevo proveedor
   * POST /api/proveedores
   */
  async create(req, res) {
    try {
      const {
        nombre,
        rfc,
        email,
        telefono,
        direccion,
        codigoPostal,
        ciudad,
        estado,
        contacto,
        tipoProveedor,
        condicionesPago,
        notas
      } = req.body;
      
      // Validación básica
      if (!nombre || !rfc) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.REQUIRED_FIELD,
            'Nombre y RFC son requeridos'
          )
        );
      }
      
      // Verificar RFC único en PostgreSQL
      const existingResult = await query(
        'SELECT id FROM proveedores WHERE rfc = $1 AND activo = true',
        [rfc]
      );
      
      if (existingResult.rows.length > 0) {
        return res.status(422).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un proveedor con este RFC'
          )
        );
      }
      
      // Insertar en PostgreSQL
      const insertQuery = `
        INSERT INTO proveedores (
          nombre, rfc, email, telefono, direccion, codigo_postal,
          ciudad, estado, contacto, tipo_proveedor, condiciones_pago,
          notas, activo, fecha_registro, fecha_modificacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NULL)
        RETURNING *
      `;
      
      const values = [
        nombre,
        rfc,
        email || null,
        telefono || null,
        direccion || null,
        codigoPostal || null,
        ciudad || null,
        estado || null,
        contacto || null,
        tipoProveedor || 'Servicios',
        condicionesPago || 'Contado',
        notas || null
      ];
      
      const result = await query(insertQuery, values);
      const nuevoProveedor = result.rows[0];
      
      res.status(201).json(
        createResponse(
          nuevoProveedor,
          'Proveedor creado correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error creando proveedor:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Actualizar proveedor existente
   * PUT /api/proveedores/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Convertir ID a número
      const proveedorId = parseInt(id);
      if (isNaN(proveedorId)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_DATA,
            'ID del proveedor debe ser un número válido'
          )
        );
      }
      
      // Verificar que el proveedor existe
      const existeResult = await query(
        'SELECT id, rfc FROM proveedores WHERE id = $1',
        [proveedorId]
      );
      
      if (existeResult.rows.length === 0) {
        return res.status(404).json(
          createErrorResponse(
            CODIGOS_ERROR.NOT_FOUND,
            'Proveedor no encontrado'
          )
        );
      }
      
      const proveedorActual = existeResult.rows[0];
      
      // Si se actualiza RFC, verificar que sea único
      if (updateData.rfc && updateData.rfc !== proveedorActual.rfc) {
        const rfcDuplicado = await query(
          'SELECT id FROM proveedores WHERE rfc = $1 AND id != $2 AND activo = true',
          [updateData.rfc, proveedorId]
        );
        
        if (rfcDuplicado.rows.length > 0) {
          return res.status(422).json(
            createErrorResponse(
              CODIGOS_ERROR.ALREADY_EXISTS,
              'Ya existe un proveedor con este RFC'
            )
          );
        }
      }
      
      // Construir consulta de actualización dinámica
      const camposUpdate = [];
      const valoresUpdate = [];
      let paramIndex = 1;
      
      const camposPermitidos = [
        'nombre', 'rfc', 'email', 'telefono', 'direccion', 'codigo_postal',
        'ciudad', 'estado', 'contacto', 'tipo_proveedor', 'condiciones_pago',
        'notas', 'activo'
      ];
      
      // Mapeo de campos camelCase a snake_case
      const camposMapa = {
        'codigoPostal': 'codigo_postal',
        'tipoProveedor': 'tipo_proveedor',
        'condicionesPago': 'condiciones_pago'
      };
      
      Object.keys(updateData).forEach(campo => {
        const campoDb = camposMapa[campo] || campo.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        if (camposPermitidos.includes(campoDb) && updateData[campo] !== undefined) {
          camposUpdate.push(`${campoDb} = $${paramIndex}`);
          valoresUpdate.push(updateData[campo]);
          paramIndex++;
        }
      });
      
      // Agregar fecha de modificación
      camposUpdate.push(`fecha_modificacion = NOW()`);
      
      // Agregar el ID para la condición WHERE
      valoresUpdate.push(proveedorId);
      
      const updateQuery = `
        UPDATE proveedores 
        SET ${camposUpdate.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await query(updateQuery, valoresUpdate);
      const proveedorActualizado = result.rows[0];
      
      res.json(
        createResponse(
          proveedorActualizado,
          'Proveedor actualizado correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Eliminar proveedor (desactivar)
   * DELETE /api/proveedores/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Convertir ID a número
      const proveedorId = parseInt(id);
      if (isNaN(proveedorId)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_DATA,
            'ID del proveedor debe ser un número válido'
          )
        );
      }
      
      // Verificar que el proveedor existe
      const existeResult = await query(
        'SELECT id FROM proveedores WHERE id = $1',
        [proveedorId]
      );
      
      if (existeResult.rows.length === 0) {
        return res.status(404).json(
          createErrorResponse(
            CODIGOS_ERROR.NOT_FOUND,
            'Proveedor no encontrado'
          )
        );
      }
      
      // Desactivar en lugar de eliminar
      await query(
        'UPDATE proveedores SET activo = false, fecha_modificacion = NOW() WHERE id = $1',
        [proveedorId]
      );
      
      res.json(
        createResponse(
          { id: proveedorId, activo: false },
          'Proveedor desactivado correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error eliminando proveedor:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Obtener catálogo de tipos de proveedor
   * GET /api/proveedores/tipos
   */
  async getTipos(req, res) {
    try {
      const tipos = [
        'Servicios',
        'Productos',
        'Mantenimiento',
        'Suministros',
        'Tecnología',
        'Capacitación',
        'Consultoría',
        'Otros'
      ];
      
      res.json(
        createResponse(
          tipos,
          'Tipos de proveedor obtenidos correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error obteniendo tipos de proveedor:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Obtener catálogo de condiciones de pago
   * GET /api/proveedores/condiciones-pago
   */
  async getCondicionesPago(req, res) {
    try {
      const condiciones = [
        'Contado',
        '15 días',
        '30 días',
        '45 días',
        '60 días',
        '90 días',
        'Contra entrega',
        'Anticipado'
      ];
      
      res.json(
        createResponse(
          condiciones,
          'Condiciones de pago obtenidas correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error obteniendo condiciones de pago:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }
}

module.exports = new ProveedoresController();