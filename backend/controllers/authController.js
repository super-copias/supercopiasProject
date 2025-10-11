/**
 * Controlador de Autenticación - SuperCopias
 * Gestiona el login y autenticación de usuarios del sistema con estándar API
 */

const { db, init } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createResponse, createErrorResponse, CODIGOS_ERROR } = require('../utils/apiStandard');

// Clave secreta para firmar tokens JWT
const SECRET = process.env.JWT_SECRET || 'supercopias_secret';

/**
 * Autenticar usuario y generar token JWT
 * Endpoint: POST /api/auth/login
 * 
 * @param {Object} req - Request object con body { identifier, password }
 * @param {Object} res - Response object
 * @returns {Object} JSON con token y datos del usuario o error 401
 */
function login(req, res) {
  try {
    init();
    
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
    
    // Buscar usuario por username o email
    const user = db.get('usuarios').find(u => 
      u.username === identifier || (u.email && u.email === identifier)
    ).value();
    
    if (!user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Credenciales inválidas'
        )
      );
    }
    
    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.FORBIDDEN,
          'Usuario desactivado'
        )
      );
    }
    
    // Verificar contraseña
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
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
        role: user.role 
      }, 
      SECRET, 
      { expiresIn: '8h' }
    );
    
    // Actualizar último acceso
    db.get('usuarios')
      .find({ id: user.id })
      .assign({ 
        ultimoAcceso: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      })
      .write();

    // Obtener información adicional del empleado si existe
    let empleadoInfo = null;
    if (user.empleadoId) {
      empleadoInfo = db.get('empleados')
        .find({ id: user.empleadoId })
        .value();
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
            roles: user.roles,
            activo: user.activo,
            fechaRegistro: user.fechaRegistro,
            ultimoAcceso: user.ultimoAcceso,
            empleadoId: user.empleadoId,
            tipoPermiso: empleadoInfo?.tipoPermiso,
            modulosPermitidos: empleadoInfo?.modulosPermitidos || []
          }
        },
        'Login exitoso'
      )
    );
    
  } catch (error) {
    console.error('Error en login:', error);
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
function verifyToken(req, res) {
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
    
    // Buscar usuario actual
    init();
    const user = db.get('usuarios')
      .find({ 
        id: decoded.id,
        activo: true 
      })
      .value();
    
    if (!user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Usuario no encontrado o desactivado'
        )
      );
    }

    // Obtener información adicional del empleado si existe
    let empleadoInfo = null;
    if (user.empleadoId) {
      empleadoInfo = db.get('empleados')
        .find({ id: user.empleadoId })
        .value();
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
            roles: user.roles,
            activo: user.activo,
            fechaRegistro: user.fechaRegistro,
            ultimoAcceso: user.ultimoAcceso,
            empleadoId: user.empleadoId,
            tipoPermiso: empleadoInfo?.tipoPermiso,
            modulosPermitidos: empleadoInfo?.modulosPermitidos || []
          }
        },
        'Token válido'
      )
    );
    
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(401).json(
      createErrorResponse(
        CODIGOS_ERROR.TOKEN_EXPIRED,
        'Token inválido o expirado'
      )
    );
  }
}

module.exports = { 
  login,
  verifyToken
};
