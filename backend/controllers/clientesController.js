const { db, init } = require('../db');
const { nanoid } = require('nanoid');

function listClientes(req, res) {
  init();
  const q = (req.query.q || '').toLowerCase();
  let items = db.get('clientes').value() || [];
  if (q) {
    const qnorm = q.normalize ? q.normalize('NFD').replace(/\p{Diacritic}/gu, '') : q;
    items = items.filter(c => {
      return Object.values(c).some(v => {
        const s = (v || '').toString();
        const sn = s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '') : s;
        return sn.toLowerCase().includes(qnorm.toLowerCase());
      });
    });
  }
  // paginado simple
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);
  res.json({ data: paged, total: items.length });
}

function getCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Cliente no encontrado' });
  res.json(item);
}

function createCliente(req, res) {
  init();
  const data = req.body;
  const nuevo = Object.assign({ id: nanoid() }, data);
  db.get('clientes').push(nuevo).write();
  res.status(201).json(nuevo);
}

function updateCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Cliente no encontrado' });
  const updated = Object.assign(item, req.body);
  db.get('clientes').find({ id }).assign(updated).write();
  res.json(updated);
}

function deleteCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  if (!item) return res.status(404).json({ message: 'Cliente no encontrado' });
  db.get('clientes').remove({ id }).write();
  res.json(item);
}

module.exports = { listClientes, getCliente, createCliente, updateCliente, deleteCliente };
