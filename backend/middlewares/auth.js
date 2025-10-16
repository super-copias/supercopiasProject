const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supercopias_secret';

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  // En desarrollo, permitir acceso si no se proporciona Authorization
  if (!authHeader && process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev', username: 'dev', role: 'admin' };
    return next();
  }
  if (!authHeader) return res.status(401).json({ message: 'No autorizado' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'Token inválido' });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
