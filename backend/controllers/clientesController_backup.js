/**
 * Controlador de Clientes
 * Gestiona todas las operaciones CRUD para clientes del sistema SuperCopias
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const XLSX = require('xlsx');
const fs = require('fs');

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

/**
 * Carga masiva de clientes desde archivo Excel
 * Endpoint: POST /api/clientes/upload-excel
 * 
 * @param {Object} req - Request object con archivo Excel
 * @param {Object} res - Response object
 * @returns {Object} JSON con resultado de la carga masiva
 */
function uploadExcelClientes(req, res) {
  try {
    console.log('📁 Upload Excel iniciado...');
    init();
    
    // Verificar que se subió un archivo
    if (!req.file) {
      console.log('❌ No se recibió archivo');
      return res.status(400).json({ 
        success: false, 
        message: 'No se encontró archivo Excel' 
      });
    }

    console.log(`📄 Archivo recibido: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📄 Tipo MIME: ${req.file.mimetype}`);
    console.log(`📄 Ruta temporal: ${req.file.path}`);

    // Leer el archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Primera hoja
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`📊 Filas encontradas: ${data.length}`);
    
    if (data.length < 2) {
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo debe contener al menos una fila de encabezados y una fila de datos' 
      });
    }

    // Validar encabezados esperados
    const encabezadosEsperados = [
      'nombre', 'telefono', 'segundo telefono', 'correo', 'direccion de entrega',
      'razon social', 'rfc', 'regimen fiscal', 'direccion', 'codigo postal', 'uso cfdi'
    ];
    
    const encabezados = data[0].map(h => (h || '').toString().toLowerCase().trim());
    
    // Verificar que todos los encabezados requeridos estén presentes
    const encabezadosFaltantes = encabezadosEsperados.filter(e => !encabezados.includes(e));
    if (encabezadosFaltantes.length > 0) {
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: `Faltan encabezados requeridos: ${encabezadosFaltantes.join(', ')}`,
        encabezadosRequeridos: encabezadosEsperados
      });
    }

    // Procesar filas de datos (desde la fila 2)
    const clientesParaCrear = [];
    const errores = [];

    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      
      // Saltar filas vacías
      if (!fila || fila.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }

      try {
        // Mapear columnas a propiedades del cliente
        const cliente = {
          id: nanoid(),
          nombre: (fila[encabezados.indexOf('nombre')] || '').toString().trim(),
          telefono: (fila[encabezados.indexOf('telefono')] || '').toString().trim(),
          segundoTelefono: (fila[encabezados.indexOf('segundo telefono')] || '').toString().trim(),
          email: (fila[encabezados.indexOf('correo')] || '').toString().trim(),
          direccionEntrega: (fila[encabezados.indexOf('direccion de entrega')] || '').toString().trim(),
          razon: (fila[encabezados.indexOf('razon social')] || '').toString().trim(),
          rfc: (fila[encabezados.indexOf('rfc')] || '').toString().trim(),
          regimen: (fila[encabezados.indexOf('regimen fiscal')] || '').toString().trim(),
          direccion: (fila[encabezados.indexOf('direccion')] || '').toString().trim(),
          cp: (fila[encabezados.indexOf('codigo postal')] || '').toString().trim(),
          cfdi: (fila[encabezados.indexOf('uso cfdi')] || '').toString().trim()
        };

        // Validación básica: nombre es requerido
        if (!cliente.nombre) {
          errores.push(`Fila ${i + 1}: Nombre es requerido`);
          continue;
        }

        clientesParaCrear.push(cliente);
        
      } catch (error) {
        errores.push(`Fila ${i + 1}: Error procesando datos - ${error.message}`);
      }
    }

    // Si hay errores críticos, no procesar nada
    if (clientesParaCrear.length === 0) {
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'No se encontraron clientes válidos para procesar',
        errores 
      });
    }

    // Insertar clientes en la base de datos
    const clientesInsertados = [];
    
    clientesParaCrear.forEach(cliente => {
      try {
        db.get('clientes').push(cliente).write();
        clientesInsertados.push(cliente);
      } catch (error) {
        errores.push(`Error insertando cliente ${cliente.nombre}: ${error.message}`);
      }
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    // Respuesta con resumen
    res.json({
      success: true,
      message: `Carga masiva completada: ${clientesInsertados.length} clientes agregados`,
      total: data.length - 1,
      insertados: clientesInsertados.length,
      errores: errores.length > 0 ? errores.map((error, index) => ({ 
        fila: index + 2, 
        mensaje: error 
      })) : [],
      datos: clientesInsertados
    });

  } catch (error) {
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error procesando archivo Excel',
      error: error.message
    });
  }
}

module.exports = { 
  listClientes, 
  getCliente, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  getUsosCFDI,
  uploadExcelClientes 
};
