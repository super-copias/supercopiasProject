/**
 * Controlador de Inventarios - SuperCopias
 * Gestiona todas las operaciones para el módulo de inventarios
 * Maneja productos para venta, insumos operativos e items genéricos
 */

const { query } = require('../config/database');
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Convierte campos numéricos de string a number
 */
function parseNumericFields(row) {
  // Campos que deben ser enteros (cantidades, conteos)
  const integerFields = [
    'existencia_actual', 'stock_minimo', 'stock_maximo',
    'total_articulos', 'total_venta', 'total_insumos', 'total_genericos',
    'alertas_criticas', 'alertas_bajas', 'faltante', 'cantidad'
  ];
  
  // Campos que deben ser decimales (precios, costos)
  const decimalFields = [
    'costo_compra', 'precio_venta', 'costo_promedio',
    'valor_total_inventario', 'costo_unitario', 'precio_unitario'
  ];
  
  const parsed = { ...row };
  
  integerFields.forEach(field => {
    if (parsed[field] !== null && parsed[field] !== undefined) {
      parsed[field] = parseInt(parsed[field], 10);
    }
  });
  
  decimalFields.forEach(field => {
    if (parsed[field] !== null && parsed[field] !== undefined) {
      parsed[field] = parseFloat(parsed[field]);
    }
  });
  
  // Parsear características JSON si existe
  if (parsed.caracteristicas && typeof parsed.caracteristicas === 'string') {
    try {
      parsed.caracteristicas = JSON.parse(parsed.caracteristicas);
    } catch (e) {
      console.error('Error parseando características:', e);
      parsed.caracteristicas = {};
    }
  }
  
  return parsed;
}

/**
 * Obtener lista de inventarios con búsqueda y paginación
 * GET /api/inventarios
 */
async function listInventarios(req, res) {
  try {
    const q = (req.query.q || '').toLowerCase();
    const tipo = req.query.tipo;
    const categoria = req.query.categoria;
    const estatus = req.query.estatus;
    const stockNivel = req.query.stockNivel; // critico, bajo, normal
    const incluirArchivados = req.query.incluirArchivados === 'true';
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      SELECT 
        i.*,
        ic.caracteristicas,
        CASE 
          WHEN r.id IS NOT NULL THEN
            -- Usar reglas personalizadas si existen
            CASE 
              WHEN r.usar_stock_maximo AND i.stock_maximo IS NOT NULL THEN
                -- Modo 1: Con stock_maximo
                CASE 
                  WHEN i.existencia_actual < i.stock_minimo THEN 'critico'
                  WHEN i.existencia_actual < (i.stock_minimo + ((i.stock_maximo - i.stock_minimo) * (r.nivel_bajo_porcentaje / 100))) THEN 'bajo'
                  WHEN i.existencia_actual <= i.stock_maximo THEN 'normal'
                  ELSE 'sobrestock'
                END
              ELSE
                -- Modo 2: Solo stock_minimo
                CASE 
                  WHEN i.existencia_actual < i.stock_minimo THEN 'critico'
                  WHEN i.existencia_actual < (i.stock_minimo * (1 + r.nivel_bajo_porcentaje / 100)) THEN 'bajo'
                  ELSE 'normal'
                END
            END
          ELSE
            -- Reglas por defecto del sistema
            CASE 
              WHEN i.existencia_actual < i.stock_minimo THEN 'critico'
              WHEN i.existencia_actual <= (i.stock_minimo * 1.1) THEN 'bajo'
              ELSE 'normal'
            END
        END AS nivel_stock,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS tiene_reglas_personalizadas
      FROM inventarios i
      LEFT JOIN inventarios_reglas_stock r ON r.inventario_id = i.id AND r.activo = true
      LEFT JOIN inventarios_caracteristicas ic ON ic.inventario_id = i.id
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) 
      FROM inventarios i 
      LEFT JOIN inventarios_reglas_stock r ON r.inventario_id = i.id AND r.activo = true
      LEFT JOIN inventarios_caracteristicas ic ON ic.inventario_id = i.id
      WHERE 1=1
    `;
    let queryParams = [];
    let paramCount = 1;
    
    // Filtro de archivados
    if (incluirArchivados) {
      // Mostrar SOLO archivados
      const archivoCondition = ' AND i.activo = false';
      baseQuery += archivoCondition;
      countQuery += archivoCondition;
    } else {
      // Mostrar SOLO activos (comportamiento por defecto)
      const activoCondition = ' AND i.activo = true';
      baseQuery += activoCondition;
      countQuery += activoCondition;
    }
    
    // Filtros
    if (q) {
      const searchCondition = ` AND (
        LOWER(i.nombre) LIKE $${paramCount} OR 
        LOWER(i.marca) LIKE $${paramCount} OR
        LOWER(i.modelo) LIKE $${paramCount} OR
        LOWER(i.codigo_sku) LIKE $${paramCount} OR
        LOWER(i.categoria) LIKE $${paramCount} OR
        LOWER(i.proveedor_nombre) LIKE $${paramCount}
      )`;
      baseQuery += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${q}%`);
      paramCount++;
    }
    
    if (tipo) {
      baseQuery += ` AND i.tipo = $${paramCount}`;
      countQuery += ` AND i.tipo = $${paramCount}`;
      queryParams.push(tipo);
      paramCount++;
    }
    
    if (categoria) {
      baseQuery += ` AND i.categoria = $${paramCount}`;
      countQuery += ` AND i.categoria = $${paramCount}`;
      queryParams.push(categoria);
      paramCount++;
    }
    
    if (estatus) {
      baseQuery += ` AND i.estatus = $${paramCount}`;
      countQuery += ` AND i.estatus = $${paramCount}`;
      queryParams.push(estatus);
      paramCount++;
    }
    
    // Filtro de nivel de stock
    if (stockNivel === 'critico') {
      baseQuery += ` AND i.existencia_actual < i.stock_minimo`;
      countQuery += ` AND i.existencia_actual < i.stock_minimo`;
    } else if (stockNivel === 'bajo') {
      baseQuery += ` AND i.existencia_actual >= i.stock_minimo AND i.existencia_actual <= (i.stock_minimo * 1.1)`;
      countQuery += ` AND i.existencia_actual >= i.stock_minimo AND i.existencia_actual <= (i.stock_minimo * 1.1)`;
    } else if (stockNivel === 'normal') {
      baseQuery += ` AND i.existencia_actual > (i.stock_minimo * 1.1)`;
      countQuery += ` AND i.existencia_actual > (i.stock_minimo * 1.1)`;
    }
    
    baseQuery += ` ORDER BY i.fecha_alta DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    const countParams = [...queryParams];
    queryParams.push(limit, offset);
    
    const [itemsResult, countResult] = await Promise.all([
      query(baseQuery, queryParams),
      query(countQuery, countParams)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Convertir campos numéricos
    const parsedItems = itemsResult.rows.map(parseNumericFields);
    
    return res.json(
      createPaginatedResponse(parsedItems, page, limit, totalItems)
    );
    
  } catch (error) {
    console.error('Error al obtener inventarios:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener inventarios', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener inventario por ID con detalles completos
 * GET /api/inventarios/:id
 */
async function getInventarioById(req, res) {
  try {
    const { id } = req.params;
    
    const inventarioQuery = `
      SELECT 
        i.*,
        CASE 
          WHEN i.existencia_actual < i.stock_minimo THEN 'critico'
          WHEN i.existencia_actual <= (i.stock_minimo * 1.1) THEN 'bajo'
          ELSE 'normal'
        END AS nivel_stock
      FROM inventarios i
      WHERE i.id = $1
    `;
    
    const caracteristicasQuery = `
      SELECT caracteristicas 
      FROM inventarios_caracteristicas 
      WHERE inventario_id = $1
    `;
    
    const [inventarioResult, caraResult] = await Promise.all([
      query(inventarioQuery, [id]),
      query(caracteristicasQuery, [id])
    ]);
    
    if (inventarioResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const inventario = parseNumericFields(inventarioResult.rows[0]);
    inventario.caracteristicas = caraResult.rows.length > 0 ? caraResult.rows[0].caracteristicas : {};
    
    return res.json(createResponse(true, inventario, 'Artículo obtenido correctamente'));
    
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener artículo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Crear nuevo artículo en inventario
 * POST /api/inventarios
 */
async function createInventario(req, res) {
  try {
    const {
      tipo,
      nombre,
      categoria,
      marca,
      modelo,
      codigo_sku,
      proveedor_id,
      proveedor_nombre,
      estatus,
      existencia_actual,
      unidad_medida,
      stock_minimo,
      stock_maximo,
      ubicacion_fisica,
      costo_compra,
      precio_venta,
      observaciones,
      foto_url,
      caracteristicas
    } = req.body;
    
    // Validaciones básicas
    if (!tipo || !nombre || !categoria || !unidad_medida) {
      return res.status(400).json(
        createErrorResponse('Campos obligatorios faltantes', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Calcular costo promedio inicial
    const costo_promedio = costo_compra || 0;
    
    // Insertar inventario
    const insertQuery = `
      INSERT INTO inventarios (
        tipo, nombre, categoria, marca, modelo, codigo_sku, proveedor_id, proveedor_nombre,
        estatus, existencia_actual, unidad_medida, stock_minimo, stock_maximo, ubicacion_fisica,
        costo_compra, precio_venta, costo_promedio, observaciones, foto_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      tipo,
      nombre,
      categoria,
      marca || null,
      modelo || null,
      codigo_sku || null,
      proveedor_id || null,
      proveedor_nombre || null,
      estatus || 'activo',
      existencia_actual || 0,
      unidad_medida,
      stock_minimo || 0,
      stock_maximo || null,
      ubicacion_fisica || null,
      costo_compra || null,
      precio_venta || null,
      costo_promedio,
      observaciones || null,
      foto_url || null
    ]);
    
    const inventario = result.rows[0];
    
    // Insertar características si se proporcionan
    if (caracteristicas && Object.keys(caracteristicas).length > 0) {
      await query(
        'INSERT INTO inventarios_caracteristicas (inventario_id, caracteristicas) VALUES ($1, $2)',
        [inventario.id, JSON.stringify(caracteristicas)]
      );
    }
    
    // Si hay existencia inicial, registrar movimiento de entrada
    if (existencia_actual && parseFloat(existencia_actual) > 0) {
      await query(
        `INSERT INTO inventarios_movimientos 
        (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo, usuario_nombre, notas) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          inventario.id,
          'entrada',
          'ajuste_entrada',
          existencia_actual,
          0,
          existencia_actual,
          req.user?.username || 'Sistema',
          'Existencia inicial al crear artículo'
        ]
      );
    }
    
    return res.status(201).json(createResponse(true, inventario, 'Artículo creado exitosamente'));
    
  } catch (error) {
    console.error('Error al crear inventario:', error);
    return res.status(500).json(
      createErrorResponse('Error al crear artículo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Actualizar inventario existente
 * PUT /api/inventarios/:id
 */
async function updateInventario(req, res) {
  try {
    const { id } = req.params;
    const {
      tipo,
      nombre,
      categoria,
      marca,
      modelo,
      codigo_sku,
      proveedor_id,
      proveedor_nombre,
      estatus,
      unidad_medida,
      stock_minimo,
      stock_maximo,
      ubicacion_fisica,
      costo_compra,
      precio_venta,
      observaciones,
      foto_url,
      caracteristicas
    } = req.body;
    
    // Verificar que existe
    const checkResult = await query('SELECT id FROM inventarios WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Actualizar inventario (sin modificar existencia_actual - eso se hace por movimientos)
    const updateQuery = `
      UPDATE inventarios SET
        tipo = COALESCE($1, tipo),
        nombre = COALESCE($2, nombre),
        categoria = COALESCE($3, categoria),
        marca = $4,
        modelo = $5,
        codigo_sku = $6,
        proveedor_id = $7,
        proveedor_nombre = $8,
        estatus = COALESCE($9, estatus),
        unidad_medida = COALESCE($10, unidad_medida),
        stock_minimo = COALESCE($11, stock_minimo),
        stock_maximo = $12,
        ubicacion_fisica = $13,
        costo_compra = $14,
        precio_venta = $15,
        observaciones = $16,
        foto_url = $17,
        fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      tipo,
      nombre,
      categoria,
      marca,
      modelo,
      codigo_sku,
      proveedor_id,
      proveedor_nombre,
      estatus,
      unidad_medida,
      stock_minimo,
      stock_maximo,
      ubicacion_fisica,
      costo_compra,
      precio_venta,
      observaciones,
      foto_url,
      id
    ]);
    
    // Actualizar características
    if (caracteristicas) {
      const caraCheck = await query(
        'SELECT id FROM inventarios_caracteristicas WHERE inventario_id = $1', 
        [id]
      );
      
      if (caraCheck.rows.length > 0) {
        await query(
          'UPDATE inventarios_caracteristicas SET caracteristicas = $1, fecha_modificacion = CURRENT_TIMESTAMP WHERE inventario_id = $2',
          [JSON.stringify(caracteristicas), id]
        );
      } else {
        await query(
          'INSERT INTO inventarios_caracteristicas (inventario_id, caracteristicas) VALUES ($1, $2)',
          [id, JSON.stringify(caracteristicas)]
        );
      }
    }
    
    return res.json(createResponse(true, result.rows[0], 'Artículo actualizado exitosamente'));
    
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    return res.status(500).json(
      createErrorResponse('Error al actualizar artículo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Eliminar inventario (soft delete)
 * DELETE /api/inventarios/:id
 */
async function deleteInventario(req, res) {
  try {
    const { id } = req.params;
    
    // Verificar que existe
    const checkQuery = 'SELECT nombre FROM inventarios WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Verificar si tiene movimientos asociados
    const movimientosQuery = 'SELECT COUNT(*) as total FROM inventarios_movimientos WHERE inventario_id = $1';
    const movimientosResult = await query(movimientosQuery, [id]);
    
    if (parseInt(movimientosResult.rows[0].total) > 0) {
      const mensajeError = `No se puede eliminar el artículo "${checkResult.rows[0].nombre}" porque tiene movimientos registrados. Total: ${movimientosResult.rows[0].total}`;
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.DEPENDENCY_ERROR, mensajeError)
      );
    }
    
    // Eliminar físicamente (CASCADE eliminará características y reglas automáticamente)
    const deleteQuery = 'DELETE FROM inventarios WHERE id = $1 RETURNING nombre';
    const result = await query(deleteQuery, [id]);
    
    return res.json(createResponse(true, result.rows[0], 'Artículo eliminado permanentemente de la base de datos'));
    
  } catch (error) {
    console.error('Error al eliminar inventario:', error);
    return res.status(500).json(
      createErrorResponse('Error al eliminar artículo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Registrar movimiento de inventario (entrada/salida/ajuste)
 * POST /api/inventarios/:id/movimientos
 */
async function addMovimiento(req, res) {
  try {
    const { id } = req.params;
    const {
      tipo_movimiento,
      concepto,
      cantidad,
      area_servicio,
      notas,
      evidencia_url
    } = req.body;
    
    console.log('=== REGISTRAR MOVIMIENTO ===');
    console.log('ID Inventario:', id);
    console.log('Body recibido:', req.body);
    console.log('Usuario:', req.user?.username);
    
    // Validaciones
    if (!tipo_movimiento || !concepto || !cantidad || cantidad <= 0) {
      return res.status(400).json(
        createErrorResponse('Datos de movimiento inválidos', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Obtener existencia actual
    const inventarioResult = await query(
      'SELECT existencia_actual, nombre FROM inventarios WHERE id = $1',
      [id]
    );
    
    console.log('Inventario encontrado:', inventarioResult.rows[0]);
    
    if (inventarioResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const saldo_anterior = parseFloat(inventarioResult.rows[0].existencia_actual);
    let saldo_nuevo = saldo_anterior;
    let cantidad_movimiento = parseFloat(cantidad);
    
    console.log('Saldo anterior:', saldo_anterior);
    console.log('Cantidad movimiento:', cantidad_movimiento);
    
    // Calcular nuevo saldo según tipo de movimiento
    if (tipo_movimiento === 'entrada') {
      saldo_nuevo = saldo_anterior + cantidad_movimiento;
    } else if (tipo_movimiento === 'salida') {
      saldo_nuevo = saldo_anterior - cantidad_movimiento;
      cantidad_movimiento = -cantidad_movimiento; // Negativo para salidas
      
      // Validar que no quede negativo
      if (saldo_nuevo < 0) {
        return res.status(400).json(
          createErrorResponse('Existencia insuficiente para realizar la salida', CODIGOS_ERROR.DATOS_INVALIDOS)
        );
      }
    } else if (tipo_movimiento === 'ajuste') {
      // En ajuste, la cantidad es el nuevo saldo
      saldo_nuevo = cantidad_movimiento;
      cantidad_movimiento = saldo_nuevo - saldo_anterior;
    }
    
    console.log('Saldo nuevo:', saldo_nuevo);
    console.log('Cantidad a registrar:', cantidad_movimiento);
    
    // Insertar movimiento
    const movimientoQuery = `
      INSERT INTO inventarios_movimientos (
        inventario_id, tipo_movimiento, concepto, cantidad,
        saldo_anterior, saldo_nuevo, usuario_nombre, area_servicio,
        notas, evidencia_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const movResult = await query(movimientoQuery, [
      id,
      tipo_movimiento,
      concepto,
      cantidad_movimiento,
      saldo_anterior,
      saldo_nuevo,
      req.user?.username || 'Sistema',
      area_servicio || null,
      notas || null,
      evidencia_url || null
    ]);
    
    console.log('Movimiento insertado:', movResult.rows[0]);
    
    // Actualizar existencia en inventarios
    await query(
      'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = $2',
      [saldo_nuevo, id]
    );
    
    console.log('Inventario actualizado correctamente');
    
    return res.status(201).json(
      createResponse(true, movResult.rows[0], 'Movimiento registrado exitosamente')
    );
    
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json(
      createErrorResponse('Error al registrar movimiento', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener historial de movimientos de un inventario
 * GET /api/inventarios/:id/movimientos
 */
async function getHistorialMovimientos(req, res) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;
    
    const movimientosQuery = `
      SELECT * FROM inventarios_movimientos
      WHERE inventario_id = $1
      ORDER BY fecha_movimiento DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM inventarios_movimientos
      WHERE inventario_id = $1
    `;
    
    const [movResult, countResult] = await Promise.all([
      query(movimientosQuery, [id, limit, offset]),
      query(countQuery, [id])
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    
    return res.json(
      createPaginatedResponse(movResult.rows, page, limit, totalItems)
    );
    
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener historial de movimientos', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener alertas de stock bajo
 * GET /api/inventarios/alertas
 */
async function getAlertas(req, res) {
  try {
    const alertasQuery = `
      SELECT 
        i.*,
        ic.caracteristicas,
        CASE 
          WHEN r.id IS NOT NULL THEN
            -- Usar reglas personalizadas si existen y la alerta está activa
            CASE 
              WHEN r.usar_stock_maximo AND i.stock_maximo IS NOT NULL THEN
                CASE 
                  WHEN i.existencia_actual < i.stock_minimo AND r.alerta_critico_activa THEN 'critico'
                  WHEN i.existencia_actual < (i.stock_minimo + ((i.stock_maximo - i.stock_minimo) * (r.nivel_bajo_porcentaje / 100))) AND r.alerta_bajo_activa THEN 'bajo'
                  WHEN i.existencia_actual > i.stock_maximo AND r.alerta_sobrestock_activa THEN 'sobrestock'
                  ELSE 'normal'
                END
              ELSE
                CASE 
                  WHEN i.existencia_actual < i.stock_minimo AND r.alerta_critico_activa THEN 'critico'
                  WHEN i.existencia_actual < (i.stock_minimo * (1 + r.nivel_bajo_porcentaje / 100)) AND r.alerta_bajo_activa THEN 'bajo'
                  ELSE 'normal'
                END
            END
          ELSE
            -- Reglas por defecto
            CASE 
              WHEN i.existencia_actual < i.stock_minimo THEN 'critico'
              WHEN i.existencia_actual <= (i.stock_minimo * 1.1) THEN 'bajo'
              ELSE 'normal'
            END
        END AS nivel_stock,
        i.stock_minimo - i.existencia_actual AS faltante,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS tiene_reglas_personalizadas
      FROM inventarios i
      LEFT JOIN inventarios_reglas_stock r ON r.inventario_id = i.id AND r.activo = true
      LEFT JOIN inventarios_caracteristicas ic ON ic.inventario_id = i.id
      WHERE i.activo = true 
        AND i.estatus = 'activo'
        AND (
          (r.id IS NOT NULL AND (
            (i.existencia_actual < i.stock_minimo AND r.alerta_critico_activa) OR
            (r.usar_stock_maximo AND i.stock_maximo IS NOT NULL AND i.existencia_actual < (i.stock_minimo + ((i.stock_maximo - i.stock_minimo) * (r.nivel_bajo_porcentaje / 100))) AND r.alerta_bajo_activa) OR
            (r.usar_stock_maximo AND i.stock_maximo IS NOT NULL AND i.existencia_actual > i.stock_maximo AND r.alerta_sobrestock_activa) OR
            (NOT r.usar_stock_maximo AND i.existencia_actual < (i.stock_minimo * (1 + r.nivel_bajo_porcentaje / 100)) AND r.alerta_bajo_activa)
          ))
          OR
          (r.id IS NULL AND i.existencia_actual <= (i.stock_minimo * 1.1))
        )
      ORDER BY 
        CASE 
          WHEN i.existencia_actual < i.stock_minimo THEN 1
          WHEN i.existencia_actual > COALESCE(i.stock_maximo, 999999) THEN 2
          ELSE 3
        END,
        i.existencia_actual ASC
    `;
    
    const result = await query(alertasQuery);
    
    // Convertir campos numéricos
    const parsedAlertas = result.rows.map(parseNumericFields);
    
    return res.json(createResponse(true, parsedAlertas, 'Alertas obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener alertas', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener estadísticas generales del inventario
 * GET /api/inventarios/stats
 */
async function getStats(req, res) {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_articulos,
        COUNT(*) FILTER (WHERE tipo = 'venta') AS total_venta,
        COUNT(*) FILTER (WHERE tipo = 'insumo') AS total_insumos,
        COUNT(*) FILTER (WHERE tipo = 'generico') AS total_genericos,
        COUNT(*) FILTER (WHERE existencia_actual < stock_minimo) AS alertas_criticas,
        COUNT(*) FILTER (WHERE existencia_actual >= stock_minimo AND existencia_actual <= (stock_minimo * 1.1)) AS alertas_bajas,
        SUM(existencia_actual * COALESCE(costo_promedio, costo_compra, 0)) AS valor_total_inventario
      FROM inventarios
      WHERE activo = true AND estatus = 'activo'
    `;
    
    const result = await query(statsQuery);
    
    // Convertir campos numéricos
    const parsedStats = parseNumericFields(result.rows[0]);
    
    return res.json(createResponse(true, parsedStats, 'Estadísticas obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener estadísticas', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener catálogo de categorías
 * GET /api/inventarios/categorias
 */
async function getCategorias(req, res) {
  try {
    const tipo = req.query.tipo;
    
    let categoriasQuery = `
      SELECT * FROM inventarios_categorias
      WHERE activo = true
    `;
    
    const params = [];
    if (tipo) {
      categoriasQuery += ' AND tipo = $1';
      params.push(tipo);
    }
    
    categoriasQuery += ' ORDER BY orden ASC, nombre ASC';
    
    const result = await query(categoriasQuery, params);
    
    return res.json(createResponse(true, result.rows, 'Categorías obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener categorías', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Crear nueva categoría
 * POST /api/inventarios/categorias
 */
async function createCategoria(req, res) {
  try {
    const { tipo, nombre, descripcion, campos_requeridos, orden } = req.body;
    
    // Validaciones
    if (!tipo || !['venta', 'insumo', 'generico'].includes(tipo)) {
      return res.status(400).json(
        createErrorResponse('El tipo debe ser: venta, insumo o generico', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json(
        createErrorResponse('El nombre de la categoría es requerido', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Verificar si ya existe una categoría con el mismo nombre y tipo
    const existeQuery = `
      SELECT id FROM inventarios_categorias
      WHERE LOWER(nombre) = LOWER($1) AND tipo = $2 AND activo = true
    `;
    const existe = await query(existeQuery, [nombre.trim(), tipo]);
    
    if (existe.rows.length > 0) {
      return res.status(400).json(
        createErrorResponse('Ya existe una categoría con ese nombre para este tipo', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Obtener el siguiente orden si no se especificó
    let ordenFinal = orden;
    if (!ordenFinal) {
      const maxOrdenQuery = `
        SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente_orden
        FROM inventarios_categorias
        WHERE tipo = $1
      `;
      const maxOrden = await query(maxOrdenQuery, [tipo]);
      ordenFinal = maxOrden.rows[0].siguiente_orden;
    }
    
    const insertQuery = `
      INSERT INTO inventarios_categorias (tipo, nombre, descripcion, campos_requeridos, orden, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      tipo,
      nombre.trim(),
      descripcion || null,
      campos_requeridos ? JSON.stringify(campos_requeridos) : null,
      ordenFinal
    ]);
    
    return res.status(201).json(
      createResponse(true, result.rows[0], 'Categoría creada correctamente')
    );
    
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return res.status(500).json(
      createErrorResponse('Error al crear categoría', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Actualizar categoría existente
 * PUT /api/inventarios/categorias/:id
 */
async function updateCategoria(req, res) {
  try {
    const categoriaId = req.params.id;
    const { tipo, nombre, descripcion, campos_requeridos, orden, activo } = req.body;
    
    // Verificar que la categoría existe
    const categoriaQuery = 'SELECT * FROM inventarios_categorias WHERE id = $1';
    const categoriaResult = await query(categoriaQuery, [categoriaId]);
    
    if (categoriaResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Categoría no encontrada', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Validar tipo si se proporciona
    if (tipo && !['venta', 'insumo', 'generico'].includes(tipo)) {
      return res.status(400).json(
        createErrorResponse('El tipo debe ser: venta, insumo o generico', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Verificar duplicados si se cambia el nombre
    if (nombre && nombre.trim() !== categoriaResult.rows[0].nombre) {
      const tipoFinal = tipo || categoriaResult.rows[0].tipo;
      const existeQuery = `
        SELECT id FROM inventarios_categorias
        WHERE LOWER(nombre) = LOWER($1) AND tipo = $2 AND id != $3 AND activo = true
      `;
      const existe = await query(existeQuery, [nombre.trim(), tipoFinal, categoriaId]);
      
      if (existe.rows.length > 0) {
        return res.status(400).json(
          createErrorResponse('Ya existe una categoría con ese nombre para este tipo', CODIGOS_ERROR.DATOS_INVALIDOS)
        );
      }
    }
    
    const updateQuery = `
      UPDATE inventarios_categorias
      SET 
        tipo = COALESCE($1, tipo),
        nombre = COALESCE($2, nombre),
        descripcion = COALESCE($3, descripcion),
        campos_requeridos = COALESCE($4, campos_requeridos),
        orden = COALESCE($5, orden),
        activo = COALESCE($6, activo),
        fecha_modificacion = NOW()
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      tipo || null,
      nombre ? nombre.trim() : null,
      descripcion !== undefined ? descripcion : null,
      campos_requeridos !== undefined ? (campos_requeridos ? JSON.stringify(campos_requeridos) : null) : null,
      orden || null,
      activo !== undefined ? activo : null,
      categoriaId
    ]);
    
    return res.json(createResponse(true, result.rows[0], 'Categoría actualizada correctamente'));
    
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return res.status(500).json(
      createErrorResponse('Error al actualizar categoría', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Eliminar (desactivar) categoría
 * DELETE /api/inventarios/categorias/:id
 */
async function deleteCategoria(req, res) {
  try {
    const categoriaId = req.params.id;
    
    // Verificar que la categoría existe
    const categoriaQuery = 'SELECT * FROM inventarios_categorias WHERE id = $1';
    const categoriaResult = await query(categoriaQuery, [categoriaId]);
    
    if (categoriaResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Categoría no encontrada', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Verificar si hay artículos usando esta categoría
    const inventariosQuery = `
      SELECT COUNT(*) AS total
      FROM inventarios
      WHERE categoria = $1 AND activo = true
    `;
    const inventariosResult = await query(inventariosQuery, [categoriaResult.rows[0].nombre]);
    
    if (parseInt(inventariosResult.rows[0].total) > 0) {
      const mensajeError = `No se puede eliminar la categoría porque tiene ${inventariosResult.rows[0].total} artículo(s) asociado(s)`;
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.DEPENDENCY_ERROR, mensajeError)
      );
    }
    
    // Eliminar categoría físicamente
    const deleteQuery = `
      DELETE FROM inventarios_categorias
      WHERE id = $1
      RETURNING nombre
    `;
    
    const result = await query(deleteQuery, [categoriaId]);
    
    return res.json(createResponse(true, result.rows[0], 'Categoría eliminada permanentemente de la base de datos'));
    
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return res.status(500).json(
      createErrorResponse('Error al eliminar categoría', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Obtener reglas de stock de un artículo
 * GET /api/inventarios/:id/reglas-stock
 */
async function getReglasStock(req, res) {
  try {
    const { id } = req.params;
    
    // Verificar que el artículo existe
    const inventarioCheck = await query('SELECT id, nombre, stock_minimo, stock_maximo FROM inventarios WHERE id = $1 AND activo = true', [id]);
    if (inventarioCheck.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const inventario = inventarioCheck.rows[0];
    
    // Buscar reglas personalizadas
    const reglasQuery = 'SELECT * FROM inventarios_reglas_stock WHERE inventario_id = $1 AND activo = true';
    const reglasResult = await query(reglasQuery, [id]);
    
    if (reglasResult.rows.length === 0) {
      // Retornar reglas por defecto
      return res.json(createResponse(true, {
        inventario_id: parseInt(id),
        tiene_reglas_personalizadas: false,
        nivel_critico_porcentaje: 0,
        nivel_bajo_porcentaje: 10,
        nivel_normal_porcentaje: 30,
        usar_stock_maximo: true,
        alerta_critico_activa: true,
        alerta_bajo_activa: true,
        alerta_sobrestock_activa: false,
        umbral_sobrestock_porcentaje: 0,
        notificar_usuarios: null,
        observaciones: null,
        stock_minimo: inventario.stock_minimo,
        stock_maximo: inventario.stock_maximo
      }, 'Usando reglas por defecto del sistema'));
    }
    
    const reglas = reglasResult.rows[0];
    reglas.tiene_reglas_personalizadas = true;
    reglas.stock_minimo = inventario.stock_minimo;
    reglas.stock_maximo = inventario.stock_maximo;
    
    return res.json(createResponse(true, reglas, 'Reglas personalizadas obtenidas correctamente'));
    
  } catch (error) {
    console.error('Error al obtener reglas de stock:', error);
    return res.status(500).json(
      createErrorResponse('Error al obtener reglas de stock', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Crear reglas de stock personalizadas
 * POST /api/inventarios/:id/reglas-stock
 */
async function createReglasStock(req, res) {
  try {
    const { id } = req.params;
    const {
      nivel_critico_porcentaje,
      nivel_bajo_porcentaje,
      nivel_normal_porcentaje,
      usar_stock_maximo,
      alerta_critico_activa,
      alerta_bajo_activa,
      alerta_sobrestock_activa,
      umbral_sobrestock_porcentaje,
      notificar_usuarios,
      observaciones
    } = req.body;
    
    // Validaciones básicas
    if (nivel_bajo_porcentaje !== undefined && nivel_bajo_porcentaje < 0) {
      return res.status(400).json(
        createErrorResponse('Los porcentajes no pueden ser negativos', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    if (nivel_critico_porcentaje > nivel_bajo_porcentaje || nivel_bajo_porcentaje > nivel_normal_porcentaje) {
      return res.status(400).json(
        createErrorResponse('Los porcentajes deben estar en orden: crítico <= bajo <= normal', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    // Verificar que el artículo existe
    const inventarioCheck = await query('SELECT id FROM inventarios WHERE id = $1 AND activo = true', [id]);
    if (inventarioCheck.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Verificar si ya existen reglas
    const existingRules = await query('SELECT id FROM inventarios_reglas_stock WHERE inventario_id = $1', [id]);
    
    if (existingRules.rows.length > 0) {
      return res.status(400).json(
        createErrorResponse('Ya existen reglas para este artículo. Use PUT para actualizar', CODIGOS_ERROR.DATOS_INVALIDOS)
      );
    }
    
    const insertQuery = `
      INSERT INTO inventarios_reglas_stock (
        inventario_id, nivel_critico_porcentaje, nivel_bajo_porcentaje,
        nivel_normal_porcentaje, usar_stock_maximo, alerta_critico_activa,
        alerta_bajo_activa, alerta_sobrestock_activa, umbral_sobrestock_porcentaje,
        notificar_usuarios, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      id,
      nivel_critico_porcentaje !== undefined ? nivel_critico_porcentaje : 0,
      nivel_bajo_porcentaje !== undefined ? nivel_bajo_porcentaje : 10,
      nivel_normal_porcentaje !== undefined ? nivel_normal_porcentaje : 30,
      usar_stock_maximo !== undefined ? usar_stock_maximo : true,
      alerta_critico_activa !== undefined ? alerta_critico_activa : true,
      alerta_bajo_activa !== undefined ? alerta_bajo_activa : true,
      alerta_sobrestock_activa !== undefined ? alerta_sobrestock_activa : false,
      umbral_sobrestock_porcentaje !== undefined ? umbral_sobrestock_porcentaje : 0,
      notificar_usuarios ? JSON.stringify(notificar_usuarios) : null,
      observaciones || null
    ]);
    
    return res.status(201).json(createResponse(true, result.rows[0], 'Reglas de stock creadas correctamente'));
    
  } catch (error) {
    console.error('Error al crear reglas de stock:', error);
    return res.status(500).json(
      createErrorResponse('Error al crear reglas de stock', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Actualizar reglas de stock existentes
 * PUT /api/inventarios/:id/reglas-stock
 */
async function updateReglasStock(req, res) {
  try {
    const { id } = req.params;
    const {
      nivel_critico_porcentaje,
      nivel_bajo_porcentaje,
      nivel_normal_porcentaje,
      usar_stock_maximo,
      alerta_critico_activa,
      alerta_bajo_activa,
      alerta_sobrestock_activa,
      umbral_sobrestock_porcentaje,
      notificar_usuarios,
      observaciones,
      activo
    } = req.body;
    
    // Verificar que el artículo existe
    const inventarioCheck = await query('SELECT id FROM inventarios WHERE id = $1', [id]);
    if (inventarioCheck.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    // Verificar que existen reglas
    const reglasCheck = await query('SELECT id FROM inventarios_reglas_stock WHERE inventario_id = $1', [id]);
    if (reglasCheck.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('No existen reglas para este artículo. Use POST para crear', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const updateQuery = `
      UPDATE inventarios_reglas_stock
      SET
        nivel_critico_porcentaje = COALESCE($1, nivel_critico_porcentaje),
        nivel_bajo_porcentaje = COALESCE($2, nivel_bajo_porcentaje),
        nivel_normal_porcentaje = COALESCE($3, nivel_normal_porcentaje),
        usar_stock_maximo = COALESCE($4, usar_stock_maximo),
        alerta_critico_activa = COALESCE($5, alerta_critico_activa),
        alerta_bajo_activa = COALESCE($6, alerta_bajo_activa),
        alerta_sobrestock_activa = COALESCE($7, alerta_sobrestock_activa),
        umbral_sobrestock_porcentaje = COALESCE($8, umbral_sobrestock_porcentaje),
        notificar_usuarios = COALESCE($9, notificar_usuarios),
        observaciones = COALESCE($10, observaciones),
        activo = COALESCE($11, activo),
        fecha_modificacion = CURRENT_TIMESTAMP
      WHERE inventario_id = $12
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      nivel_critico_porcentaje,
      nivel_bajo_porcentaje,
      nivel_normal_porcentaje,
      usar_stock_maximo,
      alerta_critico_activa,
      alerta_bajo_activa,
      alerta_sobrestock_activa,
      umbral_sobrestock_porcentaje,
      notificar_usuarios !== undefined ? JSON.stringify(notificar_usuarios) : null,
      observaciones,
      activo,
      id
    ]);
    
    return res.json(createResponse(true, result.rows[0], 'Reglas de stock actualizadas correctamente'));
    
  } catch (error) {
    console.error('Error al actualizar reglas de stock:', error);
    return res.status(500).json(
      createErrorResponse('Error al actualizar reglas de stock', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Eliminar reglas de stock (volver a usar reglas por defecto)
 * DELETE /api/inventarios/:id/reglas-stock
 */
async function deleteReglasStock(req, res) {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM inventarios_reglas_stock WHERE inventario_id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('No existen reglas personalizadas para este artículo', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    return res.json(createResponse(true, true, 'Reglas eliminadas. Se usarán reglas por defecto del sistema'));
    
  } catch (error) {
    console.error('Error al eliminar reglas de stock:', error);
    return res.status(500).json(
      createErrorResponse('Error al eliminar reglas de stock', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

/**
 * Archivar/desarchivar un artículo de inventario
 * PATCH /api/inventarios/:id/archivar
 */
async function archivarInventario(req, res) {
  try {
    const { id } = req.params;
    const { archivar = true } = req.body; // Por defecto archiva (activo = false)
    
    // Verificar que existe
    const checkQuery = 'SELECT nombre, activo FROM inventarios WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO)
      );
    }
    
    const articuloActual = checkResult.rows[0];
    const nuevoEstado = !archivar; // Si archivar=true entonces activo=false
    
    // Evitar operaciones redundantes
    if (articuloActual.activo === nuevoEstado) {
      const mensaje = nuevoEstado 
        ? 'El artículo ya está activo' 
        : 'El artículo ya está archivado';
      return res.status(400).json(
        createErrorResponse(mensaje, CODIGOS_ERROR.OPERACION_INVALIDA)
      );
    }
    
    // Actualizar estado
    const updateQuery = `
      UPDATE inventarios 
      SET activo = $1, fecha_modificacion = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, nombre, activo
    `;
    
    const result = await query(updateQuery, [nuevoEstado, id]);
    
    const mensaje = nuevoEstado 
      ? `Artículo "${articuloActual.nombre}" restaurado y visible nuevamente`
      : `Artículo "${articuloActual.nombre}" archivado (oculto pero conserva historial de movimientos)`;
    
    return res.json(createResponse(true, result.rows[0], mensaje));
    
  } catch (error) {
    console.error('Error al archivar/desarchivar inventario:', error);
    return res.status(500).json(
      createErrorResponse('Error al cambiar estado del artículo', CODIGOS_ERROR.ERROR_SERVIDOR)
    );
  }
}

module.exports = {
  listInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
  archivarInventario,
  addMovimiento,
  getHistorialMovimientos,
  getAlertas,
  getStats,
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getReglasStock,
  createReglasStock,
  updateReglasStock,
  deleteReglasStock
};
