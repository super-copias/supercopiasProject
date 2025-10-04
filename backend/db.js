const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

function init() {
  // asegurar estructura por defecto
  db.defaults({ usuarios: [], clientes: [], empleados: [] }).write();
  // crear usuario admin por defecto si no existe
  if (!db.get('usuarios').find({ username: 'admin' }).value()) {
    const bcrypt = require('bcryptjs');
    const { nanoid } = require('nanoid');
    const pwd = bcrypt.hashSync('Admin123!', 8);
    db.get('usuarios').push({ id: nanoid(), username: 'admin', password: pwd, role: 'admin' }).write();
  }
}

module.exports = { db, init };
