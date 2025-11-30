/**
 * Controlador de Proveedores - SuperCopias Backend
 * Gestiona CRUD completo de proveedores
 */

const { query } = require('../config/database');
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
      if (includeInactive === 'true' || includeInactive === true) {
        baseQuery = baseQuery.replace('WHERE activo = true', 'WHERE 1=1');
        countQuery = countQuery.replace('WHERE activo = true', 'WHERE 1=1');
      }
      
      // Búsqueda por texto
      if (q) {
        const searchCondition = ` AND (
          LOWER(nombre_comercial) LIKE $1 OR
          LOWER(razon_social) LIKE $1 OR
          LOWER(nombre_contacto) LIKE $1 OR
          LOWER(email) LIKE $1 OR
          LOWER(telefono) LIKE $1 OR
          LOWER(rfc) LIKE $1
        )`;
        baseQuery += searchCondition;
        countQuery += searchCondition;
        queryParams.push(`%${q.toLowerCase()}%`);
      }
      
      // Agregar ordenamiento y paginación
      baseQuery += ` ORDER BY nombre_comercial ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(parseInt(limit), offset);
      
      // Ejecutar consultas
      const [itemsResult, countResult] = await Promise.all([
        query(baseQuery, queryParams),
        query(countQuery, queryParams.slice(0, -2))
      ]);
      
      const proveedores = itemsResult.rows;
      const total = parseInt(countResult.rows[0].count);
      
      return res.json(
        createPaginatedResponse(
          proveedores,
          parseInt(page),
          parseInt(limit),
          total
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
      console.error('Error en getById proveedores:', error);
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
        nombreComercial,
        razonSocial,
        rfc,
        tipoProveedor,
        nombreContacto,
        telefono,
        email,
        paginaWeb,
        direccion,
        metodoPagoPrincipal,
        cuentaBancaria,
        diasCredito,
        notas
      } = req.body;
      
      // Validación básica
      if (!nombreComercial || nombreComercial.trim().length === 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.REQUIRED_FIELD,
            'El nombre comercial es requerido'
          )
        );
      }
      
      // Verificar RFC único en PostgreSQL si se proporciona
      if (rfc && rfc.trim().length > 0) {
        const existingResult = await query(
          'SELECT id FROM proveedores WHERE rfc = $1 AND activo = true',
          [rfc.toUpperCase()]
        );
        
        if (existingResult.rows.length > 0) {
          return res.status(422).json(
            createErrorResponse(
              CODIGOS_ERROR.ALREADY_EXISTS,
              'Ya existe un proveedor con este RFC'
            )
          );
        }
      }
      
      // Insertar en PostgreSQL
      const insertQuery = `
        INSERT INTO proveedores (
          nombre_comercial, razon_social, rfc, tipo_proveedor, activo,
          nombre_contacto, telefono, email, pagina_web, direccion,
          metodo_pago_principal, cuenta_bancaria, dias_credito, notas,
          fecha_registro, fecha_modificacion
        ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        nombreComercial.trim(),
        razonSocial?.trim() || null,
        rfc?.toUpperCase().trim() || null,
        tipoProveedor || 'Mixto',
        nombreContacto?.trim() || null,
        telefono?.trim() || null,
        email?.trim() || null,
        paginaWeb?.trim() || null,
        direccion?.trim() || null,
        metodoPagoPrincipal?.trim() || null,
        cuentaBancaria?.trim() || null,
        diasCredito || 0,
        notas?.trim() || null
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
      console.error('Error en create proveedores:', error);
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
      if (updateData.rfc && updateData.rfc.toUpperCase() !== proveedorActual.rfc) {
        const rfcDuplicado = await query(
          'SELECT id FROM proveedores WHERE rfc = $1 AND id != $2 AND activo = true',
          [updateData.rfc.toUpperCase(), proveedorId]
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
        'nombre_comercial', 'razon_social', 'rfc', 'tipo_proveedor', 'activo',
        'nombre_contacto', 'telefono', 'email', 'pagina_web', 'direccion',
        'metodo_pago_principal', 'cuenta_bancaria', 'dias_credito', 'notas'
      ];
      
      // Mapeo de campos camelCase a snake_case
      const camposMapa = {
        'nombreComercial': 'nombre_comercial',
        'razonSocial': 'razon_social',
        'tipoProveedor': 'tipo_proveedor',
        'nombreContacto': 'nombre_contacto',
        'paginaWeb': 'pagina_web',
        'metodoPagoPrincipal': 'metodo_pago_principal',
        'cuentaBancaria': 'cuenta_bancaria',
        'diasCredito': 'dias_credito'
      };
      
      Object.keys(updateData).forEach(campo => {
        let campoDb = camposMapa[campo] || campo;
        
        // Convertir camelCase a snake_case si no está en el mapa
        if (!camposMapa[campo]) {
          campoDb = campo.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        }
        
        if (camposPermitidos.includes(campoDb) && updateData[campo] !== undefined) {
          let valor = updateData[campo];
          
          // Trimming y conversión de valores
          if (typeof valor === 'string') {
            valor = valor.trim();
            if (valor === '') valor = null;
          }
          
          // RFC siempre en mayúsculas
          if (campoDb === 'rfc' && valor) {
            valor = valor.toUpperCase();
          }
          
          camposUpdate.push(`${campoDb} = $${paramIndex}`);
          valoresUpdate.push(valor);
          paramIndex++;
        }
      });
      
      if (camposUpdate.length === 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_DATA,
            'No se proporcionaron campos para actualizar'
          )
        );
      }
      
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
      console.error('Error en update proveedores:', error);
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
      console.error('Error en delete proveedores:', error);
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
   * GET /api/proveedores/catalogo/tipos
   */
  async getTipos(req, res) {
    try {
      const result = await query(
        `SELECT id, clave AS value, descripcion AS label 
         FROM cat_tipos_proveedor 
         WHERE activo = true 
         ORDER BY orden ASC`,
        []
      );
      
      res.json(
        createResponse(
          true,
          result.rows,
          'Tipos de proveedor obtenidos correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error en getTipos:', error);
      res.status(500).json(
        createErrorResponse(
          CODIGOS_ERROR.INTERNAL_ERROR,
          'Error interno del servidor'
        )
      );
    }
  }

  /**
   * Obtener catálogo de métodos de pago
   * GET /api/proveedores/catalogo/metodos-pago
   */
  async getMetodosPago(req, res) {
    try {
      const result = await query(
        `SELECT id, clave AS value, descripcion AS label 
         FROM cat_metodos_pago_proveedor 
         WHERE activo = true 
         ORDER BY orden ASC`,
        []
      );
      
      res.json(
        createResponse(
          true,
          result.rows,
          'Métodos de pago obtenidos correctamente'
        )
      );
      
    } catch (error) {
      console.error('Error en getMetodosPago:', error);
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
