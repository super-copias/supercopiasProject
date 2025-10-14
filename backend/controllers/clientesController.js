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
        LOWER(nombre) LIKE $1 OR 
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
    
    const items = itemsResult.rows;
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    return res.json(
      createPaginatedResponse(
        items, 
        page, 
        totalPages, 
        totalItems, 
        'Clientes obtenidos exitosamente'
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
    
    const cliente = result.rows[0];
    
    res.json(createResponse(cliente, 'Cliente obtenido exitosamente'));
    
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

    // Verificar si el email ya existe
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
    
    // Crear nuevo cliente
    const insertQuery = `
      INSERT INTO clientes (
        nombre, telefono, segundo_telefono, email, direccion_entrega,
        razon, rfc, regimen, direccion, cp, cfdi, activo, fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `;
    
    const values = [
      nombre.trim(),
      telefono || null,
      segundoTelefono || null,
      email ? email.toLowerCase() : null,
      direccionEntrega || null,
      razon || null,
      rfc ? rfc.toUpperCase() : null,
      regimen || null,
      direccion || null,
      cp || null,
      cfdi || null,
      true
    ];
    
    const result = await query(insertQuery, values);
    const nuevoCliente = result.rows[0];
    
    return res.status(201).json(
      createResponse(
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
    
    // Si se actualiza el RFC, verificar que no esté duplicado
    if (updateData.rfc && updateData.rfc.toUpperCase() !== clienteExistente.rfc) {
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
    
    // Preparar campos dinámicos para actualizar
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (updateData.nombre !== undefined) {
      camposActualizar.push(`nombre = $${contador++}`);
      valores.push(updateData.nombre.trim());
    }
    if (updateData.telefono !== undefined) {
      camposActualizar.push(`telefono = $${contador++}`);
      valores.push(updateData.telefono);
    }
    if (updateData.segundoTelefono !== undefined) {
      camposActualizar.push(`segundo_telefono = $${contador++}`);
      valores.push(updateData.segundoTelefono);
    }
    if (updateData.email !== undefined) {
      camposActualizar.push(`email = $${contador++}`);
      valores.push(updateData.email.toLowerCase());
    }
    if (updateData.direccionEntrega !== undefined) {
      camposActualizar.push(`direccion_entrega = $${contador++}`);
      valores.push(updateData.direccionEntrega);
    }
    if (updateData.razon !== undefined) {
      camposActualizar.push(`razon = $${contador++}`);
      valores.push(updateData.razon);
    }
    if (updateData.rfc !== undefined) {
      camposActualizar.push(`rfc = $${contador++}`);
      valores.push(updateData.rfc ? updateData.rfc.toUpperCase() : null);
    }
    if (updateData.regimen !== undefined) {
      camposActualizar.push(`regimen = $${contador++}`);
      valores.push(updateData.regimen);
    }
    if (updateData.direccion !== undefined) {
      camposActualizar.push(`direccion = $${contador++}`);
      valores.push(updateData.direccion);
    }
    if (updateData.cp !== undefined) {
      camposActualizar.push(`cp = $${contador++}`);
      valores.push(updateData.cp);
    }
    if (updateData.cfdi !== undefined) {
      camposActualizar.push(`cfdi = $${contador++}`);
      valores.push(updateData.cfdi);
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
    const clienteActualizado = result.rows[0];
    
    return res.json(
      createResponse(
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
          const rfcResult = await query(
            'SELECT id FROM clientes WHERE rfc = $1 AND activo = true',
            [fila.rfc.toString().toUpperCase()]
          );
          
          if (rfcResult.rows.length > 0) {
            resultados.errores.push(`Fila ${i + 2}: RFC ${fila.rfc} ya existe`);
            continue;
          }
        }

        // Verificar email duplicado
        const emailResult = await query(
          'SELECT id FROM clientes WHERE email = $1 AND activo = true',
          [correo.toString().toLowerCase()]
        );
        
        if (emailResult.rows.length > 0) {
          resultados.errores.push(`Fila ${i + 2}: Email ${correo} ya existe`);
          continue;
        }
        
        // Crear cliente
        const insertQuery = `
          INSERT INTO clientes (
            nombre, telefono, segundo_telefono, email, direccion_entrega,
            razon, rfc, regimen, direccion, cp, cfdi, activo, fecha_registro
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          RETURNING *
        `;
        
        const values = [
          fila.nombre.trim(),
          fila.telefono || null,
          fila['segundo telefono'] || fila.segundoTelefono || null,
          correo ? correo.toLowerCase() : null,
          fila['direccion de entrega'] || fila.direccionEntrega || null,
          fila['razon social'] || fila.razon || null,
          fila.rfc ? fila.rfc.toUpperCase() : null,
          fila['regimen fiscal'] || fila.regimen || null,
          fila.direccion || null,
          fila['codigo postal'] || fila.cp || null,
          fila['uso cfdi'] || fila.cfdi || null,
          true
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
