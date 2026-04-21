const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');

const SECRET = process.env.JWT_SECRET || 'supercopias_secret';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function errorResponse(code, message) {
  return { success: false, error: { code, message }, timestamp: new Date().toISOString() };
}

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  // En desarrollo, permitir acceso sin Authorization
  if (!authHeader && process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev', username: 'dev', nombre: 'dev', role: 'admin' };
    return next();
  }

  if (!authHeader) {
    return res.status(401).json(errorResponse('TOKEN_MISSING', 'No autorizado'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json(errorResponse('TOKEN_INVALID', 'Token inválido'));
  }

  const token = parts[1];

  try {
    const decoded   = jwt.verify(token, SECRET);
    const tokenHash = hashToken(token);

    // Buscar sesión en BD
    const sessionResult = await query(
      'SELECT id, active, last_activity FROM user_sessions WHERE token_hash = $1 AND usuario_id = $2',
      [tokenHash, decoded.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json(errorResponse('SESSION_NOT_FOUND', 'Sesión no encontrada'));
    }

    const session = sessionResult.rows[0];

    // Sesión desplazada por otro login
    if (!session.active) {
      return res.status(401).json(errorResponse(
        'SESSION_INVALIDATED',
        'Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.'
      ));
    }

    // Verificar inactividad (15 minutos)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    //pruebas
    //const fifteenMinutesAgo = new Date(Date.now() - 30 * 1000);

    if (new Date(session.last_activity) < fifteenMinutesAgo) {
      await query('UPDATE user_sessions SET active = false WHERE id = $1', [session.id]);
      return res.status(401).json(errorResponse(
        'SESSION_EXPIRED',
        'Sesión cerrada por inactividad.'
      ));
    }

    // Actualizar last_activity en cada request autenticado
    await query('UPDATE user_sessions SET last_activity = NOW() WHERE id = $1', [session.id]);

    req.user      = decoded;
    req.sessionId = session.id;
    req.tokenHash = tokenHash;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(errorResponse('TOKEN_EXPIRED', 'Token JWT expirado'));
    }
    return res.status(401).json(errorResponse('TOKEN_INVALID', 'Token inválido'));
  }
};
