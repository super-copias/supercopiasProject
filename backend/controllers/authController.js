/**
 * Controlador de Autenticación
 * Gestiona el login y autenticación de usuarios del sistema SuperCopias
 */

const { db, init } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  init();
  
  const { identifier, password } = req.body;
  
  // Buscar usuario por username o email
  const user = db.get('usuarios').find(u => 
    u.username === identifier || (u.email && u.email === identifier)
  ).value();
  
  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  
  // Verificar contraseña
  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
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
  
  // Responder con token y datos del usuario (sin contraseña)
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    } 
  });
}

module.exports = { login };
