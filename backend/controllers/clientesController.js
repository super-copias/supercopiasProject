/**
 * Controlador de Clientes - SuperCopias
 * Gestiona todas las operaciones CRUD para clientes con estándar API 
 */

const { query, queryAudit } = require('../config/database');
const XLSX = require('xlsx');
const fs = require('fs');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

/**
 * Función auxiliar para extraer solo el código de un valor que puede venir 
 * en formato "CODIGO - Descripción" o solo "CODIGO"
 * @param {string} value - Valor a procesar
 * @returns {string|null} - Solo el código o null si está vacío
 */
function extractCode(value) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return '';
  }
  // Si tiene el formato "CODIGO - Descripción", extraer solo el código
  const match = value.trim().match(/^([A-Z0-9]+)\s*-/);
  return match ? match[1] : value.trim();
}

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
      SELECT 
        c.*,
        rf.descripcion as regimen_fiscal_descripcion,
        uc.descripcion as uso_cfdi_descripcion
      FROM clientes c
      LEFT JOIN regimenes_fiscales rf ON c.regimen_fiscal = rf.codigo AND rf.activo = true
      LEFT JOIN usos_cfdi uc ON c.uso_cfdi = uc.codigo AND uc.activo = true
      WHERE c.activo = true
    `;
    let countQuery = 'SELECT COUNT(*) FROM clientes c WHERE c.activo = true';
    let queryParams = [];
    
    // Filtrar por búsqueda si se proporciona
    if (q) {
      const searchCondition = ` AND (
        LOWER(c.razon_social) LIKE $1 OR 
        LOWER(c.nombre_comercial) LIKE $1 OR
        LOWER(c.email) LIKE $1 OR 
        LOWER(c.telefono) LIKE $1 OR
        LOWER(c.rfc) LIKE $1
      )`;
      baseQuery += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${q}%`);
    }
    
    // Incluir inactivos si se solicita
    if (req.query.includeInactive) {
      baseQuery = baseQuery.replace('WHERE c.activo = true', 'WHERE 1=1');
      countQuery = countQuery.replace('WHERE c.activo = true', 'WHERE 1=1');
    }
    
    // Agregar ordenamiento y paginación
    baseQuery += ` ORDER BY c.fecha_registro DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
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
      nombreComercial: c.nombre_comercial,
      razonSocial: c.razon_social,
      rfc: c.rfc,
      regimenFiscal: c.regimen_fiscal && c.regimen_fiscal_descripcion 
        ? `${c.regimen_fiscal} - ${c.regimen_fiscal_descripcion}` 
        : c.regimen_fiscal || '',
      usoCfdi: c.uso_cfdi && c.uso_cfdi_descripcion 
        ? `${c.uso_cfdi} - ${c.uso_cfdi_descripcion}` 
        : c.uso_cfdi || '',
      telefono: c.telefono,
      segundoTelefono: c.segundo_telefono,
      email: c.email,
      segundoEmail: c.segundo_email,
      direccionEntrega: c.direccion_entrega,
      direccionFacturacion: c.direccion_facturacion,
      direccionCodigoPostal: c.direccion_codigo_postal,
      activo: c.activo,
      fechaRegistro: c.fecha_registro,
      fechaModificacion: c.fecha_modificacion
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
    
    const result = await query(`
      SELECT 
        c.*,
        rf.descripcion as regimen_fiscal_descripcion,
        uc.descripcion as uso_cfdi_descripcion
      FROM clientes c
      LEFT JOIN regimenes_fiscales rf ON c.regimen_fiscal = rf.codigo AND rf.activo = true
      LEFT JOIN usos_cfdi uc ON c.uso_cfdi = uc.codigo AND uc.activo = true
      WHERE c.id = $1
    `, [clienteId]);
    
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
      nombreComercial: clienteDB.nombre_comercial || '',
      razonSocial: clienteDB.razon_social || '',
      rfc: clienteDB.rfc || '',
      regimenFiscal: clienteDB.regimen_fiscal && clienteDB.regimen_fiscal_descripcion 
        ? `${clienteDB.regimen_fiscal} - ${clienteDB.regimen_fiscal_descripcion}` 
        : clienteDB.regimen_fiscal || '',
      usoCfdi: clienteDB.uso_cfdi && clienteDB.uso_cfdi_descripcion 
        ? `${clienteDB.uso_cfdi} - ${clienteDB.uso_cfdi_descripcion}` 
        : clienteDB.uso_cfdi || '',
      telefono: clienteDB.telefono || '',
      segundoTelefono: clienteDB.segundo_telefono || '',
      email: clienteDB.email || '',
      segundoEmail: clienteDB.segundo_email || '',
      direccionEntrega: clienteDB.direccion_entrega || '',
      direccionFacturacion: clienteDB.direccion_facturacion || '',
      direccionCodigoPostal: clienteDB.direccion_codigo_postal || '',
      activo: clienteDB.activo,
      fechaRegistro: clienteDB.fecha_registro,
      fechaModificacion: clienteDB.fecha_modificacion
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
      nombreComercial,
      telefono,
      segundoTelefono,
      email,
      segundoEmail,
      direccionEntrega,
      razonSocial,
      rfc,
      regimenFiscal: regimenFiscalRaw,
      direccionFacturacion,
      direccionCodigoPostal,
      usoCfdi: usoCfdiRaw
    } = req.body;
    
    // Extraer solo los códigos en caso de que vengan con formato "CODIGO - Descripción"
    const regimenFiscal = extractCode(regimenFiscalRaw);
    const usoCfdi = extractCode(usoCfdiRaw);
    
    // Validaciones requeridas
    if (!nombreComercial || nombreComercial.trim().length === 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'Nombre comercial es requerido'
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

    if (segundoEmail && segundoEmail.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(segundoEmail)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Formato de segundo correo electrónico inválido'
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
    if (regimenFiscal) {
      const regimenRegex = /^[0-9]{3}$/;
      if (!regimenRegex.test(regimenFiscal)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Régimen fiscal inválido. Debe ser un código SAT de 3 dígitos (Ej: 601, 612)'
          )
        );
      }
    }
    
    // Validar Uso CFDI si se proporciona (verificar que exista en el catálogo)
    if (usoCfdi && usoCfdi.trim().length > 0) {
      const cfdiResult = await query(
        'SELECT codigo FROM usos_cfdi WHERE UPPER(codigo) = UPPER($1) AND activo = true',
        [usoCfdi.trim()]
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
    if (direccionCodigoPostal) {
      const cpRegex = /^[0-9]{5}$/;
      if (!cpRegex.test(direccionCodigoPostal)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Código postal inválido. Debe ser de 5 dígitos'
          )
        );
      }
    }

    // Verificar si el nombre comercial ya existe
    const nombreResult = await query(
      'SELECT id FROM clientes WHERE LOWER(nombre_comercial) = LOWER($1) AND activo = true',
      [nombreComercial.trim()]
    );
    if (nombreResult.rows.length > 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.ALREADY_EXISTS,
          'Ya existe un cliente con este nombre comercial'
        )
      );
    }

    // Verificar si el teléfono ya existe
    const telefonoResult = await query(
      'SELECT id FROM clientes WHERE telefono = $1 AND activo = true',
      [telefono.trim()]
    );
    if (telefonoResult.rows.length > 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.ALREADY_EXISTS,
          'Ya existe un cliente con este teléfono'
        )
      );
    }

    // Verificar si el segundo teléfono ya existe (solo si se proporciona)
    if (segundoTelefono && segundoTelefono.trim().length > 0) {
      const segundoTelResult = await query(
        'SELECT id FROM clientes WHERE telefono = $1 OR segundo_telefono = $1 AND activo = true',
        [segundoTelefono.trim()]
      );
      if (segundoTelResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este segundo teléfono'
          )
        );
      }
    }

    // Crear nuevo cliente con estructura simplificada de dirección
    const insertQuery = `
      INSERT INTO clientes (
        razon_social, nombre_comercial, email, segundo_email, telefono, segundo_telefono,
        rfc, regimen_fiscal, uso_cfdi,
        direccion_entrega, direccion_facturacion, direccion_codigo_postal,
        activo, fecha_registro, fecha_modificacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      razonSocial || nombreComercial.trim(), // razon_social (usar nombre comercial si no hay razón social)
      nombreComercial.trim(), // nombre_comercial
      email && email.trim().length > 0 ? email.toLowerCase() : null,
      segundoEmail && segundoEmail.trim().length > 0 ? segundoEmail.toLowerCase() : null, // segundo_email
      telefono || null,
      segundoTelefono && segundoTelefono.trim().length > 0 ? segundoTelefono : null, // segundo_telefono
      rfc && rfc.trim().length > 0 ? rfc.toUpperCase() : null,
      regimenFiscal && regimenFiscal.trim().length > 0 ? regimenFiscal : null, // regimen_fiscal (código SAT)
      usoCfdi && usoCfdi.trim().length > 0 ? usoCfdi.toUpperCase() : null, // uso_cfdi (código SAT)
      direccionEntrega && direccionEntrega.trim().length > 0 ? direccionEntrega : null, // direccion_entrega
      direccionFacturacion && direccionFacturacion.trim().length > 0 ? direccionFacturacion : null, // direccion_facturacion
      direccionCodigoPostal && direccionCodigoPostal.trim().length > 0 ? direccionCodigoPostal : null // direccion_codigo_postal
    ];
    
    const result = await queryAudit(insertQuery, values, req.user?.id, req.user?.nombre || req.user?.username);
    const clienteId = result.rows[0].id;
    const clienteCompleto = await query(`
      SELECT 
        c.*,
        rf.descripcion as regimen_fiscal_descripcion,
        uc.descripcion as uso_cfdi_descripcion
      FROM clientes c
      LEFT JOIN regimenes_fiscales rf ON c.regimen_fiscal = rf.codigo AND rf.activo = true
      LEFT JOIN usos_cfdi uc ON c.uso_cfdi = uc.codigo AND uc.activo = true
      WHERE c.id = $1
    `, [clienteId]);
    
    const clienteDB = clienteCompleto.rows[0];
    
    // Mapear campos de BD a formato del frontend para la respuesta
    const nuevoCliente = {
      id: clienteDB.id,
      nombreComercial: clienteDB.nombre_comercial,
      razonSocial: clienteDB.razon_social,
      telefono: clienteDB.telefono,
      segundoTelefono: clienteDB.segundo_telefono,
      email: clienteDB.email,
      segundoEmail: clienteDB.segundo_email,
      direccionEntrega: clienteDB.direccion_entrega,
      rfc: clienteDB.rfc,
      regimenFiscal: clienteDB.regimen_fiscal && clienteDB.regimen_fiscal_descripcion 
        ? `${clienteDB.regimen_fiscal} - ${clienteDB.regimen_fiscal_descripcion}` 
        : clienteDB.regimen_fiscal || '',
      direccionFacturacion: clienteDB.direccion_facturacion,
      direccionCodigoPostal: clienteDB.direccion_codigo_postal,
      usoCfdi: clienteDB.uso_cfdi && clienteDB.uso_cfdi_descripcion 
        ? `${clienteDB.uso_cfdi} - ${clienteDB.uso_cfdi_descripcion}` 
        : clienteDB.uso_cfdi || '',
      activo: clienteDB.activo,
      fechaRegistro: clienteDB.fecha_registro,
      fechaModificacion: clienteDB.fecha_modificacion
    };
    
    registrarBitacora({
      modulo: 'clientes', accion: 'CLIENTE_CREADO',
      entidad: 'clientes', entidadId: clienteId,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { nombreComercial }
    });
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
    const updateData = { ...req.body };
    
    // Extraer solo los códigos en caso de que vengan con formato "CODIGO - Descripción"
    if (updateData.regimenFiscal) {
      updateData.regimenFiscal = extractCode(updateData.regimenFiscal);
    }
    if (updateData.usoCfdi) {
      updateData.usoCfdi = extractCode(updateData.usoCfdi);
    }
    
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
    if (updateData.nombreComercial !== undefined && (!updateData.nombreComercial || updateData.nombreComercial.trim().length === 0)) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'El nombre comercial del cliente es requerido'
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
    
    // Si se actualiza el RFC, validar formato
    if (updateData.rfc && updateData.rfc.trim().length > 0) {
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
    }
    
    // Validar Régimen Fiscal si se proporciona
    if (updateData.regimenFiscal && updateData.regimenFiscal.trim().length > 0) {
      const regimenRegex = /^[0-9]{3}$/;
      if (!regimenRegex.test(updateData.regimenFiscal)) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.INVALID_FORMAT,
            'Régimen fiscal inválido. Debe ser código SAT de 3 dígitos'
          )
        );
      }
    }
    
    // Validar Uso CFDI si se proporciona (verificar que exista en el catálogo)
    if (updateData.usoCfdi && updateData.usoCfdi.trim().length > 0) {
      const cfdiResult = await query(
        'SELECT codigo FROM usos_cfdi WHERE UPPER(codigo) = UPPER($1) AND activo = true',
        [updateData.usoCfdi.trim()]
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
    
    // Verificar duplicados para los campos únicos (excluyendo el cliente actual)
    if (updateData.nombreComercial && updateData.nombreComercial.trim().length > 0) {
      const nombreDupResult = await query(
        'SELECT id FROM clientes WHERE LOWER(nombre_comercial) = LOWER($1) AND activo = true AND id <> $2',
        [updateData.nombreComercial.trim(), clienteId]
      );
      if (nombreDupResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este nombre comercial'
          )
        );
      }
    }

    if (updateData.telefono && updateData.telefono.trim().length > 0) {
      const telefonoDupResult = await query(
        'SELECT id FROM clientes WHERE telefono = $1 AND activo = true AND id <> $2',
        [updateData.telefono.trim(), clienteId]
      );
      if (telefonoDupResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este teléfono'
          )
        );
      }
    }

    if (updateData.segundoTelefono && updateData.segundoTelefono.trim().length > 0) {
      const segundoTelDupResult = await query(
        'SELECT id FROM clientes WHERE (telefono = $1 OR segundo_telefono = $1) AND activo = true AND id <> $2',
        [updateData.segundoTelefono.trim(), clienteId]
      );
      if (segundoTelDupResult.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.ALREADY_EXISTS,
            'Ya existe un cliente con este segundo teléfono'
          )
        );
      }
    }

    // Preparar campos dinámicos para actualizar con nueva estructura
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (updateData.razonSocial !== undefined) {
      camposActualizar.push(`razon_social = $${contador++}`);
      valores.push(updateData.razonSocial && updateData.razonSocial.trim().length > 0 ? updateData.razonSocial.trim() : null);
    }
    if (updateData.nombreComercial !== undefined) {
      camposActualizar.push(`nombre_comercial = $${contador++}`);
      valores.push(updateData.nombreComercial && updateData.nombreComercial.trim().length > 0 ? updateData.nombreComercial.trim() : null);
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
    if (updateData.segundoEmail !== undefined) {
      camposActualizar.push(`segundo_email = $${contador++}`);
      valores.push(updateData.segundoEmail && updateData.segundoEmail.trim().length > 0 ? updateData.segundoEmail.toLowerCase() : null);
    }
    if (updateData.rfc !== undefined) {
      camposActualizar.push(`rfc = $${contador++}`);
      valores.push(updateData.rfc && updateData.rfc.trim().length > 0 ? updateData.rfc.toUpperCase() : null);
    }
    if (updateData.regimenFiscal !== undefined) {
      camposActualizar.push(`regimen_fiscal = $${contador++}`);
      valores.push(updateData.regimenFiscal && updateData.regimenFiscal.trim().length > 0 ? updateData.regimenFiscal : null);
    }
    if (updateData.usoCfdi !== undefined) {
      camposActualizar.push(`uso_cfdi = $${contador++}`);
      valores.push(updateData.usoCfdi && updateData.usoCfdi.trim().length > 0 ? updateData.usoCfdi.toUpperCase() : null);
    }
    // Dirección de entrega
    if (updateData.direccionEntrega !== undefined) {
      camposActualizar.push(`direccion_entrega = $${contador++}`);
      valores.push(updateData.direccionEntrega && updateData.direccionEntrega.trim().length > 0 ? updateData.direccionEntrega : null);
    }
    // Dirección de facturación
    if (updateData.direccionFacturacion !== undefined) {
      camposActualizar.push(`direccion_facturacion = $${contador++}`);
      valores.push(updateData.direccionFacturacion && updateData.direccionFacturacion.trim().length > 0 ? updateData.direccionFacturacion : null);
    }
    if (updateData.direccionCodigoPostal !== undefined) {
      camposActualizar.push(`direccion_codigo_postal = $${contador++}`);
      valores.push(updateData.direccionCodigoPostal);
    }
    if (updateData.activo !== undefined) {
      camposActualizar.push(`activo = $${contador++}`);
      valores.push(updateData.activo);
    }
    
    // Agregar fecha de modificación
    camposActualizar.push(`fecha_modificacion = NOW()`);
    
    // Verificar que haya campos para actualizar
    if (camposActualizar.length === 1) {
      // Solo hay fecha_modificacion, no hay cambios reales
      return res.json(
        createResponse(
          true,
          { message: 'No hay cambios para actualizar' },
          'No se realizaron cambios'
        )
      );
    }
    
    // Agregar ID al final
    valores.push(clienteId);
    
    // Construir y ejecutar query
    const updateQuery = `
      UPDATE clientes 
      SET ${camposActualizar.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;
    
    const result = await queryAudit(updateQuery, valores, req.user?.id, req.user?.nombre || req.user?.username);
    
    // Consultar el cliente actualizado con las descripciones de los catálogos
    const clienteCompleto = await query(`
      SELECT 
        c.*,
        rf.descripcion as regimen_fiscal_descripcion,
        uc.descripcion as uso_cfdi_descripcion
      FROM clientes c
      LEFT JOIN regimenes_fiscales rf ON c.regimen_fiscal = rf.codigo AND rf.activo = true
      LEFT JOIN usos_cfdi uc ON c.uso_cfdi = uc.codigo AND uc.activo = true
      WHERE c.id = $1
    `, [clienteId]);
    
    const clienteDB = clienteCompleto.rows[0];
    
    // Mapear campos de BD a formato del frontend para la respuesta
    const clienteActualizado = {
      id: clienteDB.id,
      nombreComercial: clienteDB.nombre_comercial,
      razonSocial: clienteDB.razon_social,
      telefono: clienteDB.telefono,
      segundoTelefono: clienteDB.segundo_telefono,
      email: clienteDB.email,
      segundoEmail: clienteDB.segundo_email,
      direccionEntrega: clienteDB.direccion_entrega,
      rfc: clienteDB.rfc,
      regimenFiscal: clienteDB.regimen_fiscal && clienteDB.regimen_fiscal_descripcion 
        ? `${clienteDB.regimen_fiscal} - ${clienteDB.regimen_fiscal_descripcion}` 
        : clienteDB.regimen_fiscal || '',
      direccionFacturacion: clienteDB.direccion_facturacion,
      direccionCodigoPostal: clienteDB.direccion_codigo_postal,
      usoCfdi: clienteDB.uso_cfdi && clienteDB.uso_cfdi_descripcion 
        ? `${clienteDB.uso_cfdi} - ${clienteDB.uso_cfdi_descripcion}` 
        : clienteDB.uso_cfdi || '',
      activo: clienteDB.activo,
      fechaRegistro: clienteDB.fecha_registro,
      fechaModificacion: clienteDB.fecha_modificacion
    };
    
    registrarBitacora({
      modulo: 'clientes', accion: 'CLIENTE_ACTUALIZADO',
      entidad: 'clientes', entidadId: clienteId,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req), detalle: { nombreComercial: clienteActualizado.nombreComercial }
    });
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
 * Eliminar un cliente (soft delete - desactivar)
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
    
    // Verificar si el cliente existe y está activo
    const clienteResult = await query(
      'SELECT id, activo FROM clientes WHERE id = $1',
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

    if (clienteResult.rows[0].activo === false) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.INVALID_DATA,
          'El cliente ya está inactivo'
        )
      );
    }
    
    // Soft delete: marcar como inactivo en lugar de eliminar
    await queryAudit(
      'UPDATE clientes SET activo = false, fecha_modificacion = NOW() WHERE id = $1',
      [clienteId],
      req.user?.id, req.user?.nombre || req.user?.username
    );
    
    registrarBitacora({
      modulo: 'clientes', accion: 'CLIENTE_ELIMINADO',
      entidad: 'clientes', entidadId: clienteId,
      usuarioId: req.user?.id, usuarioNombre: req.user?.nombre || req.user?.username,
      ip: getIp(req)
    });
    return res.json(
      createResponse(
        true,
        { id: clienteId, activo: false },
        'Cliente desactivado exitosamente'
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
    // Buscar hoja "Clientes" específicamente; si no existe, usar la primera
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames.includes('Clientes')
      ? 'Clientes'
      : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const resultados = {
      importados: 0,
      errores: [],
      creados: []
    };
    
    // Procesar cada fila
    for (let i = 0; i < jsonData.length; i++) {
      const fila = jsonData[i];
      let correo = null; // Declarar fuera del try para que sea accesible en catch
      let telefonoLimpio = null;
      let segundoTelefonoLimpio = null;
      let cfdiLimpio = null;
      let regimenLimpio = null;
      
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
        correo = fila.correo || fila.email;
        if (correo && correo.toString().trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(correo.toString().trim())) {
            resultados.errores.push(`Fila ${i + 2}: Formato de correo electrónico inválido`);
            continue;
          }
        }

        // Validar formato de segundo correo si se proporciona
        const segundoCorreoRaw = fila['segundo correo'] || fila.segundo_correo || fila.segundoCorreo || null;
        if (segundoCorreoRaw && segundoCorreoRaw.toString().trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(segundoCorreoRaw.toString().trim())) {
            resultados.errores.push(`Fila ${i + 2}: Formato de segundo correo electrónico inválido`);
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

        // Verificar nombre comercial duplicado
        const nombreDupResult = await query(
          'SELECT id FROM clientes WHERE LOWER(nombre_comercial) = LOWER($1) AND activo = true',
          [fila.nombre.toString().trim()]
        );
        if (nombreDupResult.rows.length > 0) {
          resultados.errores.push(`Fila ${i + 2}: Ya existe un cliente con el nombre "${fila.nombre}"`);
          continue;
        }

        // Verificar teléfono duplicado
        const telefonoParaVerificar = fila.telefono.toString().trim();
        const telefonoDupResult = await query(
          'SELECT id FROM clientes WHERE telefono = $1 AND activo = true',
          [telefonoParaVerificar]
        );
        if (telefonoDupResult.rows.length > 0) {
          resultados.errores.push(`Fila ${i + 2}: Ya existe un cliente con el teléfono "${fila.telefono}"`);
          continue;
        }

        // Verificar segundo teléfono duplicado (solo si se proporciona)
        const segundoTelRaw = fila['segundo telefono'] || fila.segundoTelefono || fila.telefono2;
        if (segundoTelRaw && segundoTelRaw.toString().trim().length > 0) {
          const segundoTelParaVerificar = segundoTelRaw.toString().trim();
          const segundoTelDupResult = await query(
            'SELECT id FROM clientes WHERE (telefono = $1 OR segundo_telefono = $1) AND activo = true',
            [segundoTelParaVerificar]
          );
          if (segundoTelDupResult.rows.length > 0) {
            resultados.errores.push(`Fila ${i + 2}: Ya existe un cliente con el segundo teléfono "${segundoTelRaw}"`);
            continue;
          }
        }

        // Crear cliente con nueva estructura
        const insertQuery = `
          INSERT INTO clientes (
            razon_social, nombre_comercial, email, segundo_email, telefono, segundo_telefono,
            rfc, regimen_fiscal, uso_cfdi,
            direccion_entrega, direccion_facturacion, direccion_codigo_postal,
            activo, fecha_registro, fecha_modificacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
          RETURNING *
        `;
        
        // Función auxiliar para limpiar números de teléfono (solo dígitos)
        const limpiarTelefono = (tel) => {
          if (!tel) return null;
          return tel.toString().replace(/\D/g, ''); // Remover todo excepto dígitos
        };
        
        // Función auxiliar para extraer solo el código de uso_cfdi (ej: "G03 - Gastos en general" -> "G03")
        const extraerCodigoCFDI = (cfdi) => {
          if (!cfdi) return null;
          const cfdiStr = cfdi.toString().trim();
          // Si tiene el formato "G03 - Descripción", extraer solo "G03"
          const match = cfdiStr.match(/^([A-Z]\d{2})/);
          return match ? match[1] : cfdiStr.substring(0, 3); // Tomar los primeros 3 caracteres
        };
        
        // Función auxiliar para extraer código de régimen fiscal (ej: "612 - Descripción" -> "612")
        const extraerCodigoRegimen = (regimen) => {
          if (!regimen) return null;
          const regimenStr = regimen.toString().trim();
          // Si tiene el formato "612 - Descripción", extraer solo "612"
          const match = regimenStr.match(/^(\d{3})/);
          return match ? match[1] : regimenStr;
        };
        
        // Preparar valores limpios
        telefonoLimpio = limpiarTelefono(fila.telefono);
        segundoTelefonoLimpio = limpiarTelefono(fila['segundo telefono'] || fila.segundoTelefono || fila.telefono2);
        cfdiLimpio = extraerCodigoCFDI(fila['uso cfdi'] || fila.cfdi);
        regimenLimpio = extraerCodigoRegimen(fila['regimen fiscal'] || fila.regimen);
        
        const segundoCorreoLimpio = segundoCorreoRaw ? segundoCorreoRaw.toString().trim().toLowerCase() : null;

        const values = [
          fila['razon social'] || fila.razon || fila.nombre.trim(), // razon_social
          fila.nombre.trim(), // nombre_comercial
          correo ? correo.toLowerCase() : null, // email
          segundoCorreoLimpio, // segundo_email
          telefonoLimpio, // telefono (solo dígitos)
          segundoTelefonoLimpio, // segundo_telefono
          fila.rfc ? fila.rfc.toUpperCase() : null, // rfc
          regimenLimpio, // regimen_fiscal (solo código)
          cfdiLimpio, // uso_cfdi (solo código)
          fila['direccion de entrega'] || fila.direccion_entrega || null, // direccion_entrega
          fila['direccion de facturacion'] || fila.direccion || fila['direccion facturacion'] || null, // direccion_facturacion
          fila['codigo postal'] || fila.cp || null // direccion_codigo_postal
        ];
        
        const result = await queryAudit(insertQuery, values, req.user?.id, req.user?.nombre || req.user?.username);
        const nuevoCliente = result.rows[0];
        
        resultados.creados.push(nuevoCliente);
        resultados.importados++;
        
      } catch (error) {
        // Mapear errores de base de datos a columnas específicas del Excel
        let mensajeError = error.message;
        let columnaIdentificada = false;
        
        // Detectar errores de longitud de campo
        if (mensajeError.includes('value too long for type character varying')) {
          // Extraer el límite de caracteres
          const match = mensajeError.match(/character varying\((\d+)\)/);
          const limite = match ? parseInt(match[1]) : 0;
          
          // Analizar los valores LIMPIOS que se intentaron insertar
          // Verificar en el mismo orden que el array values
          
          const razonSocial = fila['razon social'] || fila.razon || fila.nombre.trim();
          const nombreComercial = fila.nombre.trim();
          const emailLimpio = correo ? correo.toLowerCase() : null;
          const rfcLimpio = fila.rfc ? fila.rfc.toUpperCase() : null;
          const direccionLimpia = fila.direccion || fila['direccion de entrega'] || null;
          const cpLimpio = fila['codigo postal'] || fila.cp || null;
          
          // Verificar cada campo limpio contra el límite
          if (telefonoLimpio && telefonoLimpio.length > limite) {
            mensajeError = `Columna "telefono" - El valor "${fila.telefono}" genera "${telefonoLimpio}" que es demasiado largo (máximo ${limite} caracteres, actual: ${telefonoLimpio.length})`;
            columnaIdentificada = true;
          } 
          else if (segundoTelefonoLimpio && segundoTelefonoLimpio.length > limite) {
            mensajeError = `Columna "segundo telefono" - El valor "${fila['segundo telefono']}" genera "${segundoTelefonoLimpio}" que es demasiado largo (máximo ${limite} caracteres, actual: ${segundoTelefonoLimpio.length})`;
            columnaIdentificada = true;
          }
          else if (emailLimpio && emailLimpio.length > limite) {
            mensajeError = `Columna "correo" - El valor "${emailLimpio}" es demasiado largo (máximo ${limite} caracteres, actual: ${emailLimpio.length})`;
            columnaIdentificada = true;
          }
          else if (rfcLimpio && rfcLimpio.length > limite) {
            mensajeError = `Columna "rfc" - El valor "${rfcLimpio}" es demasiado largo (máximo ${limite} caracteres, actual: ${rfcLimpio.length})`;
            columnaIdentificada = true;
          }
          else if (regimenLimpio && regimenLimpio.length > limite) {
            mensajeError = `Columna "regimen fiscal" - El valor "${fila['regimen fiscal']}" genera código "${regimenLimpio}" que es demasiado largo (máximo ${limite} caracteres, actual: ${regimenLimpio.length})`;
            columnaIdentificada = true;
          }
          else if (cfdiLimpio && cfdiLimpio.length > limite) {
            mensajeError = `Columna "uso cfdi" - El valor "${fila['uso cfdi']}" genera código "${cfdiLimpio}" que es demasiado largo (máximo ${limite} caracteres, actual: ${cfdiLimpio.length})`;
            columnaIdentificada = true;
          }
          else if (cpLimpio && cpLimpio.toString().length > limite) {
            mensajeError = `Columna "codigo postal" - El valor "${cpLimpio}" es demasiado largo (máximo ${limite} caracteres, actual: ${cpLimpio.toString().length})`;
            columnaIdentificada = true;
          }
          else if (razonSocial && razonSocial.length > limite) {
            mensajeError = `Columna "razon social" - El valor es demasiado largo (máximo ${limite} caracteres, actual: ${razonSocial.length}). Valor: "${razonSocial.substring(0, 50)}..."`;
            columnaIdentificada = true;
          }
          else if (nombreComercial && nombreComercial.length > limite) {
            mensajeError = `Columna "nombre" - El valor es demasiado largo (máximo ${limite} caracteres, actual: ${nombreComercial.length}). Valor: "${nombreComercial.substring(0, 50)}..."`;
            columnaIdentificada = true;
          }
          else if (direccionLimpia && direccionLimpia.length > limite) {
            mensajeError = `Columna "direccion" - El valor es demasiado largo (máximo ${limite} caracteres, actual: ${direccionLimpia.length}). Valor: "${direccionLimpia.substring(0, 50)}..."`;
            columnaIdentificada = true;
          }
          
          if (!columnaIdentificada) {
            // Mostrar todos los campos y sus longitudes para debug
            mensajeError = `Columna "desconocida" - Un campo excede ${limite} caracteres. Longitudes: telefono=${telefonoLimpio?.length || 0}, segundo_tel=${segundoTelefonoLimpio?.length || 0}, email=${emailLimpio?.length || 0}, rfc=${rfcLimpio?.length || 0}, regimen=${regimenLimpio?.length || 0}, cfdi=${cfdiLimpio?.length || 0}, cp=${cpLimpio?.toString().length || 0}, razon=${razonSocial?.length || 0}, nombre=${nombreComercial?.length || 0}, dir=${direccionLimpia?.length || 0}`;
          }
        }
        // Detectar errores de constraint check
        else if (mensajeError.includes('check constraint') || mensajeError.includes('chk_')) {
          if (mensajeError.includes('uso_cfdi') || mensajeError.includes('cfdi')) {
            mensajeError = `Columna "uso cfdi" - El valor "${fila['uso cfdi'] || fila.cfdi}" no es válido. Debe ser un código CFDI válido (ej: G01, G03, D01, etc.)`;
            columnaIdentificada = true;
          } else if (mensajeError.includes('regimen_fiscal')) {
            mensajeError = `Columna "regimen fiscal" - El valor "${fila['regimen fiscal'] || fila.regimen}" no es válido`;
            columnaIdentificada = true;
          } else {
            mensajeError = `Valor no cumple con las restricciones de validación`;
          }
        }
        // Detectar errores de tipo de dato
        else if (mensajeError.includes('invalid input syntax')) {
          if (mensajeError.includes('integer')) {
            mensajeError = `Un campo numérico tiene un valor no válido`;
          } else if (mensajeError.includes('date')) {
            mensajeError = `Un campo de fecha tiene un formato no válido`;
          }
        }
        // Detectar errores de clave única
        else if (mensajeError.includes('unique constraint') || mensajeError.includes('duplicate key')) {
          if (mensajeError.includes('email') || mensajeError.includes('correo')) {
            mensajeError = `Columna "correo" - El email "${correo}" ya existe en la base de datos`;
            columnaIdentificada = true;
          } else {
            mensajeError = `Ya existe un registro con estos datos`;
          }
        }
        
        resultados.errores.push(`Fila ${i + 2}: ${mensajeError}`);
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
async function descargarPlantillaExcel(req, res) {
  try {
    const { generarPlantillaClientes } = require('../utils/plantillaClientes');
    const path = require('path');
    
    // Generar plantilla (consulta catálogos en BD y crea el Excel)
    const filePath = await generarPlantillaClientes();
    
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
