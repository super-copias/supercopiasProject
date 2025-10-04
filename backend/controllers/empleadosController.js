const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const fs = require('fs');
const xlsx = require('xlsx');

function listEmpleados(req, res) {
  init();
  const q = (req.query.q || '').toLowerCase();
  let items = db.get('empleados').value() || [];
  if (q) {
    items = items.filter(c => (c.nombre || '').toLowerCase().includes(q) || (c.id || '').includes(q));
  }
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);
  res.json({ data: paged, total: items.length });
}

function getEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Empleado no encontrado' });
  res.json(item);
}

function createEmpleado(req, res) {
  init();
  const data = req.body;
  const nuevo = Object.assign({ id: nanoid() }, data);
  db.get('empleados').push(nuevo).write();
  res.status(201).json(nuevo);
}

function updateEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Empleado no encontrado' });
  const updated = Object.assign(item, req.body);
  db.get('empleados').find({ id }).assign(updated).write();
  res.json(updated);
}

function deleteEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Empleado no encontrado' });
  db.get('empleados').remove({ id }).write();
  res.json(item);
}

function importEmpleados(req, res) {
  init();
  if (!req.file) return res.status(400).json({ message: 'Archivo no proporcionado' });
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  const nuevos = data.map(row => Object.assign({ id: nanoid() }, row));
  db.get('empleados').push(...nuevos).write();
  // borrar archivo temporal
  try { fs.unlinkSync(req.file.path); } catch (e) { }
  res.json({ imported: nuevos.length });
}

function assignRole(req, res) {
  init();
  const id = req.params.id;
  const { role } = req.body;
  const item = db.get('empleados').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Empleado no encontrado' });
  db.get('empleados').find({ id }).assign({ role }).write();
  // opcional: crear usuario de sistema
  if (req.body.createUser) {
    const bcrypt = require('bcryptjs');
    const pwd = bcrypt.hashSync(req.body.password || 'ChangeMe123!', 8);
    db.get('usuarios').push({ id: nanoid(), username: req.body.username || item.nombre || ('user'+Date.now()), password: pwd, role }).write();
  }
  res.json(db.get('empleados').find({ id }).value());
}

module.exports = { listEmpleados, getEmpleado, createEmpleado, updateEmpleado, deleteEmpleado, importEmpleados, assignRole };
