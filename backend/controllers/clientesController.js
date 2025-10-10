/**
 * Controlador de Clientes - SuperCopias
 * Gestiona todas las operaciones CRUD para clientes con estándar API
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const XLSX = require('xlsx');
const fs = require('fs');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Obtener lista de clientes con búsqueda y paginación
 * Endpoint: GET /api/clientes
 * Query params: q (búsqueda), page (página), limit (límite por página)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con array de clientes y paginación
 */
function listClientes(req, res) {
  try {
    init();
    
    // Parámetros de consulta
    const q = (req.query.q || '').toLowerCase();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    
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
    
    // Filtrar solo clientes activos por defecto
    if (!req.query.includeInactive) {
      items = items.filter(c => c.activo);
    }
    
    // Ordenar por fecha de registro (más recientes primero)
    items.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
    
    // Paginación
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    
    res.json(createPaginatedResponse(paged, page, limit, items.length));
    
  } catch (error) {
    console.error('Error listando clientes:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Obtener un cliente específico por ID
 * Endpoint: GET /api/clientes/:id
 * 
 * @param {Object} req - Request object con param id
 * @param {Object} res - Response object
 * @returns {Object} JSON con datos del cliente o error 404
 */
function getCliente(req, res) {
  try {
    init();
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del cliente es requerido'
        )
      );
    }
    
    const cliente = db.get('clientes').find({ id }).value();
    
    if (!cliente) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    res.json(
      createResponse(
        true,
        cliente,
        'Cliente encontrado'
      )
    );
    
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Crear un nuevo cliente
 * Endpoint: POST /api/clientes
 * 
 * @param {Object} req - Request object con body del cliente
 * @param {Object} res - Response object
 * @returns {Object} JSON con cliente creado o error de validación
 */
function createCliente(req, res) {
  try {
    init();
    
    const {
      nombre,
      telefono,
      segundoTelefono,
      email,
      direccionEntrega,
      razon,
      rfc,
      regimen,
      direccion,
      cp,
      cfdi
    } = req.body;
    
    // Validaciones requeridas
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Nombre es requerido'
        )
      );
    }

    if (!telefono || telefono.trim().length === 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Teléfono es requerido'
        )
      );
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Correo electrónico es requerido'
        )
      );
    }

    // Validaciones de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_FORMAT,
          'Formato de correo electrónico inválido'
        )
      );
    }

    const telefonoRegex = /^[\d\-\+\(\)\s]+$/;
    if (!telefonoRegex.test(telefono)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_FORMAT,
          'Formato de teléfono inválido'
        )
      );
    }

    // Validar RFC si se proporciona
    if (rfc) {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(rfc.toUpperCase())) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Formato de RFC inválido'
          )
        );
      }
    }
    
    // Verificar si el RFC ya existe (solo si se proporciona)
    if (rfc) {
      const rfcExistente = db.get('clientes')
        .find({ rfc: rfc.toUpperCase(), activo: true })
        .value();
      
      if (rfcExistente) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este RFC'
          )
        );
      }
    }

    // Verificar si el email ya existe
    const emailExistente = db.get('clientes')
      .find({ email: email.toLowerCase(), activo: true })
      .value();
    
    if (emailExistente) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.ALREADY_EXISTS,
          'Ya existe un cliente con este correo electrónico'
        )
      );
    }
    
    // Crear nuevo cliente con la estructura correcta
    const nuevoCliente = {
      id: `CLI_${nanoid(10)}`,
      nombre: nombre.trim(),
      telefono: telefono || null,
      segundoTelefono: segundoTelefono || null,
      email: email ? email.toLowerCase() : null,
      direccionEntrega: direccionEntrega || null,
      razon: razon || null,
      rfc: rfc ? rfc.toUpperCase() : null,
      regimen: regimen || null,
      direccion: direccion || null,
      cp: cp || null,
      cfdi: cfdi || null,
      activo: true,
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    };
    
    // Guardar en la base de datos
    db.get('clientes').push(nuevoCliente).write();
    
    res.status(201).json(
      createResponse(
        true,
        nuevoCliente,
        'Cliente creado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Actualizar un cliente existente
 * Endpoint: PUT /api/clientes/:id
 * 
 * @param {Object} req - Request object con param id y body del cliente
 * @param {Object} res - Response object
 * @returns {Object} JSON con cliente actualizado o error
 */
function updateCliente(req, res) {
  try {
    init();
    
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del cliente es requerido'
        )
      );
    }
    
    // Buscar cliente existente
    const clienteExistente = db.get('clientes').find({ id }).value();
    
    if (!clienteExistente) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    // Si se actualiza el RFC, verificar que no esté duplicado
    if (updateData.rfc && updateData.rfc.toUpperCase() !== clienteExistente.rfc) {
      const rfcDuplicado = db.get('clientes')
        .find({ 
          rfc: updateData.rfc.toUpperCase(), 
          activo: true,
          id: { $ne: id }
        })
        .value();
      
      if (rfcDuplicado) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe otro cliente con este RFC'
          )
        );
      }
    }
    
    // Preparar datos de actualización
    const datosActualizacion = {
      ...updateData,
      fechaModificacion: new Date().toISOString()
    };
    
    // Normalizar datos si existen
    if (datosActualizacion.rfc) {
      datosActualizacion.rfc = datosActualizacion.rfc.toUpperCase();
    }
    if (datosActualizacion.email) {
      datosActualizacion.email = datosActualizacion.email.toLowerCase();
    }
    if (datosActualizacion.nombre) {
      datosActualizacion.nombre = datosActualizacion.nombre.trim();
    }
    
    // Actualizar en la base de datos
    const clienteActualizado = db.get('clientes')
      .find({ id })
      .assign(datosActualizacion)
      .write();
    
    res.json(
      createResponse(
        true,
        clienteActualizado,
        'Cliente actualizado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Eliminar un cliente (desactivar)
 * Endpoint: DELETE /api/clientes/:id
 * 
 * @param {Object} req - Request object con param id
 * @param {Object} res - Response object
 * @returns {Object} JSON con confirmación o error
 */
function deleteCliente(req, res) {
  try {
    init();
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del cliente es requerido'
        )
      );
    }
    
    const cliente = db.get('clientes').find({ id }).value();
    
    if (!cliente) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    // Verificar si tiene dependencias (facturas, pedidos, etc.)
    // Aquí podrías agregar validaciones adicionales
    
    // Desactivar cliente en lugar de eliminar
    db.get('clientes')
      .find({ id })
      .assign({ 
        activo: false,
        fechaModificacion: new Date().toISOString()
      })
      .write();
    
    res.json(
      createResponse(
        true,
        { id, activo: false },
        'Cliente desactivado exitosamente'
      )
    );
    
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Importar clientes desde archivo Excel
 * Endpoint: POST /api/clientes/upload-excel
 * 
 * @param {Object} req - Request object con archivo Excel
 * @param {Object} res - Response object
 * @returns {Object} JSON con resultado de la importación
 */
function uploadExcelClientes(req, res) {
  try {
    init();
    
    if (!req.file) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Archivo Excel es requerido'
        )
      );
    }
    
    // Leer archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const resultados = {
      importados: 0,
      errores: [],
      creados: []
    };
    
    // Procesar cada fila
    for (let i = 0; i < jsonData.length; i++) {
      const fila = jsonData[i];
      
      try {
        // Validaciones requeridas
        if (!fila.nombre || fila.nombre.toString().trim().length === 0) {
          resultados.errores.push(`Fila ${i + 2}: Nombre es requerido`);
          continue;
        }

        if (!fila.telefono || fila.telefono.toString().trim().length === 0) {
          resultados.errores.push(`Fila ${i + 2}: Teléfono es requerido`);
          continue;
        }

        const correo = fila.correo || fila.email;
        if (!correo || correo.toString().trim().length === 0) {
          resultados.errores.push(`Fila ${i + 2}: Correo electrónico es requerido`);
          continue;
        }

        // Validaciones de formato
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo.toString().trim())) {
          resultados.errores.push(`Fila ${i + 2}: Formato de correo electrónico inválido`);
          continue;
        }

        const telefonoRegex = /^[\d\-\+\(\)\s]+$/;
        if (!telefonoRegex.test(fila.telefono.toString().trim())) {
          resultados.errores.push(`Fila ${i + 2}: Formato de teléfono inválido`);
          continue;
        }

        // Validar RFC si se proporciona
        if (fila.rfc) {
          const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
          if (!rfcRegex.test(fila.rfc.toString().toUpperCase())) {
            resultados.errores.push(`Fila ${i + 2}: Formato de RFC inválido`);
            continue;
          }
        }
        
        // Verificar RFC duplicado solo si existe
        if (fila.rfc) {
          const rfcExistente = db.get('clientes')
            .find({ rfc: fila.rfc.toString().toUpperCase(), activo: true })
            .value();
          
          if (rfcExistente) {
            resultados.errores.push(`Fila ${i + 2}: RFC ${fila.rfc} ya existe`);
            continue;
          }
        }

        // Verificar email duplicado
        const emailExistente = db.get('clientes')
          .find({ email: correo.toString().toLowerCase(), activo: true })
          .value();
        
        if (emailExistente) {
          resultados.errores.push(`Fila ${i + 2}: Email ${correo} ya existe`);
          continue;
        }
        
        // Crear cliente con estructura correcta
        const nuevoCliente = {
          id: `CLI_${nanoid(10)}`,
          nombre: fila.nombre.trim(),
          telefono: fila.telefono || null,
          segundoTelefono: fila['segundo telefono'] || fila.segundoTelefono || null,
          email: fila.correo || fila.email ? (fila.correo || fila.email).toLowerCase() : null,
          direccionEntrega: fila['direccion de entrega'] || fila.direccionEntrega || null,
          razon: fila['razon social'] || fila.razon || null,
          rfc: fila.rfc ? fila.rfc.toUpperCase() : null,
          regimen: fila['regimen fiscal'] || fila.regimen || null,
          direccion: fila.direccion || null,
          cp: fila['codigo postal'] || fila.cp || null,
          cfdi: fila['uso cfdi'] || fila.cfdi || null,
          activo: true,
          fechaRegistro: new Date().toISOString(),
          fechaModificacion: null
        };
        
        db.get('clientes').push(nuevoCliente).write();
        resultados.creados.push(nuevoCliente);
        resultados.importados++;
        
      } catch (error) {
        resultados.errores.push(`Fila ${i + 1}: ${error.message}`);
      }
    }
    
    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);
    
    res.json(
      createResponse(
        true,
        resultados,
        `Importación completada: ${resultados.importados} clientes importados`
      )
    );
    
  } catch (error) {
    console.error('Error importando Excel:', error);
    
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.FILE_ERROR,
        'Error procesando archivo Excel'
      )
    );
  }
}

/**
 * Obtener catálogo de Usos CFDI
 * Endpoint: GET /api/clientes/usos-cfdi
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con catálogo de usos CFDI
 */
function getUsosCFDI(req, res) {
  try {
    // Catálogo oficial de Usos CFDI del SAT
    const usosCFDI = [
      { clave: 'G01', descripcion: 'Adquisición de mercancías' },
      { clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
      { clave: 'G03', descripcion: 'Gastos en general' },
      { clave: 'I01', descripcion: 'Construcciones' },
      { clave: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
      { clave: 'I03', descripcion: 'Equipo de transporte' },
      { clave: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
      { clave: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
      { clave: 'I06', descripcion: 'Comunicaciones telefónicas' },
      { clave: 'I07', descripcion: 'Comunicaciones satelitales' },
      { clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
      { clave: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
      { clave: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
      { clave: 'D03', descripcion: 'Gastos funerales' },
      { clave: 'D04', descripcion: 'Donativos' },
      { clave: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios' },
      { clave: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
      { clave: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
      { clave: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
      { clave: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
      { clave: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
      { clave: 'P01', descripcion: 'Por definir' },
      { clave: 'S01', descripcion: 'Sin efectos fiscales' },
      { clave: 'CP01', descripcion: 'Pagos' },
      { clave: 'CN01', descripcion: 'Nómina' }
    ];

    res.json(
      createResponse(
        true,
        usosCFDI,
        'Catálogo de Usos CFDI obtenido exitosamente'
      )
    );

  } catch (error) {
    console.error('Error obteniendo usos CFDI:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Descargar plantilla Excel para carga masiva de clientes
 * Endpoint: GET /api/clientes/plantilla-excel
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {File} Archivo Excel con plantilla y ejemplos
 */
function descargarPlantillaExcel(req, res) {
  try {
    const { generarPlantillaClientes } = require('../utils/plantillaClientes');
    const path = require('path');
    
    // Generar plantilla
    const filePath = generarPlantillaClientes();
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_clientes.xlsx"');
    
    // Enviar archivo
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error enviando plantilla:', err);
        res.status(500).json(
          createErrorResponse(
            CODIGOS_ERROR.FILE_ERROR,
            'Error generando plantilla'
          )
        );
      }
    });

  } catch (error) {
    console.error('Error generando plantilla:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

module.exports = {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  uploadExcelClientes,
  getUsosCFDI,
  descargarPlantillaExcel
};