/**
 * Controlador de Clientes - SuperCopias
 * Gestiona todas las operaciones CRUD para clientes con estándar API 
 */

const { query } = require('../config/database');
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
async function listClientes(req, res) {
  try {
    // Parámetros de consulta
    const q = (req.query.q || '').toLowerCase();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      SELECT * FROM clientes 
      WHERE activo = true
    `;
    let countQuery = 'SELECT COUNT(*) FROM clientes WHERE activo = true';
    let queryParams = [];
    
    // Filtrar por búsqueda si se proporciona
    if (q) {
      const searchCondition = ` AND (
        LOWER(razon_social) LIKE $1 OR 
        LOWER(nombre_comercial) LIKE $1 OR
        LOWER(email) LIKE $1 OR 
        LOWER(telefono) LIKE $1 OR
        LOWER(rfc) LIKE $1
      )`;
      baseQuery += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${q}%`);
    }
    
    // Incluir inactivos si se solicita
    if (req.query.includeInactive) {
      baseQuery = baseQuery.replace('WHERE activo = true', 'WHERE 1=1');
      countQuery = countQuery.replace('WHERE activo = true', 'WHERE 1=1');
    }
    
    // Agregar ordenamiento y paginación
    baseQuery += ` ORDER BY fecha_registro DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    // Ejecutar consultas
    const [itemsResult, countResult] = await Promise.all([
      query(baseQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);
    
    const clientesDB = itemsResult.rows;
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Mapear campos de BD a formato del frontend
    const items = clientesDB.map(c => ({
      id: c.id,
      nombre: c.nombre_comercial || c.razon_social,
      telefono: c.telefono,
      segundoTelefono: c.segundo_telefono,
      email: c.email,
      direccionEntrega: c.direccion,
      razon: c.razon_social,
      rfc: c.rfc,
      regimen: c.regimen_fiscal,
      direccion: c.direccion,
      cp: c.direccion_codigo_postal,
      cfdi: c.uso_cfdi,
      activo: c.activo,
      fecha_registro: c.fecha_registro,
      fecha_modificacion: c.fecha_modificacion
    }));
    
    return res.json(
      createPaginatedResponse(
        items, 
        page, 
        limit,
        totalItems
      )
    );
    
  } catch (error) {

    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
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
async function getCliente(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del cliente es requerido'
        )
      );
    }

    // Convertir ID a número
    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del cliente debe ser un número válido'
        )
      );
    }
    
    const result = await query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    const clienteDB = result.rows[0];
    
    // Mapear campos de BD a formato del frontend
    const cliente = {
      id: clienteDB.id,
      nombre: clienteDB.nombre_comercial || clienteDB.razon_social || '',
      telefono: clienteDB.telefono || '',
      segundoTelefono: clienteDB.segundo_telefono || '',
      email: clienteDB.email || '',
      direccionEntrega: clienteDB.direccion || '',
      razon: clienteDB.razon_social || '',
      rfc: clienteDB.rfc || '',
      regimen: clienteDB.regimen_fiscal || '',
      direccion: clienteDB.direccion || '',
      cp: clienteDB.direccion_codigo_postal || '',
      cfdi: clienteDB.uso_cfdi || '',
      activo: clienteDB.activo,
      fecha_registro: clienteDB.fecha_registro,
      fecha_modificacion: clienteDB.fecha_modificacion
    };
    
    res.json(createResponse(true, cliente, 'Cliente obtenido exitosamente'));
    
  } catch (error) {

    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
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
async function createCliente(req, res) {
  try {
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

    // Validaciones de formato (solo si se proporcionan)
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Formato de correo electrónico inválido'
          )
        );
      }
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

    // Validar RFC si se proporciona - Validación mejorada según reglas SAT
    if (rfc) {
      // RFC Persona Física: 4 letras + 6 dígitos (fecha) + 3 caracteres (homoclave)
      // RFC Persona Moral: 3 letras + 6 dígitos (fecha) + 3 caracteres (homoclave)
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(rfc.toUpperCase())) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Formato de RFC inválido. Debe ser: 3-4 letras + 6 dígitos + 3 caracteres (Ej: XAXX010101000)'
          )
        );
      }
      
      // Validación adicional de la fecha dentro del RFC
      const fechaParte = rfc.substring(rfc.length - 9, rfc.length - 3);
      const año = parseInt(fechaParte.substring(0, 2));
      const mes = parseInt(fechaParte.substring(2, 4));
      const dia = parseInt(fechaParte.substring(4, 6));
      
      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'La fecha dentro del RFC es inválida'
          )
        );
      }
    }
    
    // Validar Régimen Fiscal si se proporciona (debe ser código SAT de 3 dígitos)
    if (regimen) {
      const regimenRegex = /^[0-9]{3}$/;
      if (!regimenRegex.test(regimen)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Régimen fiscal inválido. Debe ser un código SAT de 3 dígitos (Ej: 601, 612)'
          )
        );
      }
    }
    
    // Validar Uso CFDI si se proporciona (verificar que exista en el catálogo)
    if (cfdi && cfdi.trim().length > 0) {
      const cfdiResult = await query(
        'SELECT codigo FROM usos_cfdi WHERE UPPER(codigo) = UPPER($1) AND activo = true',
        [cfdi.trim()]
      );
      
      if (cfdiResult.rows.length === 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Uso CFDI inválido. El código proporcionado no existe en el catálogo SAT'
          )
        );
      }
    }
    
    // Validar Código Postal si se proporciona (5 dígitos)
    if (cp) {
      const cpRegex = /^[0-9]{5}$/;
      if (!cpRegex.test(cp)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Código postal inválido. Debe ser de 5 dígitos'
          )
        );
      }
    }
    
    // Verificar si el RFC ya existe (solo si se proporciona)
    if (rfc) {
      const rfcResult = await query(
        'SELECT id FROM clientes WHERE rfc = $1 AND activo = true',
        [rfc.toUpperCase()]
      );
      
      if (rfcResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este RFC'
          )
        );
      }
    }

    // Verificar si el email ya existe (solo si se proporciona)
    if (email && email.trim().length > 0) {
      const emailResult = await query(
        'SELECT id FROM clientes WHERE email = $1 AND activo = true',
        [email.toLowerCase()]
      );
      
      if (emailResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este correo electrónico'
          )
        );
      }
    }
    
    // Crear nuevo cliente con estructura simplificada de dirección
    const insertQuery = `
      INSERT INTO clientes (
        razon_social, nombre_comercial, email, telefono, segundo_telefono,
        rfc, regimen_fiscal, uso_cfdi,
        direccion, direccion_codigo_postal,
        activo, fecha_registro, fecha_modificacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      razon || nombre.trim(), // razon_social (usar nombre si no hay razón social)
      nombre.trim(), // nombre_comercial
      email && email.trim().length > 0 ? email.toLowerCase() : null,
      telefono || null,
      segundoTelefono && segundoTelefono.trim().length > 0 ? segundoTelefono : null, // segundo_telefono
      rfc && rfc.trim().length > 0 ? rfc.toUpperCase() : null,
      regimen && regimen.trim().length > 0 ? regimen : null, // regimen_fiscal (código SAT)
      cfdi && cfdi.trim().length > 0 ? cfdi.toUpperCase() : null, // uso_cfdi (código SAT)
      direccionEntrega || direccion || null, // direccion (priorizar direccionEntrega)
      cp && cp.trim().length > 0 ? cp : null // direccion_codigo_postal
    ];
    
    const result = await query(insertQuery, values);
    const clienteDB = result.rows[0];
    
    // Mapear campos de BD a formato del frontend para la respuesta
    const nuevoCliente = {
      id: clienteDB.id,
      nombre: clienteDB.nombre_comercial || clienteDB.razon_social,
      telefono: clienteDB.telefono,
      segundoTelefono: clienteDB.segundo_telefono,
      email: clienteDB.email,
      direccionEntrega: clienteDB.direccion,
      razon: clienteDB.razon_social,
      rfc: clienteDB.rfc,
      regimen: clienteDB.regimen_fiscal,
      direccion: clienteDB.direccion,
      cp: clienteDB.direccion_codigo_postal,
      cfdi: clienteDB.uso_cfdi,
      activo: clienteDB.activo,
      fecha_registro: clienteDB.fecha_registro,
      fecha_modificacion: clienteDB.fecha_modificacion
    };
    
    return res.status(201).json(
      createResponse(
        true,
        nuevoCliente,
        'Cliente creado exitosamente'
      )
    );
    
  } catch (error) {

    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
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
async function updateCliente(req, res) {
  try {
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

    // Convertir ID a número
    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del cliente debe ser un número válido'
        )
      );
    }
    
    // Buscar cliente existente
    const clienteResult = await query(
      'SELECT * FROM clientes WHERE id = $1',
      [clienteId]
    );
    
    if (clienteResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    const clienteExistente = clienteResult.rows[0];
    
    // Validaciones básicas
    if (updateData.nombre !== undefined && (!updateData.nombre || updateData.nombre.trim().length === 0)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'El nombre del cliente es requerido'
        )
      );
    }
    
    if (updateData.telefono !== undefined && (!updateData.telefono || updateData.telefono.trim().length === 0)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'El teléfono es requerido'
        )
      );
    }
    
    // Si se actualiza el RFC, verificar que no esté duplicado y validar formato
    if (updateData.rfc && updateData.rfc.trim().length > 0 && updateData.rfc.toUpperCase() !== clienteExistente.rfc) {
      // Validar formato de RFC según reglas SAT
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(updateData.rfc.toUpperCase())) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Formato de RFC inválido. Debe ser: 3-4 letras + 6 dígitos + 3 caracteres'
          )
        );
      }
      
      const rfcResult = await query(
        'SELECT id FROM clientes WHERE rfc = $1 AND activo = true AND id != $2',
        [updateData.rfc.toUpperCase(), clienteId]
      );
      
      if (rfcResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe otro cliente con este RFC'
          )
        );
      }
    }
    
    // Validar Régimen Fiscal si se proporciona
    if (updateData.regimen && updateData.regimen.trim().length > 0) {
      const regimenRegex = /^[0-9]{3}$/;
      if (!regimenRegex.test(updateData.regimen)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Régimen fiscal inválido. Debe ser código SAT de 3 dígitos'
          )
        );
      }
    }
    
    // Validar Uso CFDI si se proporciona (verificar que exista en el catálogo)
    if (updateData.cfdi && updateData.cfdi.trim().length > 0) {
      const cfdiResult = await query(
        'SELECT codigo FROM usos_cfdi WHERE UPPER(codigo) = UPPER($1) AND activo = true',
        [updateData.cfdi.trim()]
      );
      
      if (cfdiResult.rows.length === 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Uso CFDI inválido. El código proporcionado no existe en el catálogo SAT'
          )
        );
      }
    }
    
    // Preparar campos dinámicos para actualizar con nueva estructura
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (updateData.razon !== undefined) {
      camposActualizar.push(`razon_social = $${contador++}`);
      valores.push(updateData.razon && updateData.razon.trim().length > 0 ? updateData.razon.trim() : null);
    }
    if (updateData.nombre !== undefined) {
      camposActualizar.push(`nombre_comercial = $${contador++}`);
      valores.push(updateData.nombre && updateData.nombre.trim().length > 0 ? updateData.nombre.trim() : null);
    }
    if (updateData.email !== undefined) {
      camposActualizar.push(`email = $${contador++}`);
      valores.push(updateData.email && updateData.email.trim().length > 0 ? updateData.email.toLowerCase() : null);
    }
    if (updateData.telefono !== undefined) {
      camposActualizar.push(`telefono = $${contador++}`);
      valores.push(updateData.telefono && updateData.telefono.trim().length > 0 ? updateData.telefono : null);
    }
    if (updateData.segundoTelefono !== undefined) {
      camposActualizar.push(`segundo_telefono = $${contador++}`);
      valores.push(updateData.segundoTelefono && updateData.segundoTelefono.trim().length > 0 ? updateData.segundoTelefono : null);
    }
    if (updateData.rfc !== undefined) {
      camposActualizar.push(`rfc = $${contador++}`);
      valores.push(updateData.rfc && updateData.rfc.trim().length > 0 ? updateData.rfc.toUpperCase() : null);
    }
    if (updateData.regimen !== undefined) {
      camposActualizar.push(`regimen_fiscal = $${contador++}`);
      valores.push(updateData.regimen && updateData.regimen.trim().length > 0 ? updateData.regimen : null);
    }
    if (updateData.cfdi !== undefined) {
      camposActualizar.push(`uso_cfdi = $${contador++}`);
      valores.push(updateData.cfdi && updateData.cfdi.trim().length > 0 ? updateData.cfdi.toUpperCase() : null);
    }
    // Mapear direccionEntrega del frontend a direccion de la BD
    if (updateData.direccionEntrega !== undefined) {
      camposActualizar.push(`direccion = $${contador++}`);
      valores.push(updateData.direccionEntrega);
    }
    // Si viene direccion también, usarlo (para compatibilidad)
    else if (updateData.direccion !== undefined) {
      camposActualizar.push(`direccion = $${contador++}`);
      valores.push(updateData.direccion);
    }
    if (updateData.cp !== undefined) {
      camposActualizar.push(`direccion_codigo_postal = $${contador++}`);
      valores.push(updateData.cp);
    }
    if (updateData.activo !== undefined) {
      camposActualizar.push(`activo = $${contador++}`);
      valores.push(updateData.activo);
    }
    
    // Agregar fecha de modificación
    camposActualizar.push(`fecha_modificacion = NOW()`);
    
    // Agregar ID al final
    valores.push(clienteId);
    
    // Construir y ejecutar query
    const updateQuery = `
      UPDATE clientes 
      SET ${camposActualizar.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;
    
    const result = await query(updateQuery, valores);
    const clienteDB = result.rows[0];
    
    // Mapear campos de BD a formato del frontend para la respuesta
    const clienteActualizado = {
      id: clienteDB.id,
      nombre: clienteDB.nombre_comercial || clienteDB.razon_social,
      telefono: clienteDB.telefono,
      segundoTelefono: clienteDB.segundo_telefono,
      email: clienteDB.email,
      direccionEntrega: clienteDB.direccion,
      razon: clienteDB.razon_social,
      rfc: clienteDB.rfc,
      regimen: clienteDB.regimen_fiscal,
      direccion: clienteDB.direccion,
      cp: clienteDB.direccion_codigo_postal,
      cfdi: clienteDB.uso_cfdi,
      activo: clienteDB.activo,
      fecha_registro: clienteDB.fecha_registro,
      fecha_modificacion: clienteDB.fecha_modificacion
    };
    
    return res.json(
      createResponse(
        true,
        clienteActualizado,
        'Cliente actualizado exitosamente'
      )
    );
    
  } catch (error) {

    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
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
async function deleteCliente(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'ID del cliente es requerido'
        )
      );
    }

    // Convertir ID a número
    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'ID del cliente debe ser un número válido'
        )
      );
    }
    
    // Verificar si el cliente existe
    const clienteResult = await query(
      'SELECT id FROM clientes WHERE id = $1',
      [clienteId]
    );
    
    if (clienteResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Cliente no encontrado'
        )
      );
    }
    
    // Verificar si tiene dependencias (facturas, pedidos, etc.)
    // Aquí podrías agregar validaciones adicionales
    
    // Eliminar cliente completamente de la base de datos
    await query('DELETE FROM clientes WHERE id = $1', [clienteId]);
    
    return res.json(
      createResponse(
        true,
        { id: clienteId, eliminado: true },
        'Cliente eliminado exitosamente'
      )
    );
    
  } catch (error) {

    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.DATABASE_ERROR,
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
async function uploadExcelClientes(req, res) {
  try {
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

        // Validar formato de email solo si se proporciona
        const correo = fila.correo || fila.email;
        if (correo && correo.toString().trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(correo.toString().trim())) {
            resultados.errores.push(`Fila ${i + 2}: Formato de correo electrónico inválido`);
            continue;
          }
        }

        // Validar formato de teléfono
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
          const rfcResult = await query(
            'SELECT id FROM clientes WHERE rfc = $1 AND activo = true',
            [fila.rfc.toString().toUpperCase()]
          );
          
          if (rfcResult.rows.length > 0) {
            resultados.errores.push(`Fila ${i + 2}: RFC ${fila.rfc} ya existe`);
            continue;
          }
        }

        // Verificar email duplicado solo si se proporciona
        if (correo && correo.toString().trim().length > 0) {
          const emailResult = await query(
            'SELECT id FROM clientes WHERE email = $1 AND activo = true',
            [correo.toString().toLowerCase()]
          );
          
          if (emailResult.rows.length > 0) {
            resultados.errores.push(`Fila ${i + 2}: Email ${correo} ya existe`);
            continue;
          }
        }
        
        // Crear cliente con nueva estructura
        const insertQuery = `
          INSERT INTO clientes (
            razon_social, nombre_comercial, email, telefono, segundo_telefono,
            rfc, regimen_fiscal, uso_cfdi,
            direccion, direccion_codigo_postal,
            activo, fecha_registro, fecha_modificacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
          RETURNING *
        `;
        
        const values = [
          fila['razon social'] || fila.razon || fila.nombre.trim(), // razon_social
          fila.nombre.trim(), // nombre_comercial
          correo ? correo.toLowerCase() : null, // email
          fila.telefono || null, // telefono
          fila['segundo telefono'] || fila.segundoTelefono || fila.telefono2 || null, // segundo_telefono
          fila.rfc ? fila.rfc.toUpperCase() : null, // rfc
          fila['regimen fiscal'] || fila.regimen || null, // regimen_fiscal
          fila['uso cfdi'] || fila.cfdi || null, // uso_cfdi
          fila.direccion || fila['direccion de entrega'] || null, // direccion
          fila['codigo postal'] || fila.cp || null // direccion_codigo_postal
        ];
        
        const result = await query(insertQuery, values);
        const nuevoCliente = result.rows[0];
        
        resultados.creados.push(nuevoCliente);
        resultados.importados++;
        
      } catch (error) {
        resultados.errores.push(`Fila ${i + 2}: ${error.message}`);
      }
    }
    
    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);
    
    return res.json(
      createResponse(
        true,
        resultados,
        `Importación completada: ${resultados.importados} clientes importados`
      )
    );
    
  } catch (error) {

    
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.FILE_ERROR,
        'Error procesando archivo Excel'
      )
    );
  }
}

/**
 * Obtener catálogo de Usos CFDI desde la base de datos
 * Endpoint: GET /api/clientes/usos-cfdi
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con catálogo de usos CFDI
 */
async function getUsosCFDI(req, res) {
  try {
    // Consultar catálogo de usos CFDI desde la base de datos
    const result = await query(
      'SELECT codigo as clave, descripcion FROM usos_cfdi WHERE activo = true ORDER BY codigo',
      []
    );
    
    const usosCFDI = result.rows;

    res.json(
      createResponse(
        true,
        usosCFDI,
        'Catálogo de Usos CFDI obtenido exitosamente'
      )
    );

  } catch (error) {
    console.error('Error al obtener catálogo de Usos CFDI:', error);
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

        res.status(500).json(
          createErrorResponse(
            CODIGOS_ERROR.FILE_ERROR,
            'Error generando plantilla'
          )
        );
      }
    });

  } catch (error) {

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
