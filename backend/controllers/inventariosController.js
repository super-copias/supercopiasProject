/**
 * Controlador de Inventarios v2 - SuperCopias
 * Rediseño simplificado:
 *   - Departamentos (reemplazan categorías con tipo fijo)
 *   - Artículos: Producto venta | Insumo | Genérico | Servicio
 *   - Movimientos con historial global filtrable
 *   - Integración con Punto de Venta (disponible_en_pos)
 */

const { query, queryAudit } = require('../config/database');
const {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');
const { registrarBitacora, getIp } = require('../utils/bitacora');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function parseNumericFields(row) {
  const intFields = ['total_articulos', 'total_productos', 'total_insumos',
    'total_genericos', 'total_servicios', 'alertas_criticas', 'alertas_bajas'];
  const decFields = ['existencia_actual', 'stock_minimo', 'stock_maximo',
    'costo_compra', 'precio_venta', 'costo_promedio', 'faltante',
    'valor_total_inventario', 'cantidad', 'saldo_anterior', 'saldo_nuevo'];

  const r = { ...row };
  intFields.forEach(f => { if (r[f] != null) r[f] = parseInt(r[f], 10); });
  decFields.forEach(f => { if (r[f] != null) r[f] = parseFloat(r[f]); });
  return r;
}

function nivelStock(existencia, stockMin) {
  if (stockMin == null || stockMin === 0) return 'normal';
  const e = parseFloat(existencia);
  const m = parseFloat(stockMin);
  if (e < m) return 'critico';
  if (e <= m * 1.1) return 'bajo';
  return 'normal';
}

// ─────────────────────────────────────────────────────────────
// DEPARTAMENTOS
// ─────────────────────────────────────────────────────────────

async function getDepartamentos(req, res) {
  try {
    const result = await query(`
      SELECT d.*,
             COUNT(i.id) FILTER (WHERE i.activo = true) AS total_articulos,
             COALESCE(SUM(i.costo_compra * i.existencia_actual) FILTER (WHERE i.activo = true), 0) AS costo_total
      FROM inv_departamentos d
      LEFT JOIN inventarios i ON i.departamento_id = d.id
      WHERE d.activo = true
      GROUP BY d.id
      ORDER BY d.orden ASC, d.nombre ASC
    `);
    return res.json(createResponse(true, result.rows, 'Departamentos obtenidos'));
  } catch (err) {
    console.error('getDepartamentos:', err);
    return res.status(500).json(createErrorResponse('Error al obtener departamentos', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function createDepartamento(req, res) {
  try {
    const { nombre, descripcion, color, orden } = req.body;
    if (!nombre || nombre.trim() === '')
      return res.status(400).json(createErrorResponse('El nombre es requerido', CODIGOS_ERROR.DATOS_INVALIDOS));

    const existe = await query('SELECT id FROM inv_departamentos WHERE LOWER(nombre)=LOWER($1) AND activo=true', [nombre.trim()]);
    if (existe.rows.length > 0)
      return res.status(400).json(createErrorResponse('Ya existe un departamento con ese nombre', CODIGOS_ERROR.DATOS_INVALIDOS));

    const maxOrden = await query('SELECT COALESCE(MAX(orden),0)+1 AS sig FROM inv_departamentos');
    const sig = orden ?? maxOrden.rows[0].sig;

    const r = await query(
      'INSERT INTO inv_departamentos (nombre,descripcion,color,orden) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre.trim(), descripcion || null, color || '#6c757d', sig]
    );
    return res.status(201).json(createResponse(true, r.rows[0], 'Departamento creado'));
  } catch (err) {
    console.error('createDepartamento:', err);
    return res.status(500).json(createErrorResponse('Error al crear departamento', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function updateDepartamento(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, color, orden } = req.body;

    const check = await query('SELECT id FROM inv_departamentos WHERE id=$1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json(createErrorResponse('Departamento no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    if (nombre) {
      const dup = await query('SELECT id FROM inv_departamentos WHERE LOWER(nombre)=LOWER($1) AND id!=$2 AND activo=true', [nombre.trim(), id]);
      if (dup.rows.length > 0)
        return res.status(400).json(createErrorResponse('Ya existe un departamento con ese nombre', CODIGOS_ERROR.DATOS_INVALIDOS));
    }

    const r = await query(
      `UPDATE inv_departamentos SET nombre=COALESCE($1,nombre), descripcion=COALESCE($2,descripcion),
       color=COALESCE($3,color), orden=COALESCE($4,orden), fecha_modificacion=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [nombre?.trim(), descripcion, color, orden, id]
    );
    return res.json(createResponse(true, r.rows[0], 'Departamento actualizado'));
  } catch (err) {
    console.error('updateDepartamento:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar departamento', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function deleteDepartamento(req, res) {
  try {
    const { id } = req.params;
    const check = await query('SELECT nombre FROM inv_departamentos WHERE id=$1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json(createErrorResponse('Departamento no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const arts = await query('SELECT COUNT(*) AS total FROM inventarios WHERE departamento_id=$1 AND activo=true', [id]);
    if (parseInt(arts.rows[0].total) > 0)
      return res.status(400).json(createErrorResponse(`No se puede eliminar: tiene ${arts.rows[0].total} artículo(s) asociado(s)`, CODIGOS_ERROR.DATOS_INVALIDOS));

    await query('DELETE FROM inv_departamentos WHERE id=$1', [id]);
    return res.json(createResponse(true, { nombre: check.rows[0].nombre }, 'Departamento eliminado'));
  } catch (err) {
    console.error('deleteDepartamento:', err);
    return res.status(500).json(createErrorResponse('Error al eliminar departamento', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// ARTÍCULOS — CRUD
// ─────────────────────────────────────────────────────────────

async function listInventarios(req, res) {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const { departamento_id, tipo, stockNivel } = req.query;
    const es_servicio = req.query.es_servicio;
    const disponible_en_pos = req.query.disponible_en_pos;
    const incluirArchivados = req.query.incluirArchivados === 'true';
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const offset = (page - 1) * limit;

    const params = [];
    let p = 1;
    const where = [`i.activo = ${incluirArchivados ? 'false' : 'true'}`];

    if (q) { where.push(`(LOWER(i.nombre) LIKE $${p} OR LOWER(i.codigo_sku) LIKE $${p} OR LOWER(i.marca) LIKE $${p})`); params.push(`%${q}%`); p++; }
    if (departamento_id) { where.push(`i.departamento_id = $${p}`); params.push(departamento_id); p++; }
    if (tipo) { where.push(`i.tipo = $${p}`); params.push(tipo); p++; }
    if (es_servicio !== undefined) { where.push(`i.es_servicio = $${p}`); params.push(es_servicio === 'true'); p++; }
    if (disponible_en_pos !== undefined) { where.push(`i.disponible_en_pos = $${p}`); params.push(disponible_en_pos === 'true'); p++; }
    if (stockNivel === 'critico') where.push('i.es_servicio=false AND i.existencia_actual < i.stock_minimo');
    else if (stockNivel === 'bajo') where.push('i.es_servicio=false AND i.existencia_actual >= i.stock_minimo AND i.existencia_actual <= (i.stock_minimo*1.1)');
    else if (stockNivel === 'normal') where.push('i.es_servicio=false AND i.existencia_actual > (i.stock_minimo*1.1)');

    const whereStr = 'WHERE ' + where.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [data, cnt] = await Promise.all([
      query(`SELECT i.*, d.nombre AS departamento_nombre, d.color AS departamento_color
             FROM inventarios i LEFT JOIN inv_departamentos d ON d.id=i.departamento_id
             ${whereStr} ORDER BY d.orden ASC, i.nombre ASC LIMIT $${p} OFFSET $${p+1}`, params),
      query(`SELECT COUNT(*) FROM inventarios i LEFT JOIN inv_departamentos d ON d.id=i.departamento_id ${whereStr}`, countParams)
    ]);

    const parsed = data.rows.map(r => ({
      ...parseNumericFields(r),
      nivel_stock: r.es_servicio ? null : nivelStock(r.existencia_actual, r.stock_minimo)
    }));
    return res.json(createPaginatedResponse(parsed, page, limit, parseInt(cnt.rows[0].count)));
  } catch (err) {
    console.error('listInventarios:', err);
    return res.status(500).json(createErrorResponse('Error al obtener inventarios', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getInventariosPorDepartamento(req, res) {
  try {
    const tipo = req.query.tipo;
    const es_servicio = req.query.es_servicio;
    const disponible_en_pos = req.query.disponible_en_pos;
    const filtroDepartamento = req.query.departamento_id ? parseInt(req.query.departamento_id, 10) : null;

    const baseWhere = ['i.activo = true'];
    const params = [];
    let p = 1;
    if (tipo) { baseWhere.push(`i.tipo = $${p}`); params.push(tipo); p++; }
    if (es_servicio !== undefined) { baseWhere.push(`i.es_servicio = $${p}`); params.push(es_servicio === 'true'); p++; }
    if (disponible_en_pos !== undefined) { baseWhere.push(`i.disponible_en_pos = $${p}`); params.push(disponible_en_pos === 'true'); p++; }

    // Filtrar departamentos si se especifica uno
    const deptoWhere = filtroDepartamento ? `AND d.id = ${filtroDepartamento}` : '';

    const deptos = await query(`
      SELECT d.*, COUNT(i.id) AS total_articulos,
             COALESCE(SUM(i.costo_compra * i.existencia_actual), 0) AS costo_total
      FROM inv_departamentos d
      INNER JOIN inventarios i ON i.departamento_id=d.id AND i.activo=true
      WHERE d.activo=true ${deptoWhere} GROUP BY d.id ORDER BY d.orden ASC, d.nombre ASC
    `);

    const resultado = await Promise.all(deptos.rows.map(async (depto) => {
      const artParams = [...params, depto.id];
      const artResult = await query(
        `SELECT i.* FROM inventarios i WHERE ${baseWhere.join(' AND ')} AND i.departamento_id=$${p} ORDER BY i.nombre ASC`,
        artParams
      );
      return {
        ...depto,
        total_articulos: parseInt(depto.total_articulos),
        costo_total: parseFloat(depto.costo_total) || 0,
        articulos: artResult.rows.map(r => ({
          ...parseNumericFields(r),
          nivel_stock: r.es_servicio ? null : nivelStock(r.existencia_actual, r.stock_minimo)
        }))
      };
    }));

    return res.json(createResponse(true, resultado, 'Inventario agrupado por departamento'));
  } catch (err) {
    console.error('getInventariosPorDepartamento:', err);
    return res.status(500).json(createErrorResponse('Error al obtener inventario agrupado', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getInventarioById(req, res) {
  try {
    const { id } = req.params;
    const r = await query(
      `SELECT i.*, d.nombre AS departamento_nombre, d.color AS departamento_color
       FROM inventarios i LEFT JOIN inv_departamentos d ON d.id=i.departamento_id WHERE i.id=$1`, [id]
    );
    if (r.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const art = parseNumericFields(r.rows[0]);
    art.nivel_stock = art.es_servicio ? null : nivelStock(art.existencia_actual, art.stock_minimo);

    // Incluir filas del tabulador
    const tabResult = await query(
      'SELECT id, cantidad_desde, precio, orden FROM inv_tabulador_precios WHERE inventario_id=$1 ORDER BY cantidad_desde ASC',
      [id]
    );
    art.tabulador = tabResult.rows.map(parseNumericFields);

    return res.json(createResponse(true, art, 'Artículo obtenido'));
  } catch (err) {
    console.error('getInventarioById:', err);
    return res.status(500).json(createErrorResponse('Error al obtener artículo', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function createInventario(req, res) {
  try {
    const {
      departamento_id, tipo, es_servicio, nombre, descripcion,
      codigo_sku, marca, modelo, proveedor_id,
      unidad_medida, existencia_actual, stock_minimo, stock_maximo,
      ubicacion_fisica, costo_compra, precio_venta, disponible_en_pos, tabulador_activo
    } = req.body;

    if (!departamento_id)
      return res.status(400).json(createErrorResponse('El departamento es requerido', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (!tipo || !['venta','insumo','generico'].includes(tipo))
      return res.status(400).json(createErrorResponse('Tipo inválido: venta | insumo | generico', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (!nombre || nombre.trim() === '')
      return res.status(400).json(createErrorResponse('El nombre es requerido', CODIGOS_ERROR.DATOS_INVALIDOS));

    const esServicio = es_servicio === true || es_servicio === 'true';
    const provId = (!proveedor_id || proveedor_id === 'null' || proveedor_id === '') ? null : (parseInt(proveedor_id, 10) || null);
    if (esServicio && tipo !== 'venta')
      return res.status(400).json(createErrorResponse('Un servicio solo puede ser de tipo "venta"', CODIGOS_ERROR.DATOS_INVALIDOS));
    if ((tipo === 'venta' || esServicio) && !precio_venta)
      return res.status(400).json(createErrorResponse('El precio de venta es requerido para productos de venta y servicios', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (!esServicio && !unidad_medida)
      return res.status(400).json(createErrorResponse('La unidad de medida es requerida', CODIGOS_ERROR.DATOS_INVALIDOS));

    const depto = await query('SELECT id, nombre FROM inv_departamentos WHERE id=$1 AND activo=true', [departamento_id]);
    if (depto.rows.length === 0)
      return res.status(400).json(createErrorResponse('Departamento no encontrado', CODIGOS_ERROR.DATOS_INVALIDOS));

    const categoriaNombre = depto.rows[0].nombre;

    const posFlag = disponible_en_pos !== undefined
      ? (disponible_en_pos === true || disponible_en_pos === 'true')
      : (tipo === 'venta' || esServicio);

    const r = await queryAudit(`
      INSERT INTO inventarios (
        departamento_id, categoria, tipo, es_servicio, nombre, descripcion, codigo_sku, marca, modelo, proveedor_id,
        unidad_medida, existencia_actual, stock_minimo, stock_maximo, ubicacion_fisica,
        costo_compra, precio_venta, costo_promedio, disponible_en_pos, tabulador_activo, activo, estatus
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,true,'activo') RETURNING *
    `, [
      departamento_id, categoriaNombre, tipo, esServicio, nombre.trim(), descripcion||null,
      codigo_sku||null, marca||null, modelo||null, provId,
      esServicio ? 'Servicio' : (unidad_medida||null),
      esServicio ? 0 : (existencia_actual||0),
      esServicio ? 0 : (stock_minimo||0),
      esServicio ? null : (stock_maximo||null),
      ubicacion_fisica||null, costo_compra||null, precio_venta||null, costo_compra||0, posFlag,
      tabulador_activo === true || tabulador_activo === 'true'
    ], req.user?.id, req.user?.nombre || req.user?.username);

    const art = r.rows[0];
    if (!esServicio && parseFloat(existencia_actual||0) > 0) {
      await query(`
        INSERT INTO inventarios_movimientos
          (inventario_id,tipo_movimiento,concepto,cantidad,saldo_anterior,saldo_nuevo,usuario_nombre,notas)
        VALUES ($1,'entrada','ajuste_entrada',$2,0,$3,$4,'Existencia inicial al crear artículo')
      `, [art.id, existencia_actual, existencia_actual, req.user?.username||'Sistema']);
    }

    return res.status(201).json(createResponse(true, art, 'Artículo creado exitosamente'));
  } catch (err) {
    console.error('createInventario:', err);
    return res.status(500).json(createErrorResponse('Error al crear artículo', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function updateInventario(req, res) {
  try {
    const { id } = req.params;
    const {
      departamento_id, tipo, nombre, descripcion, codigo_sku,
      marca, modelo, proveedor_id, unidad_medida, stock_minimo, stock_maximo,
      ubicacion_fisica, costo_compra, precio_venta, disponible_en_pos, estatus, tabulador_activo
    } = req.body;

    const check = await query('SELECT id, tipo, es_servicio FROM inventarios WHERE id=$1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const esServicio = check.rows[0].es_servicio;
    const tipoFinal = tipo || check.rows[0].tipo;
    if ((tipoFinal === 'venta' || esServicio) && precio_venta !== undefined && !precio_venta)
      return res.status(400).json(createErrorResponse('El precio de venta no puede estar vacío para venta/servicio', CODIGOS_ERROR.DATOS_INVALIDOS));

    const r = await queryAudit(`
      UPDATE inventarios SET
        departamento_id=COALESCE($1,departamento_id),
        categoria=COALESCE((SELECT nombre FROM inv_departamentos WHERE id=$1), categoria),
        tipo=COALESCE($2,tipo),
        nombre=COALESCE($3,nombre), descripcion=$4, codigo_sku=$5, marca=$6, modelo=$7, proveedor_id=$8,
        unidad_medida=COALESCE($9,unidad_medida), stock_minimo=COALESCE($10,stock_minimo), stock_maximo=$11,
        ubicacion_fisica=$12, costo_compra=$13, precio_venta=$14,
        costo_promedio=COALESCE($13,costo_compra,costo_promedio),
        disponible_en_pos=COALESCE($15,disponible_en_pos), estatus=COALESCE($16,estatus),
        tabulador_activo=COALESCE($18,tabulador_activo),
        fecha_modificacion=CURRENT_TIMESTAMP
      WHERE id=$17 RETURNING *
    `, [
      departamento_id, tipo, nombre?.trim(), descripcion, codigo_sku, marca, modelo, proveedor_id,
      esServicio ? null : unidad_medida,
      esServicio ? null : stock_minimo,
      esServicio ? null : stock_maximo,
      ubicacion_fisica, costo_compra, precio_venta, disponible_en_pos, estatus, id,
      tabulador_activo !== undefined ? (tabulador_activo === true || tabulador_activo === 'true') : undefined
    ], req.user?.id, req.user?.nombre || req.user?.username);

    return res.json(createResponse(true, r.rows[0], 'Artículo actualizado'));
  } catch (err) {
    console.error('updateInventario:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar artículo', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function deleteInventario(req, res) {
  try {
    const { id } = req.params;
    const check = await query('SELECT nombre FROM inventarios WHERE id=$1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const movs = await query('SELECT COUNT(*) AS total FROM inventarios_movimientos WHERE inventario_id=$1', [id]);
    if (parseInt(movs.rows[0].total) > 0)
      return res.status(400).json(createErrorResponse(`No se puede eliminar: tiene ${movs.rows[0].total} movimiento(s). Usa "Archivar".`, CODIGOS_ERROR.DATOS_INVALIDOS));

    await queryAudit('DELETE FROM inventarios WHERE id=$1', [id], req.user?.id, req.user?.nombre || req.user?.username);
    return res.json(createResponse(true, { nombre: check.rows[0].nombre }, 'Artículo eliminado permanentemente'));
  } catch (err) {
    console.error('deleteInventario:', err);
    return res.status(500).json(createErrorResponse('Error al eliminar artículo', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function archivarInventario(req, res) {
  try {
    const { id } = req.params;
    const archivar = req.body.archivar !== false;
    const r = await queryAudit(
      'UPDATE inventarios SET activo=$1, fecha_modificacion=CURRENT_TIMESTAMP WHERE id=$2 RETURNING nombre, activo',
      [!archivar, id], req.user?.id, req.user?.nombre || req.user?.username
    );
    if (r.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));
    return res.json(createResponse(true, r.rows[0], archivar ? 'Artículo archivado' : 'Artículo restaurado'));
  } catch (err) {
    console.error('archivarInventario:', err);
    return res.status(500).json(createErrorResponse('Error al archivar artículo', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// MOVIMIENTOS
// ─────────────────────────────────────────────────────────────

async function addMovimiento(req, res) {
  try {
    const { id } = req.params;
    const { tipo_movimiento, concepto, cantidad, area_servicio, notas } = req.body;

    if (!tipo_movimiento || !concepto || !cantidad || parseFloat(cantidad) <= 0)
      return res.status(400).json(createErrorResponse('Datos de movimiento inválidos', CODIGOS_ERROR.DATOS_INVALIDOS));

    const artResult = await query(
      'SELECT existencia_actual, nombre, es_servicio FROM inventarios WHERE id=$1 AND activo=true', [id]
    );
    if (artResult.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));
    if (artResult.rows[0].es_servicio)
      return res.status(400).json(createErrorResponse('Los servicios no tienen movimientos de stock', CODIGOS_ERROR.DATOS_INVALIDOS));

    const saldo_anterior = parseFloat(artResult.rows[0].existencia_actual);
    let saldo_nuevo = saldo_anterior;
    let cant = parseFloat(cantidad);

    if (tipo_movimiento === 'entrada') saldo_nuevo = saldo_anterior + cant;
    else if (tipo_movimiento === 'salida') {
      if (saldo_anterior - cant < 0)
        return res.status(400).json(createErrorResponse('Existencia insuficiente', CODIGOS_ERROR.DATOS_INVALIDOS));
      saldo_nuevo = saldo_anterior - cant;
      cant = -cant;
    } else if (tipo_movimiento === 'ajuste') {
      saldo_nuevo = cant;
      cant = saldo_nuevo - saldo_anterior;
    }

    const movR = await query(`
      INSERT INTO inventarios_movimientos
        (inventario_id,tipo_movimiento,concepto,cantidad,saldo_anterior,saldo_nuevo,usuario_nombre,area_servicio,notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [id, tipo_movimiento, concepto, cant, saldo_anterior, saldo_nuevo,
        req.user?.username||'Sistema', area_servicio||null, notas||null]);

    await queryAudit('UPDATE inventarios SET existencia_actual=$1, fecha_modificacion=CURRENT_TIMESTAMP WHERE id=$2',
      [saldo_nuevo, id], req.user?.id, req.user?.nombre || req.user?.username);

    const accionBitacora = tipo_movimiento === 'entrada' ? 'ENTRADA_STOCK'
      : tipo_movimiento === 'salida' ? 'SALIDA_STOCK' : 'AJUSTE_STOCK';

    registrarBitacora({
      modulo: 'inventarios', accion: accionBitacora,
      entidad: 'inventarios', entidadId: String(id),
      usuarioId: req.user?.id || null, usuarioNombre: req.user?.nombre || req.user?.username || null,
      ip: getIp(req),
      detalle: { tipo_movimiento, concepto, cantidad: cant, saldo_anterior, saldo_nuevo, articulo: artResult.rows[0].nombre },
    });

    return res.status(201).json(createResponse(true, movR.rows[0], 'Movimiento registrado'));
  } catch (err) {
    console.error('addMovimiento:', err);
    return res.status(500).json(createErrorResponse('Error al registrar movimiento', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getHistorialMovimientos(req, res) {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page||'1'));
    const limit = Math.min(100, parseInt(req.query.limit||'20'));
    const offset = (page-1)*limit;

    const [data, cnt] = await Promise.all([
      query('SELECT * FROM inventarios_movimientos WHERE inventario_id=$1 ORDER BY fecha_movimiento DESC LIMIT $2 OFFSET $3', [id,limit,offset]),
      query('SELECT COUNT(*) FROM inventarios_movimientos WHERE inventario_id=$1', [id])
    ]);
    return res.json(createPaginatedResponse(data.rows, page, limit, parseInt(cnt.rows[0].count)));
  } catch (err) {
    console.error('getHistorialMovimientos:', err);
    return res.status(500).json(createErrorResponse('Error al obtener movimientos', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getHistorialGlobal(req, res) {
  try {
    const { fecha_desde, fecha_hasta, departamento_id, articulo_id, tipo_movimiento, concepto, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page||'1'));
    const limit = Math.min(100, parseInt(req.query.limit||'30'));
    const offset = (page-1)*limit;

    const params = [];
    let p = 1;
    const where = [];
    if (fecha_desde) { where.push(`m.fecha_movimiento >= $${p}`); params.push(fecha_desde); p++; }
    if (fecha_hasta) { where.push(`m.fecha_movimiento <= $${p}`); params.push(fecha_hasta+' 23:59:59'); p++; }
    if (departamento_id) { where.push(`i.departamento_id = $${p}`); params.push(parseInt(departamento_id)); p++; }
    if (articulo_id) { where.push(`m.inventario_id = $${p}`); params.push(articulo_id); p++; }
    if (tipo_movimiento) { where.push(`m.tipo_movimiento = $${p}`); params.push(tipo_movimiento); p++; }
    if (concepto) { where.push(`m.concepto = $${p}`); params.push(concepto); p++; }
    if (q) { where.push(`(LOWER(i.nombre) LIKE $${p} OR LOWER(i.codigo_sku) LIKE $${p})`); params.push('%'+q.toLowerCase()+'%'); p++; }

    const whereStr = where.length ? 'WHERE '+where.join(' AND ') : '';
    const cntParams = [...params];
    params.push(limit, offset);

    const [data, cnt] = await Promise.all([
      query(`SELECT m.*, i.nombre AS articulo_nombre, i.unidad_medida,
             d.nombre AS departamento_nombre, d.color AS departamento_color
             FROM inventarios_movimientos m
             JOIN inventarios i ON i.id=m.inventario_id
             LEFT JOIN inv_departamentos d ON d.id=i.departamento_id
             ${whereStr} ORDER BY m.fecha_movimiento DESC LIMIT $${p} OFFSET $${p+1}`, params),
      query(`SELECT COUNT(*) FROM inventarios_movimientos m
             JOIN inventarios i ON i.id=m.inventario_id
             LEFT JOIN inv_departamentos d ON d.id=i.departamento_id ${whereStr}`, cntParams)
    ]);

    const resumen = {
      entradas: data.rows.filter(r => r.tipo_movimiento==='entrada').length,
      salidas: data.rows.filter(r => r.tipo_movimiento==='salida').length,
      ajustes: data.rows.filter(r => r.tipo_movimiento==='ajuste').length
    };

    return res.json({ ...createPaginatedResponse(data.rows, page, limit, parseInt(cnt.rows[0].count)), resumen });
  } catch (err) {
    console.error('getHistorialGlobal:', err);
    return res.status(500).json(createErrorResponse('Error al obtener historial', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// ESTADÍSTICAS, ALERTAS Y CATÁLOGO POS
// ─────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const r = await query(`
      SELECT
        COUNT(*) AS total_articulos,
        COUNT(*) FILTER (WHERE es_servicio=false) AS total_productos,
        COUNT(*) FILTER (WHERE tipo='venta' AND es_servicio=false) AS total_venta,
        COUNT(*) FILTER (WHERE tipo='insumo') AS total_insumos,
        COUNT(*) FILTER (WHERE tipo='generico') AS total_genericos,
        COUNT(*) FILTER (WHERE es_servicio=true) AS total_servicios,
        COUNT(*) FILTER (WHERE es_servicio=false AND existencia_actual < stock_minimo) AS alertas_criticas,
        COUNT(*) FILTER (WHERE es_servicio=false AND existencia_actual >= stock_minimo AND existencia_actual <= (stock_minimo*1.1)) AS alertas_bajas,
        SUM(CASE WHEN es_servicio=false THEN existencia_actual * COALESCE(costo_compra,0) ELSE 0 END) AS valor_total_inventario
      FROM inventarios WHERE activo=true AND estatus='activo'
    `);
    return res.json(createResponse(true, parseNumericFields(r.rows[0]), 'Estadísticas obtenidas'));
  } catch (err) {
    console.error('getStats:', err);
    return res.status(500).json(createErrorResponse('Error al obtener estadísticas', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getAlertas(req, res) {
  try {
    const r = await query(`
      SELECT i.*, d.nombre AS departamento_nombre, d.color AS departamento_color,
        CASE WHEN i.existencia_actual < i.stock_minimo THEN 'critico' ELSE 'bajo' END AS nivel_stock,
        i.stock_minimo - i.existencia_actual AS faltante
      FROM inventarios i
      LEFT JOIN inv_departamentos d ON d.id=i.departamento_id
      WHERE i.activo=true AND i.estatus='activo' AND i.es_servicio=false
        AND i.existencia_actual <= (i.stock_minimo * 1.1)
      ORDER BY CASE WHEN i.existencia_actual < i.stock_minimo THEN 1 ELSE 2 END, i.existencia_actual ASC
    `);
    return res.json(createResponse(true, r.rows.map(parseNumericFields), 'Alertas obtenidas'));
  } catch (err) {
    console.error('getAlertas:', err);
    return res.status(500).json(createErrorResponse('Error al obtener alertas', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

async function getCatalogoPos(req, res) {
  try {
    const deptos = await query(`
      SELECT d.id, d.nombre, d.color FROM inv_departamentos d
      WHERE d.activo=true AND EXISTS (
        SELECT 1 FROM inventarios i WHERE i.departamento_id=d.id
        AND i.activo=true AND i.estatus='activo' AND i.disponible_en_pos=true
      ) ORDER BY d.orden ASC, d.nombre ASC
    `);

    const resultado = await Promise.all(deptos.rows.map(async (d) => {
      const arts = await query(`
        SELECT id, nombre, descripcion, precio_venta, unidad_medida,
               es_servicio, existencia_actual, stock_minimo, codigo_sku,
               tabulador_activo
        FROM inventarios
        WHERE departamento_id=$1 AND activo=true AND estatus='activo' AND disponible_en_pos=true
        ORDER BY nombre ASC
      `, [d.id]);

      const articulos = await Promise.all(arts.rows.map(async (a) => {
        const parsed = parseNumericFields(a);
        if (parsed.tabulador_activo) {
          const tab = await query(
            'SELECT cantidad_desde, precio FROM inv_tabulador_precios WHERE inventario_id=$1 ORDER BY cantidad_desde ASC',
            [a.id]
          );
          parsed.tabulador = tab.rows.map(parseNumericFields);
        } else {
          parsed.tabulador = [];
        }
        return parsed;
      }));

      return { ...d, articulos };
    }));

    return res.json(createResponse(true, resultado, 'Catálogo POS obtenido'));
  } catch (err) {
    console.error('getCatalogoPos:', err);
    return res.status(500).json(createErrorResponse('Error al obtener catálogo POS', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// TABULADOR DE PRECIOS POR VOLUMEN
// ─────────────────────────────────────────────────────────────

async function getTabuladorPrecios(req, res) {
  try {
    const { id } = req.params;
    const check = await query('SELECT id FROM inventarios WHERE id=$1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const r = await query(
      'SELECT id, cantidad_desde, precio, orden FROM inv_tabulador_precios WHERE inventario_id=$1 ORDER BY cantidad_desde ASC',
      [id]
    );
    return res.json(createResponse(true, r.rows.map(parseNumericFields), 'Tabulador obtenido'));
  } catch (err) {
    console.error('getTabuladorPrecios:', err);
    return res.status(500).json(createErrorResponse('Error al obtener tabulador', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

/** Reemplaza todas las filas del tabulador para un artículo (replace-all strategy). */
async function saveTabuladorPrecios(req, res) {
  try {
    const { id } = req.params;
    const { filas } = req.body; // array de { cantidad_desde, precio }

    const artResult = await query(
      'SELECT id, precio_venta, disponible_en_pos FROM inventarios WHERE id=$1 AND activo=true', [id]
    );
    if (artResult.rows.length === 0)
      return res.status(404).json(createErrorResponse('Artículo no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const precioBase = parseFloat(artResult.rows[0].precio_venta);

    if (!Array.isArray(filas))
      return res.status(400).json(createErrorResponse('Se esperaba un array de filas', CODIGOS_ERROR.DATOS_INVALIDOS));

    // Validaciones
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const desde = parseFloat(f.cantidad_desde);
      const precio = parseFloat(f.precio);
      if (isNaN(desde) || desde <= 0)
        return res.status(400).json(createErrorResponse(`Fila ${i + 1}: "cantidad_desde" debe ser mayor a 0`, CODIGOS_ERROR.DATOS_INVALIDOS));
      if (isNaN(precio) || precio <= 0)
        return res.status(400).json(createErrorResponse(`Fila ${i + 1}: "precio" debe ser mayor a 0`, CODIGOS_ERROR.DATOS_INVALIDOS));
      if (!isNaN(precioBase) && precioBase > 0 && precio >= precioBase)
        return res.status(400).json(createErrorResponse(
          `Fila ${i + 1}: el precio del tabulador ($${precio}) debe ser menor al precio de venta base ($${precioBase})`,
          CODIGOS_ERROR.DATOS_INVALIDOS
        ));
    }

    // Verificar que no haya cantidades duplicadas
    const cantidades = filas.map(f => parseFloat(f.cantidad_desde));
    const uniqueCantidades = new Set(cantidades);
    if (uniqueCantidades.size !== cantidades.length)
      return res.status(400).json(createErrorResponse('No puede haber filas con la misma cantidad', CODIGOS_ERROR.DATOS_INVALIDOS));

    // Reemplazar todas las filas en una transacción
    await query('BEGIN');
    await query('DELETE FROM inv_tabulador_precios WHERE inventario_id=$1', [id]);
    for (let i = 0; i < filas.length; i++) {
      await query(
        'INSERT INTO inv_tabulador_precios (inventario_id, cantidad_desde, precio, orden) VALUES ($1,$2,$3,$4)',
        [id, parseFloat(filas[i].cantidad_desde), parseFloat(filas[i].precio), i]
      );
    }
    await query('COMMIT');

    const r = await query(
      'SELECT id, cantidad_desde, precio, orden FROM inv_tabulador_precios WHERE inventario_id=$1 ORDER BY cantidad_desde ASC',
      [id]
    );
    return res.json(createResponse(true, r.rows.map(parseNumericFields), 'Tabulador guardado correctamente'));
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('saveTabuladorPrecios:', err);
    return res.status(500).json(createErrorResponse('Error al guardar tabulador', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  getDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento,
  listInventarios, getInventariosPorDepartamento, getInventarioById,
  createInventario, updateInventario, deleteInventario, archivarInventario,
  addMovimiento, getHistorialMovimientos, getHistorialGlobal,
  getStats, getAlertas, getCatalogoPos,
  getTabuladorPrecios, saveTabuladorPrecios
};
/* ── FIN DEL CONTROLADOR ── */
