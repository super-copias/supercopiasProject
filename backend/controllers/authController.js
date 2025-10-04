const { db, init } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'supercopias_secret';

function login(req, res) {
  init();
  const { username, password } = req.body;
  const user = db.get('usuarios').find({ username }).value();
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
}

module.exports = { login };
