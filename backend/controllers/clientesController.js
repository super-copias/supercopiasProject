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

function getUsosCFDI(req, res) {
  // Catálogo completo de Usos CFDI vigentes en México
  const usosCFDI = [
    { codigo: 'G01', descripcion: 'Adquisición de mercancías' },
    { codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
    { codigo: 'G03', descripcion: 'Gastos en general' },
    { codigo: 'I01', descripcion: 'Construcciones' },
    { codigo: 'I02', descripcion: 'Mobilario y equipo de oficina por inversiones' },
    { codigo: 'I03', descripcion: 'Equipo de transporte' },
    { codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
    { codigo: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
    { codigo: 'I06', descripcion: 'Comunicaciones telefónicas' },
    { codigo: 'I07', descripcion: 'Comunicaciones satelitales' },
    { codigo: 'I08', descripcion: 'Otra maquinaria y equipo' },
    { codigo: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
    { codigo: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
    { codigo: 'D03', descripcion: 'Gastos funerales' },
    { codigo: 'D04', descripcion: 'Donativos' },
    { codigo: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
    { codigo: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
    { codigo: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
    { codigo: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
    { codigo: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
    { codigo: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
    { codigo: 'S01', descripcion: 'Sin efectos fiscales' },
    { codigo: 'CP01', descripcion: 'Pagos' },
    { codigo: 'CN01', descripcion: 'Nómina' }
  ];
  
  res.json(usosCFDI);
}

module.exports = { listClientes, getCliente, createCliente, updateCliente, deleteCliente, getUsosCFDI };
