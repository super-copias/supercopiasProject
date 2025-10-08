/**
 * Controlador de Clientes
 * Gestiona todas las operaciones CRUD para clientes del sistema SuperCopias
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');

/**
 * Obtener lista de clientes con búsqueda y paginación
 * Endpoint: GET /api/clientes
 * Query params: q (búsqueda), page (página), limit (límite por página)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de clientes y total
 */
function listClientes(req, res) {
  init();
  
  // Parámetro de búsqueda (opcional)
  const q = (req.query.q || '').toLowerCase();
  let items = db.get('clientes').value() || [];
  
  // Filtrar por búsqueda si se proporciona
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
  
  // Paginación
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);
  
  res.json({ data: paged, total: items.length });
}

/**
 * Obtener un cliente específico por ID
 * Endpoint: GET /api/clientes/:id
 * 
 * @param {Object} req - Request object con params.id
 * @param {Object} res - Response object
 * @returns {Object} JSON del cliente o error 404
 */
function getCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }
  
  res.json(item);
}

/**
 * Crear un nuevo cliente
 * Endpoint: POST /api/clientes
 * 
 * @param {Object} req - Request object con body conteniendo datos del cliente
 * @param {Object} res - Response object
 * @returns {Object} JSON del cliente creado con ID generado
 */
function createCliente(req, res) {
  init();
  const data = req.body;
  
  // Generar ID único y crear cliente
  const nuevo = Object.assign({ id: nanoid() }, data);
  db.get('clientes').push(nuevo).write();
  
  res.status(201).json(nuevo);
}

/**
 * Actualizar un cliente existente
 * Endpoint: PUT /api/clientes/:id
 * 
 * @param {Object} req - Request object con params.id y body con datos a actualizar
 * @param {Object} res - Response object
 * @returns {Object} JSON del cliente actualizado o error 404
 */
function updateCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }
  
  // Actualizar datos
  const updated = Object.assign(item, req.body);
  db.get('clientes').find({ id }).assign(updated).write();
  
  res.json(updated);
}

/**
 * Eliminar un cliente
 * Endpoint: DELETE /api/clientes/:id
 * 
 * @param {Object} req - Request object con params.id
 * @param {Object} res - Response object
 * @returns {Object} JSON del cliente eliminado o error 404
 */
function deleteCliente(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('clientes').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }
  
  db.get('clientes').remove({ id }).write();
  res.json(item);
}

/**
 * Obtener catálogo de Usos CFDI vigentes en México
 * Endpoint: GET /api/clientes/cfdi/usos
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Array} JSON array con códigos y descripciones CFDI
 */
function getUsosCFDI(req, res) {
  // Catálogo completo de Usos CFDI vigentes en México según SAT
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

module.exports = { 
  listClientes, 
  getCliente, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  getUsosCFDI 
};
