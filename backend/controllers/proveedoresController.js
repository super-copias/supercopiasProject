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
      init();
      
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
        return res.status(400).json({
          success: false,
          error: {
            code: 'REQUIRED_FIELD',
            message: 'Nombre y RFC son requeridos'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Verificar RFC único
      const existingProveedor = db.get('proveedores').find({ rfc }).value();
      if (existingProveedor) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Ya existe un proveedor con este RFC'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const nuevoProveedor = {
        id: nanoid(),
        nombre,
        rfc,
        email: email || null,
        telefono: telefono || null,
        direccion: direccion || null,
        codigoPostal: codigoPostal || null,
        ciudad: ciudad || null,
        estado: estado || null,
        contacto: contacto || null,
        tipoProveedor: tipoProveedor || 'Servicios',
        condicionesPago: condicionesPago || 'Contado',
        notas: notas || null,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        fechaModificacion: null
      };
      
      db.get('proveedores').push(nuevoProveedor).write();
      
      res.status(201).json({
        success: true,
        data: nuevoProveedor,
        message: 'Proveedor creado correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error creando proveedor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Actualizar proveedor existente
   * PUT /api/proveedores/:id
   */
  async update(req, res) {
    try {
      init();
      
      const { id } = req.params;
      const updateData = { ...req.body };
      
      const proveedor = db.get('proveedores').find({ id }).value();
      if (!proveedor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Proveedor no encontrado'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Si se actualiza RFC, verificar que sea único
      if (updateData.rfc && updateData.rfc !== proveedor.rfc) {
        const existingProveedor = db.get('proveedores').find({ rfc: updateData.rfc }).value();
        if (existingProveedor) {
          return res.status(422).json({
            success: false,
            error: {
              code: 'DUPLICATE_ENTRY',
              message: 'Ya existe un proveedor con este RFC'
            },
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Actualizar datos
      updateData.fechaModificacion = new Date().toISOString();
      delete updateData.id; // No permitir cambiar ID
      delete updateData.fechaRegistro; // No permitir cambiar fecha de registro
      
      const proveedorActualizado = db.get('proveedores')
        .find({ id })
        .assign(updateData)
        .write();
      
      res.json({
        success: true,
        data: proveedorActualizado,
        message: 'Proveedor actualizado correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Eliminar proveedor (desactivar)
   * DELETE /api/proveedores/:id
   */
  async delete(req, res) {
    try {
      init();
      
      const { id } = req.params;
      
      const proveedor = db.get('proveedores').find({ id }).value();
      if (!proveedor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Proveedor no encontrado'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Desactivar en lugar de eliminar
      db.get('proveedores')
        .find({ id })
        .assign({ 
          activo: false,
          fechaModificacion: new Date().toISOString()
        })
        .write();
      
      res.json({
        success: true,
        data: { id, activo: false },
        message: 'Proveedor desactivado correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error eliminando proveedor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        },
        timestamp: new Date().toISOString()
      });
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
      
      res.json({
        success: true,
        data: tipos,
        message: 'Tipos de proveedor obtenidos correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo tipos de proveedor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        },
        timestamp: new Date().toISOString()
      });
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
      
      res.json({
        success: true,
        data: condiciones,
        message: 'Condiciones de pago obtenidas correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo condiciones de pago:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new ProveedoresController();