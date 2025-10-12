/**
 * Controlador de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles
 */

const { query } = require('../config/database');
const { nanoid } = require('nanoid');
const XLSX = require('xlsx');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

// Función simplificada para respuestas exitosas
function createSuccessResponse(data, message) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}
const {
  getAllRoles,
  getRoleById,
  validateRoles,
  generateUserCredentials,
  ROLES_SISTEMA
} = require('../utils/rolesSystem');

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
    
    let baseQuery = `
      SELECT e.*, s.nombre as sucursal_nombre, p.nombre as puesto_nombre 
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.id
      LEFT JOIN puestos p ON e.puesto_id = p.id
      WHERE e.activo = true
    `;
    let countQuery = 'SELECT COUNT(*) FROM empleados e WHERE e.activo = true';
    let queryParams = [];
    
    // Filtrar por búsqueda si se proporciona
    if (q) {
      const searchCondition = ` AND (
        LOWER(e.nombre) LIKE $1 OR 
        LOWER(e.email) LIKE $1 OR 
        LOWER(e.telefono) LIKE $1
      )`;
      baseQuery += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${q}%`);
    }
    
    // Agregar ordenamiento y paginación
    baseQuery += ` ORDER BY e.fecha_ingreso DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    // Ejecutar consultas
    const [itemsResult, countResult] = await Promise.all([
      query(baseQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remover limit y offset para count
    ]);
    
    const items = itemsResult.rows;
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    return res.json(
      createPaginatedResponse(
        items, 
        page, 
        totalPages, 
        totalItems, 
        'Empleados obtenidos exitosamente'
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
    init();
    
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
    if (!nombre) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'El nombre es requerido'
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
      const emailExistente = db.get('empleados')
        .find({ email: email.toLowerCase(), activo: true })
        .value();
      
      if (emailExistente) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un empleado con este email'
          )
        );
      }
    }
    
    // Crear nuevo empleado
    const nuevoEmpleado = {
      id: `EMP_${nanoid(10)}`,
      nombre: nombre.trim(),
      email: email ? email.toLowerCase() : null,
      telefono: telefono || null,
      puesto: puesto || null,
      sucursal: sucursal || null,
      salario: salario ? parseFloat(salario) : null,
      fechaIngreso: fechaIngreso || new Date().toISOString().split('T')[0],
      activo: activo !== undefined ? activo : true,
      fechaBaja: (!activo && fechaBaja) ? fechaBaja : null,
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null,
      tipoAcceso: tipoAcceso,
      modulos: modulos,
      usuarioId: null
    };
    
    let usuarioCreado = null;
    let credentials = null;
    
    // Crear usuario del sistema si tiene permisos
    const debeCrearUsuario = tipoAcceso === 'administrador' || tipoAcceso === 'personalizado';
    
    if (debeCrearUsuario) {
      credentials = generateUserCredentials(nuevoEmpleado);
      
      // La función generateUserCredentials ya maneja los consecutivos únicos
      // No necesitamos verificar duplicados manualmente
      
      // Asignar roles del sistema basados en el tipo de acceso
      let role = 'empleado';
      let roles = ['empleado'];
      if (tipoAcceso === 'administrador') {
        role = 'admin';
        roles = ['admin'];
      }
      
      usuarioCreado = {
        id: `USR_${nanoid(10)}`,
        username: credentials.username,
        nombre: nuevoEmpleado.nombre,
        email: nuevoEmpleado.email,
        password: credentials.hashedPassword,
        role: role,
        roles: roles,
        empleadoId: nuevoEmpleado.id,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        fechaModificacion: null,
        ultimoAcceso: null,
        fullName: nuevoEmpleado.nombre,
        phone: nuevoEmpleado.telefono,
        bio: `Empleado - ${nuevoEmpleado.puesto || 'Sin puesto definido'}`,
        profileImage: ''
      };
      
      // Guardar usuario en la base de datos
      db.get('usuarios').push(usuarioCreado).write();
      
      // Actualizar empleado con ID de usuario
      nuevoEmpleado.usuarioId = usuarioCreado.id;
    }
    
    // Guardar empleado en la base de datos
    db.get('empleados').push(nuevoEmpleado).write();
    
    const respuesta = {
      empleado: nuevoEmpleado,
      ...(usuarioCreado && {
        usuario: {
          id: usuarioCreado.id,
          username: usuarioCreado.username,
          password: credentials.password, // Contraseña sin hash para mostrar al admin
          roles: usuarioCreado.roles,
          tipoPermiso: tipoPermiso
        }
      })
    };
    
    res.status(201).json(
      createResponse(
        true,
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
function updateEmpleado(req, res) {
  try {
    init();
    
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
    
    // Buscar empleado existente
    const empleadoExistente = db.get('empleados').find({ id }).value();
    
    if (!empleadoExistente) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    // Verificar email único (si se actualiza)
    if (updateData.email && updateData.email !== empleadoExistente.email) {
      const emailDuplicado = db.get('empleados')
        .find({ 
          email: updateData.email.toLowerCase(), 
          activo: true,
          id: { $ne: id }
        })
        .value();
      
      if (emailDuplicado) {
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
    
    // Preparar datos de actualización
    const datosActualizacion = {
      ...datosConvertidos,
      fechaModificacion: new Date().toISOString()
    };
    
    // Manejar fechaBaja según el estado activo
    if (datosActualizacion.activo !== undefined) {
      if (datosActualizacion.activo === false || datosActualizacion.activo === 'false') {
        // Si se marca como inactivo, debe tener fechaBaja
        if (!datosActualizacion.fechaBaja) {
          return res.status(400).json(
            createErrorResponse(
              CODIGOS_ERROR.VALIDATION_ERROR,
              'La fecha de baja es requerida cuando el empleado se marca como inactivo'
            )
          );
        }
        datosActualizacion.activo = false;
      } else {
        // Si se reactiva, limpiar fechaBaja
        datosActualizacion.activo = true;
        datosActualizacion.fechaBaja = null;
      }
    }
    
    // Limpiar y normalizar datos
    if (datosActualizacion.nombre) {
      datosActualizacion.nombre = datosActualizacion.nombre.trim();
    }
    if (datosActualizacion.email) {
      datosActualizacion.email = datosActualizacion.email.toLowerCase();
    }
    if (datosActualizacion.salario) {
      datosActualizacion.salario = parseFloat(datosActualizacion.salario);
    }
    
    // Actualizar en la base de datos
    const empleadoActualizado = db.get('empleados')
      .find({ id })
      .assign(datosActualizacion)
      .write();

    // Variable para almacenar credenciales del usuario si se crea
    let credencialesUsuario = null;

    // Verificar si necesita crear usuario (cambió de inactivo a admin/personalizado)
    const tipoAccesoNuevo = datosActualizacion.tipoAcceso || empleadoActualizado.tipoAcceso;
    const necesitaUsuario = (
      (tipoAccesoNuevo === 'administrador' || tipoAccesoNuevo === 'personalizado') &&
      !empleadoActualizado.usuarioId
    );

    if (necesitaUsuario) {
      // Crear usuario para el empleado
      const { username, password, hashedPassword } = generateUserCredentials(empleadoActualizado);
      
      const nuevoUsuario = {
        id: `USR_${nanoid(10)}`,
        username,
        nombre: empleadoActualizado.nombre,
        email: empleadoActualizado.email || `${username}@supercopias.com`,
        password: hashedPassword,
        role: tipoAccesoNuevo === 'administrador' ? 'admin' : 'empleado',
        roles: tipoAccesoNuevo === 'administrador' ? ['admin'] : ['empleado'],
        empleadoId: empleadoActualizado.id,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        fechaModificacion: null,
        ultimoAcceso: null,
        fullName: empleadoActualizado.nombre,
        phone: empleadoActualizado.telefono || '',
        bio: `${empleadoActualizado.puesto || 'Empleado'} - ${tipoAccesoNuevo === 'administrador' ? 'Administrador del sistema' : 'Acceso limitado'}`,
        profileImage: ''
      };

      // Agregar usuario a la base de datos
      db.get('usuarios').push(nuevoUsuario).write();

      // Actualizar empleado con información del usuario
      db.get('empleados')
        .find({ id })
        .assign({
          usuarioId: nuevoUsuario.id,
          fechaModificacion: new Date().toISOString()
        })
        .write();

      // Refrescar datos del empleado
      const empleadoFinal = db.get('empleados').find({ id }).value();

      credencialesUsuario = {
        username,
        password,
        empleado: empleadoFinal
      };
    }

    // Actualizar usuario asociado si existe y se modifican roles
    if (empleadoActualizado.usuarioId && updateData.roles) {
      db.get('usuarios')
        .find({ id: empleadoActualizado.usuarioId })
        .assign({ 
          roles: updateData.roles,
          fechaModificacion: new Date().toISOString()
        })
        .write();
    }
    
    // Obtener empleado actualizado final
    const empleadoFinal = db.get('empleados').find({ id }).value();
    
    // Enriquecer con información de roles
    const empleadoConRoles = {
      ...empleadoFinal,
      rolesInfo: empleadoFinal.roles ? 
        empleadoFinal.roles.map(roleId => getRoleById(roleId)).filter(Boolean) : []
    };

    // Crear respuesta con credenciales si se creó usuario
    const responseData = credencialesUsuario ? {
      empleado: empleadoConRoles,
      usuario: {
        username: credencialesUsuario.username,
        password: credencialesUsuario.password
      }
    } : empleadoConRoles;

    const message = credencialesUsuario ? 
      'Empleado actualizado y usuario creado exitosamente' : 
      'Empleado actualizado exitosamente';

    res.json(
      createResponse(
        true,
        responseData,
        message
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
function deleteEmpleado(req, res) {
  try {
    init();
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del empleado es requerido'
        )
      );
    }
    
    const empleado = db.get('empleados').find({ id }).value();
    
    if (!empleado) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }

    // Eliminar usuario asociado si existe
    if (empleado.usuarioId) {
      db.get('usuarios')
        .remove({ id: empleado.usuarioId })
        .write();
    }

    // Eliminar empleado completamente de la base de datos
    db.get('empleados')
      .remove({ id })
      .write();

    res.json(
      createResponse(
        true,
        { id, eliminado: true },
        'Empleado eliminado completamente exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
    
    const response = createResponse(
      true,           // success
      roles,          // data  
      'Catálogo de roles obtenido exitosamente', // message
      null            // error
    );
    
    res.json(response);
    
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    res.status(500).json(
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
    init();
    
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
    
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Roles son requeridos y deben ser un array'
        )
      );
    }
    
    // Validar roles
    if (!validateRoles(roles)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Uno o más roles proporcionados no son válidos'
        )
      );
    }
    
    const empleado = db.get('empleados').find({ id }).value();
    
    if (!empleado) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Empleado no encontrado'
        )
      );
    }
    
    // Actualizar roles del empleado
    const empleadoActualizado = db.get('empleados')
      .find({ id })
      .assign({ 
        roles,
        tieneUsuario: crearUsuario || empleado.tieneUsuario,
        fechaModificacion: new Date().toISOString()
      })
      .write();
    
    let usuarioCreado = null;
    
    // Crear usuario si se solicita y no existe
    if (crearUsuario && !empleado.usuarioId) {
      const credentials = generateUserCredentials(empleado);
      
      // Verificar username único
      let username = credentials.username;
      let counter = 1;
      while (db.get('usuarios').find({ username }).value()) {
        username = `${credentials.username}${counter}`;
        counter++;
      }
      
      const hashedPassword = await bcrypt.hash(credentials.password, 10);
      
      usuarioCreado = {
        id: `USR_${nanoid(10)}`,
        username,
        nombre: `${empleado.nombre} ${empleado.apellidos}`,
        email: empleado.email,
        password: hashedPassword,
        roles: roles,
        empleadoId: empleado.id,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        fechaModificacion: null,
        ultimoAcceso: null,
        fullName: `${empleado.nombre} ${empleado.apellidos}`,
        phone: empleado.telefono,
        bio: `Empleado - ${empleado.puesto || 'Sin puesto definido'}`,
        profileImage: ''
      };
      
      db.get('usuarios').push(usuarioCreado).write();
      
      // Actualizar empleado con ID de usuario
      db.get('empleados')
        .find({ id })
        .assign({ usuarioId: usuarioCreado.id })
        .write();
      
    } else if (empleado.usuarioId) {
      // Actualizar roles del usuario existente
      db.get('usuarios')
        .find({ id: empleado.usuarioId })
        .assign({ 
          roles,
          fechaModificacion: new Date().toISOString()
        })
        .write();
    }
    
    // Enriquecer respuesta
    const empleadoConRoles = {
      ...empleadoActualizado,
      rolesInfo: roles.map(roleId => getRoleById(roleId)).filter(Boolean)
    };
    
    const respuesta = {
      empleado: empleadoConRoles,
      ...(usuarioCreado && {
        usuario: {
          id: usuarioCreado.id,
          username: usuarioCreado.username,
          password: credentials.password,
          roles: usuarioCreado.roles
        }
      })
    };
    
    res.json(
      createResponse(
        true,
        respuesta,
        usuarioCreado ? 
          'Roles asignados y usuario creado exitosamente' : 
          'Roles asignados exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error asignando roles:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
function getPuestos(req, res) {
  try {
    const puestos = [
      'Gerente General',
      'Jefe de Ventas',
      'Supervisor de Operaciones',
      'Cajero',
      'Operador de Equipos',
      'Técnico de Servicio',
      'Atención al Cliente',
      'Gestor de Clientes',
      'Gestor de Inventarios',
      'Contador',
      'Asistente Administrativo',
      'Coordinador de Producción',
      'Vendedor',
      'Recepcionista',
      'Chofer',
      'Técnico en Mantenimiento',
      'Encargado de Almacén'
    ];

    res.status(200).json(
      createResponse(
        puestos,
        'Catálogo de puestos obtenido exitosamente'
      )
    );
  } catch (error) {
    console.error('Error getting puestos:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
function getModulos(req, res) {
  try {
    const modulos = [
      {
        id: 'dashboard',
        nombre: 'Dashboard',
        descripcion: 'Panel principal con métricas y resúmenes',
        icono: 'fas fa-tachometer-alt',
        activo: true
      },
      {
        id: 'empleados',
        nombre: 'Empleados',
        descripcion: 'Gestión de empleados y recursos humanos',
        icono: 'fas fa-users',
        activo: true
      },
      {
        id: 'clientes',
        nombre: 'Clientes',
        descripcion: 'Gestión de clientes y base de datos',
        icono: 'fas fa-user-friends',
        activo: true
      },
      {
        id: 'proveedores',
        nombre: 'Proveedores',
        descripcion: 'Gestión de proveedores y contactos',
        icono: 'fas fa-truck',
        activo: true
      },
      {
        id: 'inventarios',
        nombre: 'Inventarios',
        descripcion: 'Control de stock y productos',
        icono: 'fas fa-boxes',
        activo: true
      },
      {
        id: 'equipos',
        nombre: 'Equipos',
        descripcion: 'Gestión de equipos y herramientas',
        icono: 'fas fa-tools',
        activo: true
      },
      {
        id: 'reportes',
        nombre: 'Reportes',
        descripcion: 'Generación de reportes y análisis',
        icono: 'fas fa-chart-bar',
        activo: true
      },
      {
        id: 'puntoventa',
        nombre: 'Punto de Venta',
        descripcion: 'Sistema de ventas y facturación',
        icono: 'fas fa-cash-register',
        activo: true
      }
    ];

    res.status(200).json(
      createResponse(
        modulos,
        'Catálogo de módulos obtenido exitosamente'
      )
    );
  } catch (error) {
    console.error('Error getting modulos:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
function updatePermisos(req, res) {
  try {
    init();
    
    const { id } = req.params;
    const { tipoPermiso, modulosPermitidos, permisos } = req.body;
    
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
    const empleado = db.get('empleados').find({ id }).value();
    
    if (!empleado) {
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
    
    // Actualizar empleado
    const empleadoActualizado = {
      ...empleado,
      tipoPermiso: tipoPermiso,
      modulosPermitidos: modulosFinales,
      permisos: permisos || [],
      fechaModificacion: new Date().toISOString(),
      fechaAsignacionPermisos: new Date().toISOString()
    };
    
    db.get('empleados')
      .find({ id })
      .assign(empleadoActualizado)
      .write();
    
    res.status(200).json(
      createResponse(
        empleadoActualizado,
        'Permisos actualizados exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error updating permisos:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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