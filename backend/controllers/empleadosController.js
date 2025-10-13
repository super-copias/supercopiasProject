/**
 * Controlador de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles
 */

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');
const { getAllRoles } = require('../utils/rolesSystem');

/**
 * Obtener lista de empleados con búsqueda y paginación
 * Endpoint: GET /api/empleados
 * Query params: q (búsqueda), page (página), limit (límite por página)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de empleados y paginación
 */
/**
 * Obtener lista de empleados con búsqueda y paginación
 * Endpoint: GET /api/empleados
 * Query params: q (búsqueda), page (página), limit (límite por página)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de empleados y paginación
 */
async function listEmpleados(req, res) {
  try {
    // Parámetros de consulta
    const q = (req.query.q || '').toLowerCase();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const offset = (page - 1) * limit;
    
    let queryParams = [];
    let whereCondition = 'WHERE e.activo = true';
    
    // Filtrar por búsqueda si se proporciona
    if (q) {
      whereCondition += ` AND (
        LOWER(e.nombre) LIKE $1 OR 
        LOWER(e.email) LIKE $1 OR 
        LOWER(e.telefono) LIKE $1 OR
        LOWER(p.nombre) LIKE $1 OR
        LOWER(s.nombre) LIKE $1
      )`;
      queryParams.push(`%${q}%`);
    }
    
    const baseQuery = `
      SELECT e.*, s.nombre as sucursal_nombre, p.nombre as puesto_nombre 
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.id
      LEFT JOIN puestos p ON e.puesto_id = p.id
      ${whereCondition}
      ORDER BY e.fecha_ingreso DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.id
      LEFT JOIN puestos p ON e.puesto_id = p.id
      ${whereCondition}
    `;
    
    // Agregar parámetros de paginación
    const finalParams = [...queryParams, limit, offset];
    
    // Ejecutar consultas
    const [itemsResult, countResult] = await Promise.all([
      query(baseQuery, finalParams),
      query(countQuery, queryParams) // Solo los parámetros de búsqueda para count
    ]);
    
    const items = itemsResult.rows;
    const totalItems = parseInt(countResult.rows[0].count);
    
    return res.json(
      createPaginatedResponse(
        items, 
        page, 
        limit,
        totalItems
      )
    );
  } catch (error) {
    console.error('Error en listEmpleados:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Obtener un empleado específico por ID
 * Endpoint: GET /api/empleados/:id
 * 
 * @param {Object} req - Request object con param id
 * @param {Object} res - Response object
 * @returns {Object} JSON con datos del empleado o error 404
 */
async function getEmpleado(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }

    // Convertir ID a número si es necesario
    const empleadoId = parseInt(id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del empleado debe ser un número válido'
        )
      );
    }
    
    // Buscar empleado con información de sucursal y puesto
    const result = await query(`
      SELECT e.*, 
             s.nombre as sucursal_nombre,
             p.nombre as puesto_nombre,
             u.id as usuario_id, u.username, u.roles as usuario_roles
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.id
      LEFT JOIN puestos p ON e.puesto_id = p.id
      LEFT JOIN usuarios u ON u.empleado_id = e.id
      WHERE e.id = $1
    `, [empleadoId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    const empleado = result.rows[0];
    
    // Obtener módulos del empleado
    const modulosResult = await query(
      'SELECT modulo, acceso FROM empleados_modulos WHERE empleado_id = $1',
      [empleadoId]
    );
    
    const modulosPermitidos = modulosResult.rows
      .filter(m => m.acceso)
      .map(m => m.modulo);

    // Preparar respuesta
    const empleadoCompleto = {
      ...empleado,
      modulosPermitidos,
      usuario: empleado.usuario_id ? {
        id: empleado.usuario_id,
        username: empleado.username,
        roles: empleado.usuario_roles || []
      } : null
    };

    res.json(createSuccessResponse(empleadoCompleto, 'Empleado obtenido exitosamente'));
    
  } catch (error) {
    console.error('Error en getEmpleado:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Crear un nuevo empleado
 * Endpoint: POST /api/empleados
 * 
 * @param {Object} req - Request object con body del empleado
 * @param {Object} res - Response object
 * @returns {Object} JSON con empleado creado o error de validación
 */
async function createEmpleado(req, res) {
  try {
    const {
      nombre,
      email,
      telefono,
      puesto,
      sucursal,
      salario,
      fechaIngreso,
      activo = true,
      fechaBaja = null,
      // Campos del frontend
      tipoPermiso,
      modulosPermitidos = []
    } = req.body;
    
    // Validaciones requeridas
    if (!nombre || !puesto || !sucursal) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Nombre, puesto y sucursal son requeridos'
        )
      );
    }

    // Validar fechaBaja si el empleado está inactivo
    if (activo === false && !fechaBaja) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'La fecha de baja es requerida cuando el empleado está inactivo'
        )
      );
    }

    // Convertir tipoPermiso del frontend a tipoAcceso de la DB
    let tipoAcceso = 'inactivo';
    let modulos = {};
    
    if (tipoPermiso === 'sin_permisos') {
      tipoAcceso = 'inactivo';
      modulos = {};
    } else if (tipoPermiso === 'administrador') {
      tipoAcceso = 'administrador';
      modulos = {
        dashboard: { acceso: true },
        empleados: { acceso: true },
        clientes: { acceso: true },
        proveedores: { acceso: true },
        inventarios: { acceso: true },
        equipos: { acceso: true },
        reportes: { acceso: true },
        configuracion: { acceso: true }
      };
    } else if (tipoPermiso === 'personalizado') {
      tipoAcceso = 'personalizado';
      modulos = {};
      // Convertir array de módulos permitidos a formato de objeto
      const todosLosModulos = ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'configuracion'];
      todosLosModulos.forEach(mod => {
        modulos[mod] = { acceso: modulosPermitidos.includes(mod) };
      });
    }
    
    // Verificar si el email ya existe (si se proporciona)
    if (email) {
      const emailExistente = await query(
        'SELECT id FROM empleados WHERE email = $1 AND activo = true',
        [email.toLowerCase()]
      );
      
      if (emailExistente.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un empleado con este email'
          )
        );
      }
    }
    
    // Insertar nuevo empleado en PostgreSQL
    const insertQuery = `
      INSERT INTO empleados (
        nombre, email, telefono, puesto_id, sucursal_id, salario,
        fecha_ingreso, activo, fecha_baja, tipo_acceso, modulos_permitidos,
        fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;
    
    const values = [
      nombre.trim(),
      email ? email.toLowerCase() : null,
      telefono || null,
      puesto || null,
      sucursal || null,
      salario ? parseFloat(salario) : null,
      fechaIngreso || new Date().toISOString().split('T')[0],
      activo !== undefined ? activo : true,
      (!activo && fechaBaja) ? fechaBaja : null,
      tipoAcceso,
      JSON.stringify(modulos)
    ];
    
    const result = await query(insertQuery, values);
    const nuevoEmpleado = result.rows[0];
    
    // Crear usuario del sistema si tiene permisos (administrador o personalizado)
    let usuarioCreado = null;
    const debeCrearUsuario = tipoAcceso === 'administrador' || tipoAcceso === 'personalizado';
    
    if (debeCrearUsuario) {
      const { generateUserCredentials } = require('../utils/rolesSystem');
      
      // Generar credenciales únicas
      const credentials = await generateUserCredentials({ nombre: nuevoEmpleado.nombre });
      
      // Asignar roles del sistema basados en el tipo de acceso
      let role = 'empleado';
      let roles = ['empleado'];
      if (tipoAcceso === 'administrador') {
        role = 'admin';
        roles = ['admin'];
      }
      
      // Crear usuario en la base de datos
      const insertUserQuery = `
        INSERT INTO usuarios (
          username, nombre, email, password, role, roles, empleado_id, 
          activo, fecha_registro, full_name, phone, bio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)
        RETURNING id, username
      `;
      
      const userValues = [
        credentials.username,
        nuevoEmpleado.nombre,
        nuevoEmpleado.email || `${credentials.username}@supercopias.com`,
        credentials.hashedPassword,
        role,
        JSON.stringify(roles),
        nuevoEmpleado.id,
        true,
        nuevoEmpleado.nombre,
        nuevoEmpleado.telefono || '',
        `Empleado - ${tipoAcceso === 'administrador' ? 'Administrador del sistema' : 'Acceso personalizado'}`
      ];
      
      const userResult = await query(insertUserQuery, userValues);
      const usuarioId = userResult.rows[0].id;
      
      // Actualizar empleado con el ID del usuario
      await query(
        'UPDATE empleados SET usuario_id = $1 WHERE id = $2',
        [usuarioId, nuevoEmpleado.id]
      );
      
      usuarioCreado = {
        id: usuarioId,
        username: credentials.username,
        password: credentials.password, // Contraseña sin hash para mostrar al admin
        roles: roles,
        tipoPermiso: tipoPermiso
      };
    }
    
    // Preparar respuesta
    const respuesta = {
      empleado: nuevoEmpleado,
      ...(usuarioCreado && { usuario: usuarioCreado })
    };
    
    return res.status(201).json(
      createResponse(
        respuesta,
        debeCrearUsuario ? 
          'Empleado y usuario creados exitosamente' : 
          'Empleado creado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Actualizar un empleado existente
 * Endpoint: PUT /api/empleados/:id
 * 
 * @param {Object} req - Request object con param id y body del empleado
 * @param {Object} res - Response object
 * @returns {Object} JSON con empleado actualizado o error
 */
async function updateEmpleado(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }

    // Convertir ID a número
    const empleadoId = parseInt(id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del empleado debe ser un número válido'
        )
      );
    }
    
    // Buscar empleado existente
    const empleadoResult = await query(
      'SELECT * FROM empleados WHERE id = $1',
      [empleadoId]
    );
    
    if (empleadoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    const empleadoExistente = empleadoResult.rows[0];
    
    // Verificar email único (si se actualiza)
    if (updateData.email && updateData.email !== empleadoExistente.email) {
      const emailResult = await query(
        'SELECT id FROM empleados WHERE email = $1 AND activo = true AND id != $2',
        [updateData.email.toLowerCase(), empleadoId]
      );
      
      if (emailResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe otro empleado con este email'
          )
        );
      }
    }
    
    // Convertir tipoPermiso del frontend a formato de la DB
    let datosConvertidos = { ...updateData };
    
    if (updateData.tipoPermiso) {
      const { tipoPermiso, modulosPermitidos = [] } = updateData;
      
      // Convertir tipoPermiso a tipoAcceso
      let tipoAcceso = 'inactivo';
      let modulos = {};
      
      if (tipoPermiso === 'sin_permisos') {
        tipoAcceso = 'inactivo';
        modulos = {};
      } else if (tipoPermiso === 'administrador') {
        tipoAcceso = 'administrador';
        modulos = {
          dashboard: { acceso: true },
          empleados: { acceso: true },
          clientes: { acceso: true },
          proveedores: { acceso: true },
          inventarios: { acceso: true },
          equipos: { acceso: true },
          reportes: { acceso: true },
          configuracion: { acceso: true }
        };
      } else if (tipoPermiso === 'personalizado') {
        tipoAcceso = 'personalizado';
        modulos = {};
        // Convertir array de módulos permitidos a formato de objeto
        const todosLosModulos = ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'configuracion'];
        todosLosModulos.forEach(mod => {
          modulos[mod] = { acceso: modulosPermitidos.includes(mod) };
        });
      }
      
      // Reemplazar con formato de la DB
      datosConvertidos.tipoAcceso = tipoAcceso;
      datosConvertidos.modulos = modulos;
      
      // Eliminar campos del frontend
      delete datosConvertidos.tipoPermiso;
      delete datosConvertidos.modulosPermitidos;
    }
    
    // Manejar fechaBaja según el estado activo
    if (datosConvertidos.activo !== undefined) {
      if (datosConvertidos.activo === false || datosConvertidos.activo === 'false') {
        // Si se marca como inactivo, debe tener fechaBaja
        if (!datosConvertidos.fechaBaja) {
          return res.status(400).json(
            createErrorResponse(
              CODIGOS_ERROR.VALIDATION_ERROR,
              'La fecha de baja es requerida cuando el empleado se marca como inactivo'
            )
          );
        }
        datosConvertidos.activo = false;
      } else {
        // Si se reactiva, limpiar fechaBaja
        datosConvertidos.activo = true;
        datosConvertidos.fechaBaja = null;
      }
    }
    
    // Limpiar y normalizar datos
    if (datosConvertidos.nombre) {
      datosConvertidos.nombre = datosConvertidos.nombre.trim();
    }
    if (datosConvertidos.email) {
      datosConvertidos.email = datosConvertidos.email.toLowerCase();
    }
    if (datosConvertidos.salario) {
      datosConvertidos.salario = parseFloat(datosConvertidos.salario);
    }
    
    // Preparar campos dinámicos para actualizar
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (datosConvertidos.nombre !== undefined) {
      camposActualizar.push(`nombre = $${contador++}`);
      valores.push(datosConvertidos.nombre);
    }
    if (datosConvertidos.email !== undefined) {
      camposActualizar.push(`email = $${contador++}`);
      valores.push(datosConvertidos.email);
    }
    if (datosConvertidos.telefono !== undefined) {
      camposActualizar.push(`telefono = $${contador++}`);
      valores.push(datosConvertidos.telefono);
    }
    if (datosConvertidos.puesto !== undefined) {
      camposActualizar.push(`puesto_id = $${contador++}`);
      valores.push(datosConvertidos.puesto);
    }
    if (datosConvertidos.sucursal !== undefined) {
      camposActualizar.push(`sucursal_id = $${contador++}`);
      valores.push(datosConvertidos.sucursal);
    }
    if (datosConvertidos.salario !== undefined) {
      camposActualizar.push(`salario = $${contador++}`);
      valores.push(datosConvertidos.salario);
    }
    if (datosConvertidos.fechaIngreso !== undefined) {
      camposActualizar.push(`fecha_ingreso = $${contador++}`);
      valores.push(datosConvertidos.fechaIngreso);
    }
    if (datosConvertidos.fechaBaja !== undefined) {
      camposActualizar.push(`fecha_baja = $${contador++}`);
      valores.push(datosConvertidos.fechaBaja);
    }
    if (datosConvertidos.activo !== undefined) {
      camposActualizar.push(`activo = $${contador++}`);
      valores.push(datosConvertidos.activo);
    }
    if (datosConvertidos.tipoAcceso !== undefined) {
      camposActualizar.push(`tipo_acceso = $${contador++}`);
      valores.push(datosConvertidos.tipoAcceso);
    }
    if (datosConvertidos.modulos !== undefined) {
      camposActualizar.push(`modulos_permitidos = $${contador++}`);
      valores.push(JSON.stringify(datosConvertidos.modulos));
    }
    
    // Agregar fecha de modificación
    camposActualizar.push(`fecha_modificacion = NOW()`);
    
    // Si no hay campos para actualizar, retornar el empleado actual
    if (camposActualizar.length === 1) { // Solo fecha_modificacion
      return res.json(
        createResponse(
          empleadoExistente,
          'No hay campos para actualizar'
        )
      );
    }
    
    // Agregar ID al final
    valores.push(empleadoId);
    
    // Construir y ejecutar query de actualización
    const updateQuery = `
      UPDATE empleados 
      SET ${camposActualizar.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;
    
    const updateResult = await query(updateQuery, valores);
    const empleadoActualizado = updateResult.rows[0];
    
    // Retornar empleado actualizado
    return res.json(
      createResponse(
        empleadoActualizado,
        'Empleado actualizado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Eliminar un empleado (eliminación completa)
 * Endpoint: DELETE /api/empleados/:id
 * 
 * @param {Object} req - Request object con param id
 * @param {Object} res - Response object
 * @returns {Object} JSON con confirmación o error
 */
async function deleteEmpleado(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }

    // Convertir ID a número
    const empleadoId = parseInt(id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del empleado debe ser un número válido'
        )
      );
    }
    
    // Verificar que el empleado existe
    const empleadoResult = await query(
      'SELECT id, usuario_id FROM empleados WHERE id = $1',
      [empleadoId]
    );
    
    if (empleadoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }

    const empleado = empleadoResult.rows[0];

    // Eliminar usuario asociado si existe
    if (empleado.usuario_id) {
      await query('DELETE FROM usuarios WHERE id = $1', [empleado.usuario_id]);
    }

    // Eliminar empleado completamente de la base de datos
    await query('DELETE FROM empleados WHERE id = $1', [empleadoId]);

    return res.json(
      createResponse(
        { id: empleadoId, eliminado: true },
        'Empleado eliminado completamente exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}/**
 * Obtener catálogo de roles disponibles
 * Endpoint: GET /api/empleados/roles
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con catálogo de roles
 */
function getRoles(req, res) {
  try {
    const roles = getAllRoles();
    
    return res.json(
      createResponse(
        roles,
        'Catálogo de roles obtenido exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Asignar roles a un empleado
 * Endpoint: POST /api/empleados/:id/assign-roles
 * 
 * @param {Object} req - Request object con ID del empleado y roles
 * @param {Object} res - Response object
 * @returns {Object} JSON con empleado actualizado
 */
async function assignRoles(req, res) {
  try {
    const { id } = req.params;
    const { roles, crearUsuario = false } = req.body;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }

    // Convertir ID a número
    const empleadoId = parseInt(id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del empleado debe ser un número válido'
        )
      );
    }
    
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Roles son requeridos y deben ser un array'
        )
      );
    }
    
    // Verificar que el empleado existe
    const empleadoResult = await query(
      'SELECT * FROM empleados WHERE id = $1',
      [empleadoId]
    );
    
    if (empleadoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    const empleado = empleadoResult.rows[0];
    
    // Actualizar roles del empleado (guardar como JSON en modulos_permitidos)
    const rolesJson = JSON.stringify(roles);
    const updateResult = await query(
      `UPDATE empleados 
       SET modulos_permitidos = $1, fecha_modificacion = NOW()
       WHERE id = $2
       RETURNING *`,
      [rolesJson, empleadoId]
    );
    
    const empleadoActualizado = updateResult.rows[0];
    
    // Actualizar roles del usuario si existe
    if (empleado.usuario_id) {
      await query(
        `UPDATE usuarios 
         SET roles = $1, fecha_modificacion = NOW()
         WHERE id = $2`,
        [rolesJson, empleado.usuario_id]
      );
    }
    
    return res.json(
      createResponse(
        empleadoActualizado,
        'Roles asignados exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error asignando roles:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Obtener catálogo de puestos de trabajo
 * Endpoint: GET /api/empleados/puestos
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de puestos
 */
async function getPuestos(req, res) {
  try {
    // Consultar puestos desde la base de datos
    const result = await query(
      'SELECT id, nombre, descripcion, activo FROM puestos WHERE activo = true ORDER BY nombre ASC'
    );
    
    const puestos = result.rows;

    return res.status(200).json(
      createResponse(
        puestos,
        'Catálogo de puestos obtenido exitosamente'
      )
    );
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Obtener catálogo de módulos del sistema
 * Endpoint: GET /api/empleados/modulos
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de módulos disponibles
 */
async function getModulos(req, res) {
  try {
    // Consultar módulos desde la base de datos
    const result = await query(
      `SELECT id, codigo, nombre, descripcion, icono, ruta, orden, activo 
       FROM modulos 
       WHERE activo = true 
       ORDER BY orden ASC, nombre ASC`
    );
    
    const modulos = result.rows.map(mod => ({
      id: mod.codigo || mod.id,
      nombre: mod.nombre,
      descripcion: mod.descripcion,
      icono: mod.icono || 'fas fa-cube',
      activo: mod.activo,
      ruta: mod.ruta
    }));

    return res.status(200).json(
      createResponse(
        modulos,
        'Catálogo de módulos obtenido exitosamente'
      )
    );
  } catch (error) {
    console.error('Error obteniendo módulos:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Actualizar permisos de módulos de un empleado
 * Endpoint: PUT /api/empleados/:id/permisos
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con empleado actualizado
 */
async function updatePermisos(req, res) {
  try {
    const { id } = req.params;
    const { tipoPermiso, modulosPermitidos, permisos } = req.body;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }

    // Convertir ID a número
    const empleadoId = parseInt(id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del empleado debe ser un número válido'
        )
      );
    }
    
    // Validar tipo de permiso
    if (!tipoPermiso || !['sin_permisos', 'administrador', 'personalizado'].includes(tipoPermiso)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Tipo de permiso inválido'
        )
      );
    }
    
    // Buscar empleado
    const empleadoResult = await query(
      'SELECT * FROM empleados WHERE id = $1',
      [empleadoId]
    );
    
    if (empleadoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    // Preparar módulos según tipo de permiso
    let modulosFinales = modulosPermitidos || [];
    if (tipoPermiso === 'administrador') {
      modulosFinales = [
        'dashboard', 'empleados', 'clientes', 'proveedores',
        'inventarios', 'equipos', 'reportes', 'puntoventa'
      ];
    }
    
    // Actualizar empleado con los nuevos permisos
    const updateResult = await query(
      `UPDATE empleados 
       SET tipo_acceso = $1, 
           modulos_permitidos = $2,
           fecha_modificacion = NOW()
       WHERE id = $3
       RETURNING *`,
      [tipoPermiso, JSON.stringify(modulosFinales), empleadoId]
    );
    
    const empleadoActualizado = updateResult.rows[0];
    
    return res.status(200).json(
      createResponse(
        empleadoActualizado,
        'Permisos actualizados exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error actualizando permisos:', error);
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

module.exports = {
  listEmpleados,
  getEmpleado,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getRoles,
  assignRoles,
  getPuestos,
  getModulos,
  updatePermisos
};
