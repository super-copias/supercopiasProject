/**
 * Controlador de Pedidos POS - SuperCopias
 * Base URL: /api/pos/pedidos
 *
 * Flujo de estados:
 *   pendiente → en_proceso → terminado → finalizado
 *                                      ↓ (genera venta en pos_ventas)
 *   Cualquier estado → cancelado (solo admin/supervisor)
 */

const { query, getClient } = require('../config/database');
const {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  CODIGOS_ERROR,
} = require('../utils/apiStandard');
const { crearFacturaEnTransaccion } = require('./facturasController');
const { registrarBitacora, getIp } = require('../utils/bitacora');

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────

function calcularNivelCliente(totalComprado) {
  if (totalComprado >= 5000) return 'vip';
  if (totalComprado >= 1000) return 'frecuente';
  return 'estandar';
}

function calcularPuntosPorVenta(total) {
  return Math.floor(total / 10);
}

async function generarFolioPedido(client) {
  const anio = new Date().getFullYear();
  await client.query('SELECT pg_advisory_xact_lock(123456789)');
  const r = await client.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)), 0) + 1 AS siguiente
     FROM pos_pedidos WHERE folio LIKE $1`,
    [`PP-${anio}-%`]
  );
  const consecutivo = parseInt(r.rows[0].siguiente, 10);
  return `PP-${anio}-${String(consecutivo).padStart(5, '0')}`;
}

async function generarFolioVenta(client) {
  const anio = new Date().getFullYear();
  await client.query('SELECT pg_advisory_xact_lock(987654321)');
  const r = await client.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)), 0) + 1 AS siguiente
     FROM pos_ventas WHERE folio LIKE $1`,
    [`PV-${anio}-%`]
  );
  const consecutivo = parseInt(r.rows[0].siguiente, 10);
  return `PV-${anio}-${String(consecutivo).padStart(5, '0')}`;
}

async function registrarHistorial(client, pedidoId, estatusAnterior, estatusNuevo, usuarioId, usuarioNombre, notas) {
  await client.query(`
    INSERT INTO pos_pedidos_historial
      (pedido_id, estatus_anterior, estatus_nuevo, usuario_id, usuario_nombre, notas)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [pedidoId, estatusAnterior, estatusNuevo,
      usuarioId && usuarioId !== 'dev' ? usuarioId : null,
      usuarioNombre, notas || null]);
}

async function getPedidoDetalle(id) {
  const r = await query(`
    SELECT p.*,
           c.nombre_comercial AS cliente_nombre_comercial,
           c.rfc              AS cliente_rfc,
           c.email            AS cliente_email
    FROM pos_pedidos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = $1
  `, [id]);
  if (r.rows.length === 0) return null;
  const pedido = r.rows[0];

  const detR = await query(
    'SELECT * FROM pos_pedidos_detalle WHERE pedido_id = $1 ORDER BY id ASC',
    [id]
  );

  const histR = await query(
    'SELECT * FROM pos_pedidos_historial WHERE pedido_id = $1 ORDER BY fecha ASC',
    [id]
  );

  return {
    ...pedido,
    subtotal:       parseFloat(pedido.subtotal),
    descuento_pct:  parseFloat(pedido.descuento_pct),
    descuento_monto: parseFloat(pedido.descuento_monto),
    total:          parseFloat(pedido.total),
    anticipo:       parseFloat(pedido.anticipo),
    saldo_pendiente: parseFloat((parseFloat(pedido.total) - parseFloat(pedido.anticipo)).toFixed(2)),
    detalle: detR.rows.map(d => ({
      ...d,
      cantidad:              parseFloat(d.cantidad),
      precio_unitario:       parseFloat(d.precio_unitario),
      descuento_linea_pct:   parseFloat(d.descuento_linea_pct),
      descuento_linea_monto: parseFloat(d.descuento_linea_monto),
      subtotal_linea:        parseFloat(d.subtotal_linea),
    })),
    historial: histR.rows,
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/pos/pedidos
// Crear pedido (nace como 'pendiente')
// Body: { cliente_id?, cliente_nombre?, cliente_telefono?,
//         via_whatsapp?, requiere_factura?,
//         items[], descuento_pct?, anticipo?,
//         metodo_pago_anticipo?, fecha_acordada?, notas?,
//         descuento_config_id?, descuento_autorizado_por? }
// ─────────────────────────────────────────────────────────────
async function createPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      cliente_id,
      cliente_nombre: clienteNombreLibre,
      cliente_telefono,
      via_whatsapp = false,
      requiere_factura = false,
      items,
      descuento_pct = 0,
      descuento_config_id,
      descuento_autorizado_por,
      anticipo = 0,
      metodo_pago_anticipo,
      fecha_acordada,
      notas,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json(createErrorResponse('Debe incluir al menos un producto', CODIGOS_ERROR.DATOS_INVALIDOS));

    const creadoPorNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const creadoPorId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    // Resolver nombre del cliente
    let clienteNombre = 'Público General';
    if (cliente_id) {
      const cliQ = await client.query(
        `SELECT COALESCE(nombre_comercial, razon_social) AS nombre FROM clientes WHERE id = $1 AND activo = true`,
        [cliente_id]
      );
      if (cliQ.rows.length > 0) clienteNombre = cliQ.rows[0].nombre;
    } else if (clienteNombreLibre && clienteNombreLibre.trim()) {
      clienteNombre = clienteNombreLibre.trim();
    }

    // Calcular totales
    let subtotal = 0;
    const lineas = [];
    for (const item of items) {
      const cantidad   = parseFloat(item.cantidad);
      const precioUnit = parseFloat(item.precio_unitario);
      const descLinPct = parseFloat(item.descuento_linea_pct || 0);
      if (cantidad <= 0 || precioUnit < 0) continue;
      const descLinMonto  = parseFloat(((cantidad * precioUnit) * descLinPct / 100).toFixed(2));
      const subtotalLinea = parseFloat(((cantidad * precioUnit) - descLinMonto).toFixed(2));
      subtotal += subtotalLinea;
      lineas.push({
        ...item, cantidad, precio_unitario: precioUnit,
        descuento_linea_pct: descLinPct,
        descuento_linea_monto: descLinMonto,
        subtotal_linea: subtotalLinea,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const descPct   = Math.min(parseFloat(descuento_pct || 0), 100);
    const descMonto = parseFloat((subtotal * descPct / 100).toFixed(2));
    const total     = parseFloat((subtotal - descMonto).toFixed(2));
    const anticipoVal = Math.min(parseFloat(anticipo || 0), total);

    const folio = await generarFolioPedido(client);

    const pedidoQ = await client.query(`
      INSERT INTO pos_pedidos (
        folio, estatus,
        cliente_id, cliente_nombre, cliente_telefono,
        via_whatsapp, requiere_factura,
        subtotal, descuento_pct, descuento_monto, total, anticipo,
        descuento_config_id, descuento_autorizado_por,
        metodo_pago_anticipo, fecha_acordada, notas,
        creado_por_id, creado_por_nombre
      ) VALUES (
        $1, 'pendiente',
        $2, $3, $4,
        $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13,
        $14, $15, $16,
        $17, $18
      ) RETURNING id
    `, [
      folio,
      cliente_id || null, clienteNombre, cliente_telefono || null,
      !!via_whatsapp, !!requiere_factura,
      subtotal, descPct, descMonto, total, anticipoVal,
      descuento_config_id || null, descuento_autorizado_por || null,
      metodo_pago_anticipo || null,
      fecha_acordada || null, notas || null,
      creadoPorId, creadoPorNombre,
    ]);

    const pedidoId = pedidoQ.rows[0].id;

    // Insertar líneas de detalle
    for (const l of lineas) {
      await client.query(`
        INSERT INTO pos_pedidos_detalle
          (pedido_id, inventario_id, nombre_producto, sku, es_servicio, es_item_libre,
           cantidad, precio_unitario, descuento_linea_pct, descuento_linea_monto, subtotal_linea)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        pedidoId, l.inventario_id || null, l.nombre_producto, l.sku || null,
        !!l.es_servicio, !!l.es_item_libre,
        l.cantidad, l.precio_unitario,
        l.descuento_linea_pct, l.descuento_linea_monto, l.subtotal_linea,
      ]);
    }

    // Registrar en historial
    await registrarHistorial(client, pedidoId, null, 'pendiente', creadoPorId, creadoPorNombre, 'Pedido creado');

    // Crear registro de factura si se requiere y hay cliente registrado
    if (requiere_factura && cliente_id) {
      await crearFacturaEnTransaccion(client, {
        tipo_origen: 'pedido',
        pedido_id: pedidoId,
        cliente_id,
        subtotal: total,
        usuario_id: creadoPorId,
        usuario_nombre: creadoPorNombre,
        notas: notas || null,
      });
    }

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_CREADO',
      entidad: 'pos_pedidos', entidadId: folio,
      usuarioId: creadoPorId, usuarioNombre: creadoPorNombre,
      ip: getIp(req),
      detalle: { folio, total, cliente_nombre: clienteNombre, num_items: lineas.length },
    });

    return res.status(201).json(createResponse(true, pedidoCompleto, `Pedido ${folio} creado exitosamente`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createPedido:', err);
    return res.status(500).json(createErrorResponse('Error al crear pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/pedidos
// Listar pedidos con filtros
// ─────────────────────────────────────────────────────────────
async function listPedidos(req, res) {
  try {
    const {
      estatus, cliente_id, creado_por_id, tomado_por_id,
      folio, busqueda, fecha_inicio, fecha_fin,
      solo_activos,
      page = 1, limit = 18,
    } = req.query;

    const params = [];
    const where  = [];
    let p = 1;

    // Filtro por estatus único
    if (estatus) {
      where.push(`p.estatus = $${p}`); params.push(estatus); p++;
    } else if (solo_activos === 'true') {
      // Solo muestra pedidos activos (pendiente, en_proceso, terminado)
      where.push(`p.estatus IN ('pendiente','en_proceso','terminado')`);
    }

    if (cliente_id)    { where.push(`p.cliente_id = $${p}`);            params.push(parseInt(cliente_id)); p++; }
    if (creado_por_id) { where.push(`p.creado_por_id = $${p}`);         params.push(parseInt(creado_por_id)); p++; }
    if (tomado_por_id) { where.push(`p.tomado_por_id = $${p}`);         params.push(parseInt(tomado_por_id)); p++; }

    // Búsqueda general: folio o nombre de cliente
    if (busqueda) {
      where.push(`(p.folio ILIKE $${p} OR p.cliente_nombre ILIKE $${p})`);
      params.push(`%${busqueda}%`); p++;
    } else if (folio) {
      where.push(`p.folio ILIKE $${p}`); params.push(`%${folio}%`); p++;
    }

    if (fecha_inicio)  { where.push(`p.fecha_creacion >= $${p}`);       params.push(fecha_inicio);       p++; }
    if (fecha_fin)     { where.push(`p.fecha_creacion < ($${p}::date + interval '1 day')`); params.push(fecha_fin); p++; }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limitInt = parseInt(limit);
    const offset   = (parseInt(page) - 1) * limitInt;

    const [dataR, countR] = await Promise.all([
      query(`
        SELECT
          p.id, p.folio, p.estatus,
          p.cliente_id, p.cliente_nombre, p.cliente_telefono,
          p.via_whatsapp, p.requiere_factura,
          p.subtotal, p.descuento_pct, p.descuento_monto, p.total, p.anticipo,
          p.metodo_pago_anticipo, p.fecha_acordada, p.notas,
          p.creado_por_id, p.creado_por_nombre, p.fecha_creacion,
          p.tomado_por_id, p.tomado_por_nombre, p.fecha_tomado,
          p.terminado_por_id, p.terminado_por_nombre, p.fecha_terminado,
          p.entregado_por_id, p.entregado_por_nombre, p.fecha_entregado,
          p.venta_id, p.fecha_modificacion
        FROM pos_pedidos p
        ${whereStr}
        ORDER BY
          CASE p.estatus
            WHEN 'pendiente'   THEN 1
            WHEN 'en_proceso'  THEN 2
            WHEN 'terminado'   THEN 3
            WHEN 'finalizado'  THEN 4
            WHEN 'cancelado'   THEN 5
          END,
          p.fecha_creacion DESC
        LIMIT $${p} OFFSET $${p + 1}
      `, [...params, limitInt, offset]),
      query(`SELECT COUNT(*) FROM pos_pedidos p ${whereStr}`, params),
    ]);

    const total = parseInt(countR.rows[0].count);
    const pedidos = dataR.rows.map(r => ({
      ...r,
      subtotal:        parseFloat(r.subtotal),
      descuento_pct:   parseFloat(r.descuento_pct),
      descuento_monto: parseFloat(r.descuento_monto),
      total:           parseFloat(r.total),
      anticipo:        parseFloat(r.anticipo),
      saldo_pendiente: parseFloat((parseFloat(r.total) - parseFloat(r.anticipo)).toFixed(2)),
    }));

    return res.json(createPaginatedResponse(pedidos, parseInt(page), limitInt, total));
  } catch (err) {
    console.error('listPedidos:', err);
    return res.status(500).json(createErrorResponse('Error al obtener pedidos', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/pedidos/:id
// ─────────────────────────────────────────────────────────────
async function getPedidoById(req, res) {
  try {
    const pedido = await getPedidoDetalle(parseInt(req.params.id));
    if (!pedido) return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));
    return res.json(createResponse(true, pedido, 'Pedido obtenido'));
  } catch (err) {
    console.error('getPedidoById:', err);
    return res.status(500).json(createErrorResponse('Error al obtener pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/pedidos/:id/tomar
// pendiente → en_proceso (cualquier usuario autenticado)
// ─────────────────────────────────────────────────────────────
async function tomarPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoId = parseInt(req.params.id);
    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    const r = await client.query(
      `SELECT id, estatus FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    );
    if (r.rows.length === 0)
      return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const pedido = r.rows[0];
    if (pedido.estatus !== 'pendiente')
      return res.status(400).json(createErrorResponse(
        `Solo se puede tomar un pedido en estado "pendiente". Estado actual: ${pedido.estatus}`,
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    await client.query(`
      UPDATE pos_pedidos
      SET estatus = 'en_proceso',
          tomado_por_id    = $1,
          tomado_por_nombre = $2,
          fecha_tomado     = NOW(),
          fecha_modificacion = NOW()
      WHERE id = $3
    `, [usuarioId, usuarioNombre, pedidoId]);

    await registrarHistorial(client, pedidoId, 'pendiente', 'en_proceso', usuarioId, usuarioNombre,
      req.body?.notas || `Tomado por ${usuarioNombre}`);

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_TOMADO',
      entidad: 'pos_pedidos', entidadId: String(pedidoId),
      usuarioId, usuarioNombre,
      ip: getIp(req),
    });

    return res.json(createResponse(true, pedidoCompleto, 'Pedido tomado exitosamente'));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('tomarPedido:', err);
    return res.status(500).json(createErrorResponse('Error al tomar pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/pedidos/:id/terminar
// en_proceso → terminado (solo quien tomó el pedido)
// ─────────────────────────────────────────────────────────────
async function terminarPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoId = parseInt(req.params.id);
    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? parseInt(req.user.id) : null;

    const r = await client.query(
      `SELECT id, estatus, tomado_por_id FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    );
    if (r.rows.length === 0)
      return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const pedido = r.rows[0];
    if (pedido.estatus !== 'en_proceso')
      return res.status(400).json(createErrorResponse(
        `Solo se puede terminar un pedido en estado "en_proceso". Estado actual: ${pedido.estatus}`,
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    // Solo quien tomó el pedido puede marcarlo como terminado
    if (usuarioId && pedido.tomado_por_id && parseInt(pedido.tomado_por_id) !== usuarioId)
      return res.status(403).json(createErrorResponse(
        'Solo el empleado que tomó el pedido puede marcarlo como terminado',
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    await client.query(`
      UPDATE pos_pedidos
      SET estatus = 'terminado',
          terminado_por_id    = $1,
          terminado_por_nombre = $2,
          fecha_terminado     = NOW(),
          fecha_modificacion  = NOW()
      WHERE id = $3
    `, [usuarioId, usuarioNombre, pedidoId]);

    await registrarHistorial(client, pedidoId, 'en_proceso', 'terminado', usuarioId, usuarioNombre,
      req.body?.notas || `Terminado por ${usuarioNombre}`);

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_TERMINADO',
      entidad: 'pos_pedidos', entidadId: String(pedidoId),
      usuarioId, usuarioNombre,
      ip: getIp(req),
    });

    return res.json(createResponse(true, pedidoCompleto, 'Pedido marcado como terminado'));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('terminarPedido:', err);
    return res.status(500).json(createErrorResponse('Error al terminar pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/pedidos/:id/entregar
// terminado → finalizado + genera venta en pos_ventas
// Body: { metodo_pago_saldo, monto_recibido_saldo?, notas? }
// ─────────────────────────────────────────────────────────────
async function entregarPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoId = parseInt(req.params.id);
    const { metodo_pago_saldo, monto_recibido_saldo, notas, requiere_factura, cliente_factura_id } = req.body;

    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    if (!metodo_pago_saldo)
      return res.status(400).json(createErrorResponse('Método de pago del saldo requerido', CODIGOS_ERROR.DATOS_INVALIDOS));

    // Validar monto recibido cuando se paga en efectivo
    const pedidoR = await client.query(
      `SELECT * FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    );
    if (pedidoR.rows.length === 0)
      return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const pedido = pedidoR.rows[0];
    if (pedido.estatus !== 'terminado')
      return res.status(400).json(createErrorResponse(
        `Solo se puede entregar un pedido en estado "terminado". Estado actual: ${pedido.estatus}`,
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    // Validar que el monto recibido cubra el saldo cuando se paga en efectivo
    const totalNum   = parseFloat(pedido.total);
    const anticipoNum = parseFloat(pedido.anticipo);
    const saldoReq   = parseFloat((totalNum - anticipoNum).toFixed(2));

    if (saldoReq > 0) {
      const montoRec = parseFloat(monto_recibido_saldo);
      if (isNaN(montoRec) || montoRec < saldoReq)
        return res.status(400).json(createErrorResponse(
          `El monto recibido ($${montoRec || 0}) no cubre el saldo pendiente ($${saldoReq})`,
          CODIGOS_ERROR.DATOS_INVALIDOS
        ));
    }

    const detR = await client.query(
      'SELECT * FROM pos_pedidos_detalle WHERE pedido_id = $1', [pedidoId]
    );
    const lineas = detR.rows;

    // ── Generar la venta ───────────────────────────────────────
    const folio       = await generarFolioVenta(client);
    const total       = parseFloat(pedido.total);
    const anticipo    = parseFloat(pedido.anticipo);
    const saldo       = parseFloat((total - anticipo).toFixed(2));
    const montoRecibido = monto_recibido_saldo ? parseFloat(monto_recibido_saldo) : null;
    const cambio      = montoRecibido && saldo > 0 ? parseFloat((montoRecibido - saldo).toFixed(2)) : 0;

    // Método de pago: si hay anticipo + saldo, el código principal es el del saldo
    const metodoPagoCodigo = metodo_pago_saldo;
    const notasVenta = [
      notas,
      `Pedido: ${pedido.folio}`,
      anticipo > 0 ? `Anticipo recibido: $${anticipo.toFixed(2)} (${pedido.metodo_pago_anticipo || 'no especificado'})` : null,
    ].filter(Boolean).join(' | ');

    const ventaQ = await client.query(`
      INSERT INTO pos_ventas (
        folio, cliente_id, cliente_nombre,
        vendedor_usuario_id, vendedor_nombre,
        subtotal, descuento_pct, descuento_monto, total,
        monto_recibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion,
        descuento_config_id, descuento_autorizado_por,
        notas
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id
    `, [
      folio,
      pedido.cliente_id || null, pedido.cliente_nombre,
      usuarioId, usuarioNombre,
      parseFloat(pedido.subtotal), parseFloat(pedido.descuento_pct),
      parseFloat(pedido.descuento_monto), total,
      montoRecibido, cambio,
      metodoPagoCodigo, metodoPagoCodigo,
      pedido.descuento_config_id || null, pedido.descuento_autorizado_por || null,
      notasVenta,
    ]);

    const ventaId = ventaQ.rows[0].id;

    // Insertar detalle de venta y descontar inventario
    for (const linea of lineas) {
      const cantidad = parseFloat(linea.cantidad);

      await client.query(`
        INSERT INTO pos_ventas_detalle
          (venta_id, inventario_id, nombre_producto, sku, es_servicio, es_item_libre,
           cantidad, precio_unitario, descuento_linea_pct, descuento_linea_monto, subtotal_linea)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        ventaId, linea.inventario_id || null, linea.nombre_producto,
        linea.sku || null, linea.es_servicio, linea.es_item_libre,
        cantidad, parseFloat(linea.precio_unitario),
        parseFloat(linea.descuento_linea_pct), parseFloat(linea.descuento_linea_monto),
        parseFloat(linea.subtotal_linea),
      ]);

      // Descontar inventario (solo productos físicos)
      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id = $1 FOR UPDATE',
          [linea.inventario_id]
        );
        if (stockQ.rows.length > 0) {
          const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
          const saldoNuevo    = parseFloat((saldoAnterior - cantidad).toFixed(2));

          await client.query(
            'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
            [saldoNuevo, linea.inventario_id]
          );

          await client.query(`
            INSERT INTO inventarios_movimientos
              (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
               usuario_nombre, area_servicio, notas, venta_id)
            VALUES ($1,'salida','venta',$2,$3,$4,$5,'Punto de Venta (Pedido)',$6,$7)
          `, [
            linea.inventario_id, -cantidad, saldoAnterior, saldoNuevo,
            usuarioNombre, `Pedido: ${pedido.folio} → Venta: ${folio}`, ventaId,
          ]);
        }
      }
    }

    // Sistema de puntos
    if (pedido.cliente_id) {
      const puntosGanados = Math.floor(total / 10);
      const puntosQ = await client.query(`
        INSERT INTO pos_clientes_puntos (cliente_id, puntos_acumulados, total_comprado, fecha_ultima_compra)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (cliente_id) DO UPDATE SET
          puntos_acumulados = pos_clientes_puntos.puntos_acumulados + $2,
          total_comprado    = pos_clientes_puntos.total_comprado + $3,
          fecha_ultima_compra = NOW(),
          fecha_modificacion  = NOW()
        RETURNING puntos_acumulados, puntos_canjeados, total_comprado
      `, [pedido.cliente_id, puntosGanados, total]);

      const pr = puntosQ.rows[0];
      const nuevoNivel = calcularNivelCliente(parseFloat(pr.total_comprado));
      await client.query(
        'UPDATE pos_clientes_puntos SET nivel_cliente = $1 WHERE cliente_id = $2',
        [nuevoNivel, pedido.cliente_id]
      );

      const saldoPuntos = parseInt(pr.puntos_acumulados, 10) - parseInt(pr.puntos_canjeados, 10);
      await client.query(`
        INSERT INTO pos_clientes_puntos_movimientos
          (cliente_id, venta_id, tipo, puntos, saldo_puntos, notas)
        VALUES ($1,$2,'acumulado',$3,$4,$5)
      `, [
        pedido.cliente_id, ventaId, puntosGanados, saldoPuntos,
        `Pedido ${pedido.folio} → Venta ${folio} · $${total}`,
      ]);
    }

    // Actualizar pedido a finalizado
    await client.query(`
      UPDATE pos_pedidos
      SET estatus = 'finalizado',
          entregado_por_id    = $1,
          entregado_por_nombre = $2,
          fecha_entregado     = NOW(),
          metodo_pago_saldo   = $3,
          monto_recibido_saldo = $4,
          venta_id            = $5,
          fecha_modificacion  = NOW()
      WHERE id = $6
    `, [usuarioId, usuarioNombre, metodo_pago_saldo, montoRecibido || null, ventaId, pedidoId]);

    await registrarHistorial(client, pedidoId, 'terminado', 'finalizado', usuarioId, usuarioNombre,
      `Entregado. Venta generada: ${folio}`);

    // Crear registro de factura si se solicita
    const clienteParaFactura = parseInt(cliente_factura_id) || pedido.cliente_id || null;
    if (requiere_factura && clienteParaFactura) {
      await crearFacturaEnTransaccion(client, {
        tipo_origen: 'venta',
        venta_id: ventaId,
        cliente_id: clienteParaFactura,
        subtotal: total,
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        notas: `Pedido: ${pedido.folio}`,
      });
    }

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_ENTREGADO',
      entidad: 'pos_pedidos', entidadId: pedido.folio,
      usuarioId, usuarioNombre,
      ip: getIp(req),
      detalle: { folio_pedido: pedido.folio, folio_venta: folio, venta_id: ventaId, total: parseFloat(pedido.total) },
    });

    return res.json(createResponse(true, { pedido: pedidoCompleto, venta_folio: folio, venta_id: ventaId },
      `Pedido entregado. Venta ${folio} generada.`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('entregarPedido:', err);
    return res.status(500).json(createErrorResponse(
      err.message || 'Error al entregar pedido', CODIGOS_ERROR.ERROR_SERVIDOR
    ));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/pedidos/:id/cancelar
// Cualquier estado → cancelado (admin/supervisor)
// Body: { motivo? }
// ─────────────────────────────────────────────────────────────
async function cancelarPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoId = parseInt(req.params.id);
    const { motivo } = req.body;
    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    const r = await client.query(
      `SELECT id, estatus FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    );
    if (r.rows.length === 0)
      return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const pedido = r.rows[0];
    if (pedido.estatus === 'cancelado')
      return res.status(400).json(createErrorResponse('El pedido ya está cancelado', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (pedido.estatus === 'finalizado')
      return res.status(400).json(createErrorResponse('No se puede cancelar un pedido ya finalizado', CODIGOS_ERROR.DATOS_INVALIDOS));

    const estatusAnterior = pedido.estatus;
    await client.query(`
      UPDATE pos_pedidos
      SET estatus = 'cancelado',
          motivo_cancelacion = $1,
          fecha_modificacion = NOW()
      WHERE id = $2
    `, [motivo || null, pedidoId]);

    await registrarHistorial(client, pedidoId, estatusAnterior, 'cancelado', usuarioId, usuarioNombre, motivo || null);

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_CANCELADO',
      entidad: 'pos_pedidos', entidadId: String(pedidoId),
      usuarioId, usuarioNombre,
      ip: getIp(req),
      detalle: { estatus_anterior: estatusAnterior, motivo: motivo || null },
    });

    return res.json(createResponse(true, pedidoCompleto, 'Pedido cancelado'));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('cancelarPedido:', err);
    return res.status(500).json(createErrorResponse('Error al cancelar pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/pedidos/stats
// Contadores por estatus (para badge en la UI)
// ─────────────────────────────────────────────────────────────
async function getStatsPedidos(req, res) {
  try {
    const r = await query(`
      SELECT
        COUNT(*) FILTER (WHERE estatus = 'pendiente')  AS pendiente,
        COUNT(*) FILTER (WHERE estatus = 'en_proceso') AS en_proceso,
        COUNT(*) FILTER (WHERE estatus = 'terminado')  AS terminado,
        COUNT(*) FILTER (WHERE estatus = 'finalizado'
          AND DATE(fecha_entregado) = CURRENT_DATE)    AS finalizados_hoy
      FROM pos_pedidos
      WHERE estatus NOT IN ('cancelado','finalizado')
         OR (estatus = 'finalizado' AND DATE(fecha_entregado) = CURRENT_DATE)
    `);
    const counts = r.rows[0];
    const activos = parseInt(counts.pendiente) + parseInt(counts.en_proceso) + parseInt(counts.terminado);
    return res.json(createResponse(true, {
      pendiente:      parseInt(counts.pendiente),
      en_proceso:     parseInt(counts.en_proceso),
      terminado:      parseInt(counts.terminado),
      finalizados_hoy: parseInt(counts.finalizados_hoy),
      activos,
    }, 'Stats de pedidos'));
  } catch (err) {
    console.error('getStatsPedidos:', err);
    return res.status(500).json(createErrorResponse('Error al obtener stats', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

module.exports = {
  createPedido,
  listPedidos,
  getPedidoById,
  tomarPedido,
  terminarPedido,
  entregarPedido,
  cancelarPedido,
  getStatsPedidos,
};
