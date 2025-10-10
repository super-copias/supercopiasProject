/**
 * Controlador de Proveedores - SuperCopias Backend
 * Gestiona CRUD completo de proveedores
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');

class ProveedoresController {
  /**
   * Obtener lista de proveedores con paginación y búsqueda
   * GET /api/proveedores
   */
  async getList(req, res) {
    try {
      init();
      
      const { page = 1, limit = 10, q = '', includeInactive = false } = req.query;
      
      let proveedores = db.get('proveedores').value() || [];
      
      // Filtrar por estado activo si se requiere
      if (!includeInactive) {
        proveedores = proveedores.filter(p => p.activo !== false);
      }
      
      // Búsqueda por texto
      if (q) {
        const query = q.toLowerCase();
        proveedores = proveedores.filter(p => 
          p.nombre.toLowerCase().includes(query) ||
          p.rfc?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query)
        );
      }
      
      // Paginación
      const total = proveedores.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedProveedores = proveedores.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: paginatedProveedores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        message: 'Proveedores obtenidos correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo proveedores:', error);
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
   * Obtener proveedor por ID
   * GET /api/proveedores/:id
   */
  async getById(req, res) {
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
      
      res.json({
        success: true,
        data: proveedor,
        message: 'Proveedor obtenido correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo proveedor:', error);
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