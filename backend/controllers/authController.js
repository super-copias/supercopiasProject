/**
 * Controlador de Autenticación - SuperCopias
 * Gestiona el login y autenticación de usuarios del sistema con estándar API
 */

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { createResponse, createErrorResponse, CODIGOS_ERROR } = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

// Clave secreta para firmar tokens JWT
const SECRET = process.env.JWT_SECRET || 'supercopias_secret';

// Genera SHA-256 del token. El token crudo nunca se persiste en BD.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Autenticar usuario y generar token JWT
 * Endpoint: POST /api/auth/login
 * 
 * @param {Object} req - Request object con body { identifier, password }
 * @param {Object} res - Response object
 * @returns {Object} JSON con token y datos del usuario o error 401
 */
async function login(req, res) {
  try {
    const { identifier, password } = req.body;
    
    // Validar datos de entrada
    if (!identifier || !password) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Usuario/email y contraseña son requeridos'
        )
      );
    }
    
    // Buscar usuario por username o email (incluir inactivos para dar mensaje específico)
    const result = await query(
      'SELECT * FROM usuarios WHERE (username = $1 OR email = $1)',
      [identifier]
    );
    
    if (result.rows.length === 0) {
      registrarBitacora({
        modulo: 'auth', accion: 'LOGIN_FALLIDO',
        ip: getIp(req),
        detalle: { identifier, motivo: 'usuario_no_encontrado' },
        resultado: 'error',
      });
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Credenciales inválidas'
        )
      );
    }
    
    const user = result.rows[0];

    // Verificar si la cuenta está desactivada antes de validar la contraseña
    if (!user.activo) {
      registrarBitacora({
        modulo: 'auth', accion: 'CUENTA_DESACTIVADA',
        entidad: 'usuarios', entidadId: String(user.id),
        usuarioId: user.id, usuarioNombre: user.nombre || user.username,
        ip: getIp(req),
        resultado: 'bloqueado',
      });
      return res.status(403).json(
        createErrorResponse(
          'CUENTA_DESACTIVADA',
          'Tu cuenta está desactivada. Contacta al administrador.'
        )
      );
    }
    
    // Verificar contraseña
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      registrarBitacora({
        modulo: 'auth', accion: 'LOGIN_FALLIDO',
        entidad: 'usuarios', entidadId: String(user.id),
        usuarioId: user.id, usuarioNombre: user.nombre || user.username,
        ip: getIp(req),
        detalle: { identifier, motivo: 'contrasena_incorrecta' },
        resultado: 'error',
      });
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Credenciales inválidas'
        )
      );
    }
    
    // Generar token JWT válido por 8 horas
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        nombre: user.nombre || user.username,
        role: user.role 
      }, 
      SECRET, 
      { expiresIn: '8h' }
    );
    
    // Actualizar último acceso
    await query(
      'UPDATE usuarios SET ultimo_acceso = NOW(), fecha_modificacion = NOW() WHERE id = $1',
      [user.id]
    );

    // --- Sesión única: invalidar sesiones previas del mismo usuario ---
    await query(
      'UPDATE user_sessions SET active = false WHERE usuario_id = $1 AND active = true',
      [user.id]
    );

    // Registrar nueva sesión en BD
    const tokenHash = hashToken(token);
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    await query(
      `INSERT INTO user_sessions (usuario_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '8 hours')`,
      [user.id, tokenHash, ipAddress, userAgent]
    );
    // -----------------------------------------------------------------

    // Obtener información adicional del empleado si existe
    let empleadoInfo = null;
    let modulosPermitidos = [];
    
    if (user.empleado_id) {
      const empleadoResult = await query(
        'SELECT * FROM empleados WHERE id = $1',
        [user.empleado_id]
      );
      
      if (empleadoResult.rows.length > 0) {
        empleadoInfo = empleadoResult.rows[0];
        
        // Obtener módulos del empleado
        const modulosResult = await query(
          'SELECT modulo FROM empleados_modulos WHERE empleado_id = $1 AND acceso = true',
          [user.empleado_id]
        );
        
        modulosPermitidos = modulosResult.rows.map(m => m.modulo);
      }
    }
    
    // Responder con token y datos del usuario (sin contraseña)
    res.json(
      createResponse(
        true,
        {
          token,
          usuario: {
            id: user.id,
            username: user.username,
            nombre: user.nombre,
            email: user.email,
            role: user.role,
            roles: typeof user.roles === 'string' ? [user.roles] : (Array.isArray(user.roles) ? user.roles : [user.role]),
            activo: user.activo,
            mustResetPassword: user.must_reset_password || false,
            fechaRegistro: user.fecha_registro,
            ultimoAcceso: user.ultimo_acceso,
            empleadoId: user.empleado_id,
            tipoPermiso: empleadoInfo?.tipo_acceso || null,
            modulosPermitidos: modulosPermitidos
          }
        },
        'Login exitoso'
      )
    );

    registrarBitacora({
      modulo: 'auth', accion: 'LOGIN_EXITOSO',
      entidad: 'usuarios', entidadId: String(user.id),
      usuarioId: user.id, usuarioNombre: user.nombre || user.username,
      ip: getIp(req),
      detalle: { username: user.username, role: user.role },
    });

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
 * Verificar token JWT
 * Endpoint: GET /api/auth/verify
 * 
 * @param {Object} req - Request object con token en header Authorization
 * @param {Object} res - Response object
 * @returns {Object} JSON con datos del usuario o error 401
 */
async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Token no proporcionado'
        )
      );
    }
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, SECRET);
    
    // Actualizar last_activity de la sesión activa
    await query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE token_hash = $1 AND active = true',
      [hashToken(token)]
    );

    // Buscar usuario actual
    const result = await query(
      'SELECT * FROM usuarios WHERE id = $1 AND activo = true',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Usuario no encontrado o desactivado'
        )
      );
    }

    const user = result.rows[0];

    // Obtener información adicional del empleado si existe
    let empleadoInfo = null;
    let modulosPermitidos = [];
    
    if (user.empleado_id) {
      const empleadoResult = await query(
        'SELECT * FROM empleados WHERE id = $1',
        [user.empleado_id]
      );
      
      if (empleadoResult.rows.length > 0) {
        empleadoInfo = empleadoResult.rows[0];
        
        // Obtener módulos del empleado
        const modulosResult = await query(
          'SELECT modulo FROM empleados_modulos WHERE empleado_id = $1 AND acceso = true',
          [user.empleado_id]
        );
        
        modulosPermitidos = modulosResult.rows.map(m => m.modulo);
      }
    }
    
    // Responder con datos del usuario válidos
    res.json(
      createResponse(
        true,
        {
          valid: true,
          usuario: {
            id: user.id,
            username: user.username,
            nombre: user.nombre,
            email: user.email,
            role: user.role,
            roles: typeof user.roles === 'string' ? [user.roles] : (Array.isArray(user.roles) ? user.roles : [user.role]),
            activo: user.activo,
            mustResetPassword: user.must_reset_password || false,
            fechaRegistro: user.fecha_registro,
            ultimoAcceso: user.ultimo_acceso,
            empleadoId: user.empleado_id,
            tipoPermiso: empleadoInfo?.tipo_acceso || null,
            modulosPermitidos: modulosPermitidos
          }
        },
        'Token válido'
      )
    );
    
  } catch (error) {

    res.status(401).json(
      createErrorResponse(
        CODIGOS_ERROR.TOKEN_EXPIRED,
        'Token inválido o expirado'
      )
    );
  }
}

/**
 * Cerrar sesión del usuario
 * Endpoint: POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await query(
        'UPDATE user_sessions SET active = false WHERE token_hash = $1',
        [hashToken(token)]
      );
    }
    res.json(createResponse(true, null, 'Sesión cerrada correctamente'));
  } catch (error) {
    res.status(500).json(
      createErrorResponse('Error al cerrar sesión', CODIGOS_ERROR.INTERNAL_ERROR)
    );
  }
}

/**
 * Registrar actividad del usuario (heartbeat desde frontend)
 * Endpoint: POST /api/auth/activity
 * El middleware ya actualiza last_activity; este endpoint solo confirma.
 */
async function activityHeartbeat(req, res) {
  res.json(createResponse(true, null, 'Actividad registrada'));
}

/**
 * Cambiar contraseña en sesión activa (para reseteo forzado)
 * Endpoint: PUT /api/auth/change-password
 * Requiere: auth middleware (JWT válido)
 * Body: { nuevaPassword }
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { nuevaPassword } = req.body;

    if (!nuevaPassword || nuevaPassword.length < 8) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'La nueva contraseña debe tener al menos 8 caracteres'
        )
      );
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    await query(
      `UPDATE usuarios
       SET password = $1, must_reset_password = false, fecha_modificacion = NOW()
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    return res.json(createResponse(true, null, 'Contraseña actualizada exitosamente'));
  } catch (error) {
    return res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.INTERNAL_ERROR, 'Error interno del servidor')
    );
  }
}

module.exports = { 
  login,
  verifyToken,
  logout,
  activityHeartbeat,
  changePassword
};
