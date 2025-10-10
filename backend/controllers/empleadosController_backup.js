/**
 * Controlador de Empleados
 * Gestiona todas las operaciones CRUD para empleados del sistema SuperCopias
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Obtener lista de empleados con búsqueda y paginación
 * Endpoint: GET /api/empleados
 * Query params: q (búsqueda), page (página), limit (límite por página)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de empleados y total
 */
function listEmpleados(req, res) {
  init();
  
  // Parámetro de búsqueda (opcional)
  const q = (req.query.q || '').toLowerCase();
  let items = db.get('empleados').value() || [];
  
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
 * Obtener un empleado específico por ID
 * Endpoint: GET /api/empleados/:id
 * 
 * @param {Object} req - Request object con params.id
 * @param {Object} res - Response object
 * @returns {Object} JSON del empleado o error 404
 */
function getEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Empleado no encontrado' });
  }
  
  res.json(item);
}

/**
 * Crear un nuevo empleado
 * Endpoint: POST /api/empleados
 * 
 * @param {Object} req - Request object con body conteniendo datos del empleado
 * @param {Object} res - Response object
 * @returns {Object} JSON del empleado creado con ID generado
 */
function createEmpleado(req, res) {
  init();
  const data = req.body;
  
  // Validaciones básicas
  if (!data.nombre || !data.telefono) {
    return res.status(400).json({ 
      message: 'Campos requeridos: nombre, telefono' 
    });
  }
  
  // Generar ID único y crear empleado
  const nuevo = Object.assign({ 
    id: nanoid(),
    fechaRegistro: new Date().toISOString(),
    activo: true
  }, data);
  
  db.get('empleados').push(nuevo).write();
  
  res.status(201).json(nuevo);
}

/**
 * Actualizar un empleado existente
 * Endpoint: PUT /api/empleados/:id
 * 
 * @param {Object} req - Request object con params.id y body con datos a actualizar
 * @param {Object} res - Response object
 * @returns {Object} JSON del empleado actualizado o error 404
 */
function updateEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Empleado no encontrado' });
  }
  
  // Actualizar datos
  const updated = Object.assign(item, req.body, {
    fechaModificacion: new Date().toISOString()
  });
  
  db.get('empleados').find({ id }).assign(updated).write();
  
  res.json(updated);
}

/**
 * Eliminar un empleado
 * Endpoint: DELETE /api/empleados/:id
 * 
 * @param {Object} req - Request object con params.id
 * @param {Object} res - Response object
 * @returns {Object} JSON del empleado eliminado o error 404
 */
function deleteEmpleado(req, res) {
  init();
  const id = req.params.id;
  const item = db.get('empleados').find({ id }).value();
  
  if (!item) {
    return res.status(404).json({ message: 'Empleado no encontrado' });
  }
  
  db.get('empleados').remove({ id }).write();
  res.json(item);
}

/**
 * Carga masiva de empleados desde archivo Excel
 * Endpoint: POST /api/empleados/upload-excel
 * 
 * @param {Object} req - Request object con archivo Excel
 * @param {Object} res - Response object
 * @returns {Object} JSON con estadísticas de importación
 */
function uploadExcelEmpleados(req, res) {
  init();
  
  if (!req.file) {
    return res.status(400).json({ message: 'Archivo no proporcionado' });
  }
  
  try {
    // Leer archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let creados = 0;
    let errores = [];
    
    // Procesar cada fila
    data.forEach((row, index) => {
      try {
        // Validar campos requeridos
        if (!row.nombre || !row.telefono) {
          errores.push(`Fila ${index + 2}: Campos requeridos faltantes (nombre, telefono)`);
          return;
        }
        
        // Crear empleado
        const empleado = {
          id: nanoid(),
          nombre: row.nombre,
          telefono: row.telefono,
          email: row.email || '',
          puesto: row.puesto || '',
          departamento: row.departamento || '',
          salario: row.salario || 0,
          fechaIngreso: row.fechaIngreso || new Date().toISOString(),
          fechaRegistro: new Date().toISOString(),
          activo: true
        };
        
        db.get('empleados').push(empleado).write();
        creados++;
        
      } catch (error) {
        errores.push(`Fila ${index + 2}: Error al procesar - ${error.message}`);
      }
    });
    
    // Limpiar archivo temporal
    try { 
      fs.unlinkSync(req.file.path); 
    } catch (e) { 
      console.log('Error al eliminar archivo temporal:', e.message);
    }
    
    res.json({ 
      imported: creados,
      errors: errores,
      message: `Se importaron ${creados} empleados correctamente`
    });
    
  } catch (error) {
    // Limpiar archivo temporal en caso de error
    try { 
      fs.unlinkSync(req.file.path); 
    } catch (e) {}
    
    res.status(500).json({ 
      message: 'Error al procesar archivo Excel', 
      error: error.message 
    });
  }
}

/**
 * Asignar rol a un empleado
 * Endpoint: PUT /api/empleados/:id/role
 * 
 * @param {Object} req - Request object con params.id y body con role
 * @param {Object} res - Response object
 * @returns {Object} JSON del empleado actualizado
 */
function assignRole(req, res) {
  init();
  const id = req.params.id;
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({ message: 'Campo role es requerido' });
  }
  
  const item = db.get('empleados').find({ id }).value();
  if (!item) {
    return res.status(404).json({ message: 'Empleado no encontrado' });
  }
  
  // Actualizar rol
  db.get('empleados').find({ id }).assign({ 
    role,
    fechaModificacion: new Date().toISOString()
  }).write();
  
  // Opcional: crear usuario de sistema
  if (req.body.createUser) {
    const bcrypt = require('bcryptjs');
    const pwd = bcrypt.hashSync(req.body.password || 'ChangeMe123!', 8);
    const username = req.body.username || item.nombre?.toLowerCase().replace(/\s+/g, '') || ('user'+Date.now());
    
    db.get('usuarios').push({ 
      id: nanoid(), 
      username, 
      password: pwd, 
      role,
      empleadoId: id,
      fechaCreacion: new Date().toISOString()
    }).write();
  }
  
  res.json(db.get('empleados').find({ id }).value());
}

/**
 * Obtener catálogo de puestos/departamentos
 * Endpoint: GET /api/empleados/puestos
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Array} JSON array con puestos disponibles
 */
function getPuestos(req, res) {
  const puestos = [
    { id: 'gerente', nombre: 'Gerente' },
    { id: 'supervisor', nombre: 'Supervisor' },
    { id: 'operador', nombre: 'Operador' },
    { id: 'cajero', nombre: 'Cajero' },
    { id: 'vendedor', nombre: 'Vendedor' },
    { id: 'tecnico', nombre: 'Técnico' },
    { id: 'administrativo', nombre: 'Administrativo' },
    { id: 'limpieza', nombre: 'Limpieza' },
    { id: 'seguridad', nombre: 'Seguridad' }
  ];
  
  res.json(puestos);
}

module.exports = { 
  listEmpleados, 
  getEmpleado, 
  createEmpleado, 
  updateEmpleado, 
  deleteEmpleado, 
  uploadExcelEmpleados,
  assignRole,
  getPuestos
};
