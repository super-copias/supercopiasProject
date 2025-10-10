/**
 * Controlador de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles
 */

const { db, init } = require('../db');
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
function listEmpleados(req, res) {
  try {
    init();
    
    // Parámetros de consulta
    const q = (req.query.q || '').toLowerCase();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    
    let items = db.get('empleados').value() || [];
    
    // Filtrar por búsqueda si se proporciona
    if (q) {
      const qnorm = q.normalize ? q.normalize('NFD').replace(/\p{Diacritic}/gu, '') : q;
      items = items.filter(e => {
        return Object.values(e).some(v => {
          const s = (v || '').toString();
          const sn = s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '') : s;
          return sn.toLowerCase().includes(qnorm.toLowerCase());
        });
      });
    }
    
    // Filtrar solo empleados activos por defecto
    if (!req.query.includeInactive) {
      items = items.filter(e => e.activo);
    }
    
    // Ordenar por fecha de registro (más recientes primero)
    items.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
    
    // Enriquecer con información de roles
    items = items.map(empleado => ({
      ...empleado,
      rolesInfo: empleado.roles ? empleado.roles.map(roleId => getRoleById(roleId)).filter(Boolean) : []
    }));
    
    // Paginación
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    
    res.json(createPaginatedResponse(paged, page, limit, items.length));
    
  } catch (error) {
    console.error('Error listando empleados:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
function getEmpleado(req, res) {
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
    
    // Enriquecer con información de roles
    const empleadoConRoles = {
      ...empleado,
      rolesInfo: empleado.roles ? empleado.roles.map(roleId => getRoleById(roleId)).filter(Boolean) : []
    };
    
    res.json(
      createResponse(
        true,
        empleadoConRoles,
        'Empleado encontrado'
      )
    );
    
  } catch (error) {
    console.error('Error obteniendo empleado:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
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
      apellidos,
      email,
      telefono,
      puesto,
      departamento,
      salario,
      fechaIngreso,
      numeroEmpleado,
      roles = [],
      crearUsuario = false,
      // Nuevos campos para sistema de permisos
      tipoPermiso,
      modulosPermitidos = [],
      permisos = []
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

    // Validar tipo de permiso
    if (!tipoPermiso || !['operador', 'administrador', 'personalizado'].includes(tipoPermiso)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Tipo de permiso inválido. Debe ser: operador, administrador o personalizado'
        )
      );
    }

    // Validar módulos según tipo de permiso
    if (tipoPermiso === 'administrador') {
      // Para administradores, asignar todos los módulos automáticamente
      const todosLosModulos = [
        'dashboard', 'empleados', 'clientes', 'proveedores',
        'inventarios', 'equipos', 'reportes', 'puntoventa'
      ];
      modulosPermitidos.splice(0, modulosPermitidos.length, ...todosLosModulos);
    } else if ((tipoPermiso === 'operador' || tipoPermiso === 'personalizado') && modulosPermitidos.length === 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Los empleados operadores y personalizados deben tener al menos un módulo asignado'
        )
      );
    }
    
    // Validar roles si se proporcionan
    if (roles.length > 0 && !validateRoles(roles)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Uno o más roles proporcionados no son válidos'
        )
      );
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
    
    // Verificar número de empleado único (si se proporciona)
    if (numeroEmpleado) {
      const numeroExistente = db.get('empleados')
        .find({ numeroEmpleado, activo: true })
        .value();
      
      if (numeroExistente) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un empleado con este número'
          )
        );
      }
    }
    
    // Crear nuevo empleado
    const nuevoEmpleado = {
      id: `EMP_${nanoid(10)}`,
      nombre: nombre.trim(),
      apellidos: apellidos ? apellidos.trim() : '',
      email: email ? email.toLowerCase() : null,
      telefono: telefono || null,
      puesto: puesto || null,
      departamento: departamento || null,
      salario: salario ? parseFloat(salario) : null,
      fechaIngreso: fechaIngreso || new Date().toISOString().split('T')[0],
      numeroEmpleado: numeroEmpleado || null,
      roles: roles || [],
      tieneUsuario: crearUsuario,
      activo: true,
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null,
      // Nuevo: Sistema de permisos de módulos
      tipoPermiso: tipoPermiso,
      modulosPermitidos: modulosPermitidos || [],
      permisos: permisos || [],
      fechaAsignacionPermisos: new Date().toISOString()
    };
    
    let usuarioCreado = null;
    
    // Crear usuario del sistema si se solicita
    if (crearUsuario && roles.length > 0) {
      const credentials = generateUserCredentials(nuevoEmpleado);
      
      // Verificar que el username no exista
      const usuarioExistente = db.get('usuarios')
        .find({ username: credentials.username })
        .value();
      
      if (usuarioExistente) {
        // Añadir número al final si ya existe
        let counter = 1;
        let newUsername = credentials.username;
        while (db.get('usuarios').find({ username: newUsername }).value()) {
          newUsername = `${credentials.username}${counter}`;
          counter++;
        }
        credentials.username = newUsername;
      }
      
      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(credentials.password, 10);
      
      usuarioCreado = {
        id: `USR_${nanoid(10)}`,
        username: credentials.username,
        nombre: `${nuevoEmpleado.nombre} ${nuevoEmpleado.apellidos}`,
        email: nuevoEmpleado.email,
        password: hashedPassword,
        roles: nuevoEmpleado.roles,
        empleadoId: nuevoEmpleado.id,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        fechaModificacion: null,
        ultimoAcceso: null,
        // Campos adicionales para perfil
        fullName: `${nuevoEmpleado.nombre} ${nuevoEmpleado.apellidos}`,
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
    
    // Enriquecer respuesta con información de roles
    const empleadoConRoles = {
      ...nuevoEmpleado,
      rolesInfo: nuevoEmpleado.roles.map(roleId => getRoleById(roleId)).filter(Boolean)
    };
    
    const respuesta = {
      empleado: empleadoConRoles,
      ...(usuarioCreado && {
        usuario: {
          id: usuarioCreado.id,
          username: usuarioCreado.username,
          password: req.body.crearUsuario ? credentials.password : undefined, // Solo devolver contraseña temporal
          roles: usuarioCreado.roles
        }
      })
    };
    
    res.status(201).json(
      createResponse(
        true,
        respuesta,
        crearUsuario ? 
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
    
    // Validar roles si se proporcionan
    if (updateData.roles && !validateRoles(updateData.roles)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Uno o más roles proporcionados no son válidos'
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
    
    // Preparar datos de actualización
    const datosActualizacion = {
      ...updateData,
      fechaModificacion: new Date().toISOString()
    };
    
    // Limpiar y normalizar datos
    if (datosActualizacion.nombre) {
      datosActualizacion.nombre = datosActualizacion.nombre.trim();
    }
    if (datosActualizacion.apellidos) {
      datosActualizacion.apellidos = datosActualizacion.apellidos.trim();
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
    
    // Enriquecer con información de roles
    const empleadoConRoles = {
      ...empleadoActualizado,
      rolesInfo: empleadoActualizado.roles ? 
        empleadoActualizado.roles.map(roleId => getRoleById(roleId)).filter(Boolean) : []
    };
    
    res.json(
      createResponse(
        true,
        empleadoConRoles,
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
 * Eliminar un empleado (desactivar)
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
    
    // Desactivar empleado
    db.get('empleados')
      .find({ id })
      .assign({ 
        activo: false,
        fechaModificacion: new Date().toISOString()
      })
      .write();
    
    // Desactivar usuario asociado si existe
    if (empleado.usuarioId) {
      db.get('usuarios')
        .find({ id: empleado.usuarioId })
        .assign({ 
          activo: false,
          fechaModificacion: new Date().toISOString()
        })
        .write();
    }
    
    res.json(
      createResponse(
        true,
        { id, activo: false },
        'Empleado desactivado exitosamente'
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
}

/**
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
    
    res.json(
      createResponse(
        true,
        roles,
        'Catálogo de roles obtenido exitosamente'
      )
    );
    
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
    if (!tipoPermiso || !['operador', 'administrador', 'personalizado'].includes(tipoPermiso)) {
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