/**
 * Controlador de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles 
 */

const { query, queryAudit } = require('../config/database');
const bcrypt = require('bcryptjs');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');
const { getAllRoles } = require('../utils/rolesSystem');
const { registrarBitacora, getIp } = require('../utils/bitacora');

/**
 * Helper: Obtener todos los módulos activos de la base de datos
 * @returns {Promise<Array>} Array con las claves de los módulos activos
 */
async function obtenerModulosActivos() {
  try {
    const result = await query(
      'SELECT clave FROM modulos WHERE activo = true ORDER BY orden ASC',
      []
    );
    return result.rows.map(row => row.clave);
  } catch (error) {

    // Retornar array vacío en caso de error para no romper la aplicación
    return [];
  }
}

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
    
    const includeInactive = req.query.includeInactive === 'true';
    let queryParams = [];
    let whereCondition = includeInactive ? 'WHERE 1=1' : 'WHERE e.activo = true';
    
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
    // Hacer JOIN con la tabla modulos para obtener la clave correcta
    // Esto funciona tanto si 'modulo' es un ID como si es una clave
    const modulosResult = await query(
      `SELECT 
        CASE 
          WHEN em.modulo ~ '^[0-9]+$' THEN m.clave 
          ELSE em.modulo 
        END as modulo,
        em.acceso 
       FROM empleados_modulos em
       LEFT JOIN modulos m ON em.modulo::text = m.id::text
       WHERE em.empleado_id = $1`,
      [empleadoId]
    );
    
    let modulosPermitidos = modulosResult.rows
      .filter(m => m.acceso)
      .map(m => m.modulo);

    // Si es administrador, devolver todos los módulos activos
    if (empleado.tipo_acceso === 'completo') {
      const todosLosModulos = await obtenerModulosActivos();
      modulosPermitidos = todosLosModulos;
    }

    // Convertir tipo_acceso de la BD al formato del frontend
    let tipoPermiso = 'sin_permisos';
    if (empleado.tipo_acceso === 'completo') {
      tipoPermiso = 'administrador';
    } else if (empleado.tipo_acceso === 'limitado') {
      tipoPermiso = 'personalizado';
    } else if (empleado.tipo_acceso === 'solo_lectura') {
      tipoPermiso = 'sin_permisos';
    }

    // Preparar respuesta con campos normalizados para el frontend
    const empleadoCompleto = {
      id: empleado.id,
      nombre: empleado.nombre,
      email: empleado.email,
      telefono: empleado.telefono,
      puesto: empleado.puesto_id, // Normalizar nombre de campo
      puestoNombre: empleado.puesto_nombre,
      sucursal: empleado.sucursal_id, // Normalizar nombre de campo
      sucursalNombre: empleado.sucursal_nombre,
      turno: empleado.turno,
      salario: empleado.salario,
      fechaIngreso: empleado.fecha_ingreso,
      activo: empleado.activo,
      fechaBaja: empleado.fecha_baja,
      fechaRegistro: empleado.fecha_registro,
      fechaModificacion: empleado.fecha_modificacion,
      tipoAcceso: empleado.tipo_acceso,
      tipoPermiso, // Agregar el tipo de permiso en formato frontend
      modulosPermitidos,
      usuario: empleado.usuario_id ? {
        id: empleado.usuario_id,
        username: empleado.username,
        roles: empleado.usuario_roles || []
      } : null
    };

    res.json(createResponse(true, empleadoCompleto, 'Empleado obtenido exitosamente'));
    
  } catch (error) {

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
      turno,
      salario,
      fechaIngreso,
      diasVacacionesSugeridos,
      activo = true,
      fechaBaja = null,
      // Campos del frontend
      tipoPermiso,
      modulosPermitidos = []
    } = req.body;
    
    // Debug: Log de datos recibidos
    
    // Validaciones requeridas
    if (!nombre || !puesto || !sucursal || !turno) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Nombre, puesto, sucursal y turno son requeridos'
        )
      );
    }
    
    // Validar que el turno sea válido
    if (turno && !['Matutino', 'Vespertino'].includes(turno)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'El turno debe ser "Matutino" o "Vespertino"'
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
    // La DB acepta: 'completo', 'limitado', 'solo_lectura'
    let tipoAcceso = 'solo_lectura';
    let modulos = {};
    
    // Obtener módulos activos de la BD
    const todosLosModulos = await obtenerModulosActivos();
    const totalModulos = todosLosModulos.length;
    
    // VALIDACIÓN AUTOMÁTICA: Si personalizado tiene TODOS los módulos → convertir a administrador
    let tipoPermisoFinal = tipoPermiso;
    if (tipoPermiso === 'personalizado' && modulosPermitidos.length === totalModulos) {
      tipoPermisoFinal = 'administrador';
    }
    
    // Asignar tipo de acceso y módulos según la lógica
    if (tipoPermisoFinal === 'sin_permisos') {
      // SIN PERMISOS: tipo_acceso = solo_lectura, NO insertar módulos
      tipoAcceso = 'solo_lectura';
      modulos = {};
      
    } else if (tipoPermisoFinal === 'administrador') {
      // ADMINISTRADOR: tipo_acceso = completo, TODOS los módulos en true
      tipoAcceso = 'completo';
      todosLosModulos.forEach(mod => {
        modulos[mod] = { acceso: true };
      });
      
    } else if (tipoPermisoFinal === 'personalizado') {
      // PERSONALIZADO: tipo_acceso = limitado, SOLO módulos seleccionados en true
      tipoAcceso = 'limitado';
      modulosPermitidos.forEach(modId => {
        modulos[modId] = { acceso: true };
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
    
    // Insertar nuevo empleado en PostgreSQL (sin modulos_permitidos)
    const insertQuery = `
      INSERT INTO empleados (
        nombre, email, telefono, puesto_id, sucursal_id, turno, salario,
        fecha_ingreso, dias_vacaciones_sugeridos, activo, fecha_baja, tipo_acceso,
        fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `;
    
    const values = [
      nombre.trim(),
      email ? email.toLowerCase() : null,
      telefono || null,
      puesto || null,
      sucursal || null,
      turno, // Requerido, no usar fallback
      salario ? parseFloat(salario) : null,
      fechaIngreso || new Date().toISOString().split('T')[0],
      diasVacacionesSugeridos || 12,
      activo !== undefined ? activo : true,
      (!activo && fechaBaja) ? fechaBaja : null,
      tipoAcceso
    ];
    
    const result = await queryAudit(insertQuery, values, req.user?.id, req.user?.nombre || req.user?.username);
    const nuevoEmpleado = result.rows[0];

    // Insertar módulos en la tabla empleados_modulos
    // SOLO insertar los módulos que tienen acceso = true
    const modulosConAcceso = Object.keys(modulos).filter(mod => modulos[mod].acceso === true);
    
    if (modulosConAcceso.length > 0) {
      for (const modulo of modulosConAcceso) {
        await query(
          'INSERT INTO empleados_modulos (empleado_id, modulo, acceso) VALUES ($1, $2, $3)',
          [nuevoEmpleado.id, modulo, true]
        );
      }
    }
    
    // Crear usuario del sistema si tiene permisos (completo o limitado)
    let usuarioCreado = null;
    const debeCrearUsuario = tipoAcceso === 'completo' || tipoAcceso === 'limitado';
    
    if (debeCrearUsuario) {

      const { generateUserCredentials } = require('../utils/rolesSystem');
      
      // Generar credenciales únicas
      const credentials = await generateUserCredentials({ nombre: nuevoEmpleado.nombre });
      
      // Asignar roles del sistema basados en el tipo de acceso
      let role = 'empleado';
      let roles = ['empleado'];
      if (tipoAcceso === 'completo') {
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
        `Empleado - ${tipoAcceso === 'completo' ? 'Administrador del sistema' : 'Acceso personalizado'}`
      ];
      
      const userResult = await queryAudit(insertUserQuery, userValues, req.user?.id, req.user?.nombre || req.user?.username);
      const usuarioId = userResult.rows[0].id;
      
      
      
      // Actualizar empleado con el ID del usuario
      await queryAudit(
        'UPDATE empleados SET usuario_id = $1 WHERE id = $2',
        [usuarioId, nuevoEmpleado.id],
        req.user?.id, req.user?.nombre || req.user?.username
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
    
    
    registrarBitacora({
      modulo: 'empleados', accion: 'EMPLEADO_CREADO',
      entidad: 'empleados', entidadId: nuevoEmpleado.id,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { nombre: nuevoEmpleado.nombre }
    });
    return res.status(201).json(
      createResponse(
        true,
        respuesta,
        debeCrearUsuario ? 
          'Empleado y usuario creados exitosamente' : 
          'Empleado creado exitosamente'
      )
    );
    
  } catch (error) {

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
      
      // Obtener módulos activos de la BD
      const todosLosModulos = await obtenerModulosActivos();
      const totalModulos = todosLosModulos.length;
      
      // VALIDACIÓN AUTOMÁTICA: Si personalizado tiene TODOS los módulos → convertir a administrador
      let tipoPermisoFinal = tipoPermiso;
      if (tipoPermiso === 'personalizado' && modulosPermitidos.length === totalModulos) {
        tipoPermisoFinal = 'administrador';
      }
      
      // Convertir tipoPermiso a tipoAcceso (completo, limitado, solo_lectura)
      let tipoAcceso = 'solo_lectura';
      let modulos = {};
      
      if (tipoPermisoFinal === 'sin_permisos') {
        // SIN PERMISOS: tipo_acceso = solo_lectura, NO insertar módulos
        tipoAcceso = 'solo_lectura';
        modulos = {};
        
      } else if (tipoPermisoFinal === 'administrador') {
        // ADMINISTRADOR: tipo_acceso = completo, TODOS los módulos en true
        tipoAcceso = 'completo';
        todosLosModulos.forEach(mod => {
          modulos[mod] = { acceso: true };
        });
        
      } else if (tipoPermisoFinal === 'personalizado') {
        // PERSONALIZADO: tipo_acceso = limitado, SOLO módulos seleccionados en true
        tipoAcceso = 'limitado';
        modulosPermitidos.forEach(modId => {
          modulos[modId] = { acceso: true };
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
    if (datosConvertidos.turno !== undefined && datosConvertidos.turno !== '') {
      camposActualizar.push(`turno = $${contador++}`);
      valores.push(datosConvertidos.turno);
    }
    if (datosConvertidos.salario !== undefined) {
      camposActualizar.push(`salario = $${contador++}`);
      valores.push(datosConvertidos.salario);
    }
    if (datosConvertidos.fechaIngreso !== undefined) {
      camposActualizar.push(`fecha_ingreso = $${contador++}`);
      valores.push(datosConvertidos.fechaIngreso);
    }
    if (datosConvertidos.diasVacacionesSugeridos !== undefined) {
      camposActualizar.push(`dias_vacaciones_sugeridos = $${contador++}`);
      valores.push(datosConvertidos.diasVacacionesSugeridos);
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
    
    // Los módulos se actualizan en la tabla empleados_modulos, no aquí
    // Se manejarán después de actualizar el empleado principal
    
    // Agregar fecha de modificación
    camposActualizar.push(`fecha_modificacion = NOW()`);
    
    // Si no hay campos para actualizar, retornar el empleado actual
    if (camposActualizar.length === 1) { // Solo fecha_modificacion
      return res.json(
        createResponse(
          true,
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
    
    const updateResult = await queryAudit(updateQuery, valores, req.user?.id, req.user?.nombre || req.user?.username);
    const empleadoActualizado = updateResult.rows[0];
    
    // Actualizar módulos si se proporcionaron
    if (datosConvertidos.modulos !== undefined) {
      // Eliminar módulos existentes
      await query('DELETE FROM empleados_modulos WHERE empleado_id = $1', [empleadoId]);
      
      // Insertar solo los módulos que tienen acceso = true
      const modulosConAcceso = Object.keys(datosConvertidos.modulos).filter(
        mod => datosConvertidos.modulos[mod].acceso === true
      );
      
      if (modulosConAcceso.length > 0) {
        for (const modulo of modulosConAcceso) {
          await query(
            'INSERT INTO empleados_modulos (empleado_id, modulo, acceso) VALUES ($1, $2, $3)',
            [empleadoId, modulo, true]
          );
        }
      }
    }
    
    // Verificar si necesita crear usuario del sistema
    let usuarioCreado = null;
    const tipoAccesoNuevo = empleadoActualizado.tipo_acceso;
    const debeCrearUsuario = (tipoAccesoNuevo === 'completo' || tipoAccesoNuevo === 'limitado') 
                             && !empleadoActualizado.usuario_id;

    // Si ya tiene usuario vinculado y cambió tipo_acceso, sincronizar su role
    if (!debeCrearUsuario && empleadoActualizado.usuario_id && datosConvertidos.tipoAcceso !== undefined) {
      const nuevoRole = tipoAccesoNuevo === 'completo' ? 'admin' : 'empleado';
      const nuevosRoles = JSON.stringify([nuevoRole]);
      await queryAudit(
        'UPDATE usuarios SET role = $1, roles = $2, fecha_modificacion = NOW() WHERE id = $3',
        [nuevoRole, nuevosRoles, empleadoActualizado.usuario_id],
        req.user?.id, req.user?.nombre || req.user?.username
      );
    }
    
    if (debeCrearUsuario) {
      const { generateUserCredentials } = require('../utils/rolesSystem');
      
      // Generar credenciales únicas
      const credentials = await generateUserCredentials({ nombre: empleadoActualizado.nombre });
      
      // Asignar roles del sistema basados en el tipo de acceso
      let role = 'empleado';
      let roles = ['empleado'];
      if (tipoAccesoNuevo === 'completo') {
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
        empleadoActualizado.nombre,
        empleadoActualizado.email || `${credentials.username}@supercopias.com`,
        credentials.hashedPassword,
        role,
        JSON.stringify(roles),
        empleadoActualizado.id,
        true,
        empleadoActualizado.nombre,
        empleadoActualizado.telefono || '',
        `Empleado - ${tipoAccesoNuevo === 'completo' ? 'Administrador del sistema' : 'Acceso personalizado'}`
      ];
      
      const userResult = await queryAudit(insertUserQuery, userValues, req.user?.id, req.user?.nombre || req.user?.username);
      const usuarioId = userResult.rows[0].id;
      
      // Actualizar empleado con el ID del usuario
      await queryAudit(
        'UPDATE empleados SET usuario_id = $1 WHERE id = $2',
        [usuarioId, empleadoActualizado.id],
        req.user?.id, req.user?.nombre || req.user?.username
      );
      
      // Actualizar el objeto empleadoActualizado con el usuario_id
      empleadoActualizado.usuario_id = usuarioId;
      
      usuarioCreado = {
        id: usuarioId,
        username: credentials.username,
        password: credentials.password, // Contraseña sin hash para mostrar al admin
        roles: roles,
        tipoPermiso: updateData.tipoPermiso || (tipoAccesoNuevo === 'administrador' ? 'administrador' : 'personalizado')
      };
    }
    
    // Preparar respuesta
    const respuesta = {
      empleado: empleadoActualizado,
      ...(usuarioCreado && { usuario: usuarioCreado })
    };
    
    registrarBitacora({
      modulo: 'empleados', accion: 'EMPLEADO_ACTUALIZADO',
      entidad: 'empleados', entidadId: empleadoId,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { nombre: empleadoActualizado.nombre }
    });
    // Retornar empleado actualizado
    return res.json(
      createResponse(
        true,
        respuesta,
        debeCrearUsuario ? 
          'Empleado actualizado y usuario creado exitosamente' : 
          'Empleado actualizado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error en updateEmpleado:', error);
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
      await queryAudit('DELETE FROM usuarios WHERE id = $1', [empleado.usuario_id], req.user?.id, req.user?.nombre || req.user?.username);
    }

    // Eliminar empleado completamente de la base de datos
    await queryAudit('DELETE FROM empleados WHERE id = $1', [empleadoId], req.user?.id, req.user?.nombre || req.user?.username);

    registrarBitacora({
      modulo: 'empleados', accion: 'EMPLEADO_ELIMINADO',
      entidad: 'empleados', entidadId: empleadoId,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req)
    });
    return res.json(
      createResponse(
        true,
        { id: empleadoId, eliminado: true },
        'Empleado eliminado completamente exitosamente'
      )
    );
    
  } catch (error) {

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
        true,
        puestos,
        'Catálogo de puestos obtenido exitosamente'
      )
    );
  } catch (error) {

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
      `SELECT id, clave, nombre, icono, orden, activo 
       FROM modulos 
       WHERE activo = true 
       ORDER BY orden ASC, nombre ASC`
    );
    
    const modulos = result.rows.map(mod => ({
      id: mod.clave,  // Usar clave como id para consistencia
      nombre: mod.nombre,
      icono: mod.icono || 'fas fa-cube',
      activo: mod.activo
    }));

    return res.status(200).json(
      createResponse(
        true,
        modulos,
        'Catálogo de módulos obtenido exitosamente'
      )
    );
  } catch (error) {

    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Activar o desactivar un empleado (toggle de estado)
 * Endpoint: PATCH /api/empleados/:id/toggle-estado
 * Actualiza activo en empleados y en el usuario vinculado (excepto admins del sistema)
 */
async function toggleEstadoEmpleado(req, res) {
  try {
    const empleadoId = parseInt(req.params.id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.INVALID_DATA, 'ID del empleado inválido')
      );
    }

    // Obtener empleado con su usuario vinculado
    const result = await query(
      `SELECT e.*, u.id as usuario_id, u.role as usuario_role
       FROM empleados e
       LEFT JOIN usuarios u ON u.empleado_id = e.id
       WHERE e.id = $1`,
      [empleadoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(CODIGOS_ERROR.NOT_FOUND, 'Empleado no encontrado')
      );
    }

    const empleado = result.rows[0];

    // Bloquear acción sobre administradores del sistema
    // Se verifica tanto el role del usuario como el tipo_acceso del empleado
    // para cubrir el caso en que el role aún no fue sincronizado
    if (empleado.usuario_role === 'admin' || empleado.tipo_acceso === 'completo') {
      return res.status(403).json(
        createErrorResponse(
          'ADMIN_PROTEGIDO',
          'No es posible desactivar a un administrador del sistema. Para desactivarlo, primero cambia sus permisos a "Personalizado" o "Sin permisos" desde el formulario de edición.'
        )
      );
    }

    const nuevoEstado = !empleado.activo;

    // Actualizar estado del empleado
    await queryAudit(
      'UPDATE empleados SET activo = $1, fecha_modificacion = NOW() WHERE id = $2',
      [nuevoEstado, empleadoId],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    // Actualizar estado del usuario vinculado
    if (empleado.usuario_id) {
      await queryAudit(
        'UPDATE usuarios SET activo = $1, fecha_modificacion = NOW() WHERE id = $2',
        [nuevoEstado, empleado.usuario_id],
        req.user?.id, req.user?.nombre || req.user?.username
      );
    }

    const accion = nuevoEstado ? 'activado' : 'desactivado';

    return res.json(
      createResponse(true, { id: empleadoId, activo: nuevoEstado }, `Empleado ${accion} exitosamente`)
    );
  } catch (error) {
    return res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.DATABASE_ERROR, 'Error interno del servidor')
    );
  }
}

/**
 * Asignar contraseña temporal a un empleado (solo administradores)
 * Endpoint: PATCH /api/empleados/:id/reset-password
 * 
 * Guarda la contraseña hasheada, activa must_reset_password e invalida
 * todas las sesiones activas del usuario para forzar un nuevo login.
 */
async function resetPassword(req, res) {
  try {
    const empleadoId = parseInt(req.params.id);
    if (isNaN(empleadoId)) {
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.INVALID_DATA, 'ID del empleado inválido')
      );
    }

    const { nuevaPassword } = req.body;
    if (!nuevaPassword || nuevaPassword.length < 8) {
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.VALIDATION_ERROR, 'La contraseña debe tener al menos 8 caracteres')
      );
    }

    // Obtener usuario_id vinculado al empleado
    const empleadoResult = await query(
      `SELECT e.usuario_id FROM empleados e WHERE e.id = $1`,
      [empleadoId]
    );

    if (empleadoResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(CODIGOS_ERROR.NOT_FOUND, 'Empleado no encontrado')
      );
    }

    const { usuario_id } = empleadoResult.rows[0];
    if (!usuario_id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Este empleado no tiene usuario del sistema asociado'
        )
      );
    }

    // Impedir que el admin resetee su propia contraseña desde aquí
    if (req.user && req.user.id === usuario_id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'No puedes asignarte una contraseña temporal a ti mismo'
        )
      );
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    // Actualizar contraseña y activar bandera de reset obligatorio
    await queryAudit(
      `UPDATE usuarios
       SET password = $1, must_reset_password = true, fecha_modificacion = NOW()
       WHERE id = $2`,
      [hashedPassword, usuario_id],
      req.user?.id, req.user?.nombre || req.user?.username
    );

    // Invalidar todas las sesiones activas del usuario afectado
    await query(
      'UPDATE user_sessions SET active = false WHERE usuario_id = $1 AND active = true',
      [usuario_id]
    );

    return res.json(
      createResponse(
        true,
        null,
        'Contraseña temporal asignada. El empleado deberá cambiarla en su próximo acceso.'
      )
    );
  } catch (error) {
    return res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.DATABASE_ERROR, 'Error interno del servidor')
    );
  }
}

module.exports = {
  listEmpleados,
  getEmpleado,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getPuestos,
  getModulos,
  toggleEstadoEmpleado,
  resetPassword
};
