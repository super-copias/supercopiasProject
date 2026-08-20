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
const { crearFacturaEnTransaccion, leerTasas } = require('./facturasController');
const { registrarBitacora, getIp } = require('../utils/bitacora');

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────

const TIME_ZONE_MX = 'America/Mexico_City';

function calcularTotalFacturaConTasas(totalBase, requiereFactura, tipoPersonaFactura, tasas) {
  const totalNum = parseFloat(totalBase || 0);
  if (!requiereFactura || !tasas) return parseFloat(totalNum.toFixed(2));

  const ivaMonto = parseFloat((totalNum * (tasas.iva_pct || 0)).toFixed(2));
  const isrMonto = tipoPersonaFactura === 'pf'
    ? 0
    : parseFloat((totalNum * (tasas.isr_pct || 0)).toFixed(2));

  return parseFloat((totalNum + ivaMonto - isrMonto).toFixed(2));
}

function calcularSaldoPendientePedido(pedido, tasas) {
  const totalBase = parseFloat(pedido.total || 0);
  const anticipo = parseFloat(pedido.anticipo || 0);
  const totalReferencia = calcularTotalFacturaConTasas(
    totalBase,
    !!pedido.requiere_factura,
    pedido.tipo_persona_factura || 'pm',
    tasas
  );
  return parseFloat(Math.max(0, totalReferencia - anticipo).toFixed(2));
}

function parseFechaAcordadaMX(fechaAcordada) {
  if (!fechaAcordada) return null;

  const [fecha, hora = '00:00:00'] = String(fechaAcordada).split('T');
  if (!fecha || !hora) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos, segundos = '0'] = hora.split(':').map(Number);
  if ([anio, mes, dia, horas, minutos, segundos].some(Number.isNaN)) return null;

  const utcGuess = Date.UTC(anio, mes - 1, dia, horas, minutos, segundos);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE_MX,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(utcGuess)).map((part) => [part.type, part.value])
  );

  // Algunos runtimes pueden devolver hour=24 para medianoche; normalizar evita desfases de fecha.
  const hourNormalized = Number(parts.hour) === 24 ? 0 : Number(parts.hour);

  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hourNormalized,
    Number(parts.minute),
    Number(parts.second)
  );

  const offset = zonedAsUtc - utcGuess;
  return new Date(utcGuess - offset);
}

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

  const tasas = pedido.requiere_factura ? await leerTasas() : null;

  return {
    ...pedido,
    subtotal:       parseFloat(pedido.subtotal),
    descuento_pct:  parseFloat(pedido.descuento_pct),
    descuento_monto: parseFloat(pedido.descuento_monto),
    total:          parseFloat(pedido.total),
    anticipo:       parseFloat(pedido.anticipo),
    saldo_pendiente: calcularSaldoPendientePedido(pedido, tasas),
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
      tipo_persona_factura = 'pm',
      items,
      descuento_pct = 0,
      descuento_config_id,
      descuento_autorizado_por,
      anticipo = 0,
      pagos_anticipo,               // nuevo: array [{ codigo, monto, monto_recibido? }]
      metodo_pago_anticipo,         // backward compat
      fecha_acordada,
      notas,
      cotizacion_id,
    } = req.body;

    const cotizacionIdVal = cotizacion_id ? parseInt(cotizacion_id, 10) : null;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json(createErrorResponse('Debe incluir al menos un producto', CODIGOS_ERROR.DATOS_INVALIDOS));

    if (!fecha_acordada)
      return res.status(400).json(createErrorResponse('La fecha de entrega es obligatoria', CODIGOS_ERROR.DATOS_INVALIDOS));

    const fechaEntregaMX = parseFechaAcordadaMX(fecha_acordada);
    if (!fechaEntregaMX || fechaEntregaMX <= new Date())
      return res.status(400).json(createErrorResponse('La fecha de entrega no puede ser menor o igual a la fecha y hora actual', CODIGOS_ERROR.DATOS_INVALIDOS));

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
    const tasasFactura = requiere_factura ? await leerTasas() : null;
    const totalReferenciaAnticipo = calcularTotalFacturaConTasas(
      total,
      !!requiere_factura,
      tipo_persona_factura || 'pm',
      tasasFactura
    );
    const anticipoVal = Math.min(parseFloat(anticipo || 0), totalReferenciaAnticipo);

    // Normalizar pagos_anticipo
    const _CODIGOS_PED = ['efectivo','tarjeta_debito','tarjeta_credito','transferencia'];
    const _LABEL_PED   = { efectivo:'Efectivo', tarjeta_debito:'Tarjeta Débito', tarjeta_credito:'Tarjeta Crédito', transferencia:'Transferencia' };
    const pagosAnticipo = Array.isArray(pagos_anticipo) && pagos_anticipo.length > 0
      ? pagos_anticipo
      : (metodo_pago_anticipo && anticipoVal > 0 ? [{ codigo: metodo_pago_anticipo, monto: anticipoVal }] : []);
    const primerMetodoAnticipo = pagosAnticipo.length > 0 ? pagosAnticipo[0].codigo : (metodo_pago_anticipo || null);

    // ── Validar stock disponible para productos físicos ───────────────
    // Se valida con FOR UPDATE dentro de la transacción para evitar
    // condiciones de carrera con otras operaciones concurrentes.
    const lineasConInventario = lineas.filter(l => l.inventario_id && !l.es_servicio && !l.es_item_libre);
    const reservasStock = []; // almacena { inventario_id, nombre, saldoAnterior, cantidad }
    for (const l of lineasConInventario) {
      const stockQ = await client.query(
        'SELECT id, nombre, existencia_actual FROM inventarios WHERE id = $1 AND activo = true FOR UPDATE',
        [l.inventario_id]
      );
      if (stockQ.rows.length === 0) continue;
      const disponible = parseFloat(stockQ.rows[0].existencia_actual);
      if (disponible < l.cantidad) {
        const err = new Error(
          `Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${disponible}, requerido ${l.cantidad}`
        );
        err.statusCode = 400;
        err.errorCode  = CODIGOS_ERROR.DATOS_INVALIDOS;
        throw err;
      }
      reservasStock.push({
        inventario_id: l.inventario_id,
        nombre:        stockQ.rows[0].nombre,
        saldoAnterior: disponible,
        cantidad:      l.cantidad,
      });
    }

    const folio = await generarFolioPedido(client);

    const pedidoQ = await client.query(`
      INSERT INTO pos_pedidos (
        folio, estatus,
        cliente_id, cliente_nombre, cliente_telefono,
        via_whatsapp, requiere_factura, tipo_persona_factura,
        subtotal, descuento_pct, descuento_monto, total, anticipo,
        descuento_config_id, descuento_autorizado_por,
        metodo_pago_anticipo, fecha_acordada, notas,
        creado_por_id, creado_por_nombre, cotizacion_id
      ) VALUES (
        $1, 'pendiente',
        $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14,
        $15, $16, $17,
        $18, $19, $20
      ) RETURNING id
    `, [
      folio,
      cliente_id || null, clienteNombre, cliente_telefono || null,
      !!via_whatsapp, !!requiere_factura, tipo_persona_factura || 'pm',
      subtotal, descPct, descMonto, total, anticipoVal,
      descuento_config_id || null, descuento_autorizado_por || null,
      primerMetodoAnticipo || null,
      fecha_acordada || null, notas || null,
      creadoPorId, creadoPorNombre,
      cotizacionIdVal,
    ]);

    const pedidoId = pedidoQ.rows[0].id;

    // Registrar pagos del anticipo (si aplica)
    if (pagosAnticipo.length > 0 && anticipoVal > 0) {
      let montoRestanteAnticipo = anticipoVal;
      for (let _pi = 0; _pi < pagosAnticipo.length && _pi < 2; _pi++) {
        const _p = pagosAnticipo[_pi];
        const _monto = _pi < pagosAnticipo.length - 1
          ? Math.min(parseFloat(_p.monto) || 0, montoRestanteAnticipo)
          : montoRestanteAnticipo;
        if (_monto <= 0) continue;
        const _montoRec = (_p.codigo === 'efectivo' && _p.monto_recibido) ? parseFloat(_p.monto_recibido) : null;
        await client.query(
          `INSERT INTO pos_pedidos_pagos (pedido_id, tipo, orden, metodo_pago_codigo, metodo_pago_descripcion, monto, monto_recibido, cambio)
           VALUES ($1, 'anticipo', $2, $3, $4, $5, $6, $7)`,
          [pedidoId, _pi + 1, _p.codigo, _LABEL_PED[_p.codigo] || _p.codigo, _monto, _montoRec,
           _montoRec != null ? parseFloat((_montoRec - _monto).toFixed(2)) : 0]
        );
        montoRestanteAnticipo = parseFloat((montoRestanteAnticipo - _monto).toFixed(2));
      }
    }

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

    // ── Descontar stock (reserva / apartado) ─────────────────────────
    for (const r of reservasStock) {
      const saldoNuevo = parseFloat((r.saldoAnterior - r.cantidad).toFixed(2));

      await client.query(
        'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
        [saldoNuevo, r.inventario_id]
      );

      await client.query(`
        INSERT INTO inventarios_movimientos
          (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
           usuario_nombre, area_servicio, notas, pedido_id)
        VALUES ($1, 'salida', 'apartado_pedido', $2, $3, $4, $5, 'Punto de Venta (Pedido)', $6, $7)
      `, [
        r.inventario_id, -r.cantidad, r.saldoAnterior, saldoNuevo,
        creadoPorNombre, `Pedido apartado: ${folio}`, pedidoId,
      ]);
    }

    // Registrar en historial
    await registrarHistorial(client, pedidoId, null, 'pendiente', creadoPorId, creadoPorNombre, 'Pedido creado');

    // Si el pedido proviene de una cotización, marcarla como aceptada
    if (cotizacionIdVal) {
      await client.query(
        `UPDATE pos_cotizaciones
            SET estatus = 'aceptada', fecha_modificacion = NOW()
          WHERE id = $1 AND estatus = 'pendiente'`,
        [cotizacionIdVal]
      );
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
    if (err.statusCode === 400) {
      return res.status(400).json(createErrorResponse(err.message, err.errorCode));
    }
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
      solo_activos, solo_atrasados,
      page = 1, limit = 18,
    } = req.query;

    const params = [];
    const where  = [];
    let p = 1;

    // Filtro por estatus único
    if (estatus) {
      where.push(`p.estatus = $${p}`); params.push(estatus); p++;
    } else if (solo_atrasados === 'true') {
      // Pedidos con fecha de entrega vencida que aún no han terminado/finalizado/cancelado
      where.push(`p.estatus IN ('pendiente','en_proceso') AND p.fecha_acordada < NOW()`);
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
          p.via_whatsapp, p.requiere_factura, p.tipo_persona_factura,
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
    const requiereTasas = dataR.rows.some((r) => !!r.requiere_factura);
    const tasas = requiereTasas ? await leerTasas() : null;
    const pedidos = dataR.rows.map(r => ({
      ...r,
      subtotal:        parseFloat(r.subtotal),
      descuento_pct:   parseFloat(r.descuento_pct),
      descuento_monto: parseFloat(r.descuento_monto),
      total:           parseFloat(r.total),
      anticipo:        parseFloat(r.anticipo),
      saldo_pendiente: calcularSaldoPendientePedido(r, tasas),
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
// en_proceso → terminado (cualquier usuario autenticado)
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
    const {
      pagos_saldo,                    // nuevo: array [{ codigo, monto, monto_recibido? }]
      metodo_pago_saldo,              // backward compat
      monto_recibido_saldo,           // backward compat
      notas, requiere_factura, cliente_factura_id, tipo_persona_factura = 'pm'
    } = req.body;

    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    const _CODIGOS_ENT = ['efectivo','tarjeta_debito','tarjeta_credito','transferencia'];
    const _LABEL_ENT   = { efectivo:'Efectivo', tarjeta_debito:'Tarjeta Débito', tarjeta_credito:'Tarjeta Crédito', transferencia:'Transferencia' };

    // Normalizar pagos_saldo
    const pagosInputS = Array.isArray(pagos_saldo) && pagos_saldo.length > 0
      ? pagos_saldo
      : (metodo_pago_saldo ? [{ codigo: metodo_pago_saldo, monto: null, monto_recibido: monto_recibido_saldo }] : null);

    if (!pagosInputS || pagosInputS.length === 0)
      return res.status(400).json(createErrorResponse('Método de pago del saldo requerido', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (pagosInputS.length > 2)
      return res.status(400).json(createErrorResponse('Máximo 2 métodos de pago por transacción', CODIGOS_ERROR.DATOS_INVALIDOS));
    for (const _p of pagosInputS) {
      if (!_CODIGOS_ENT.includes(_p.codigo))
        return res.status(400).json(createErrorResponse(`Código de pago inválido: ${_p.codigo}`, CODIGOS_ERROR.DATOS_INVALIDOS));
    }

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
    const totalNum    = parseFloat(pedido.total);
    const anticipoNum = parseFloat(pedido.anticipo);
    const saldoReq    = calcularSaldoPendientePedido(pedido, null);

    // La intención de factura puede cambiar al entregar; el valor del body tiene prioridad sobre el del pedido
    const rfacturaEnt      = requiere_factura !== undefined ? !!requiere_factura : !!(pedido.requiere_factura);
    const tipoPersonaEnt   = (['pf', 'pm'].includes(tipo_persona_factura) ? tipo_persona_factura : null)
                              || pedido.tipo_persona_factura
                              || 'pm';
    let saldoACobrar = Math.max(0, saldoReq);
    let ivaMonto = 0, isrMonto = 0;
    if (rfacturaEnt) {
      const tasas = await leerTasas();
      // Impuestos sobre el total completo (para registrar en la venta)
      ivaMonto = parseFloat((totalNum * tasas.iva_pct).toFixed(2));
      isrMonto = tipoPersonaEnt === 'pf' ? 0 : parseFloat((totalNum * tasas.isr_pct).toFixed(2));

      // Monto a cobrar al entregar: total facturado completo menos anticipo ya recibido.
      // Esto evita subcobro cuando el anticipo se tomó antes y los impuestos se calculan al facturar.
      const totalFactura = calcularTotalFacturaConTasas(totalNum, true, tipoPersonaEnt, tasas);
      saldoACobrar = parseFloat(Math.max(0, totalFactura - anticipoNum).toFixed(2));
    }

    // Procesar pagosInputS
    const pagosFinalesS = pagosInputS.map((p) => {
      const monto = (p.monto != null && parseFloat(p.monto) > 0)
        ? parseFloat(parseFloat(p.monto).toFixed(2))
        : (pagosInputS.length === 1 ? saldoACobrar : 0);
      const montoRec = (p.codigo === 'efectivo' && p.monto_recibido != null)
        ? parseFloat(p.monto_recibido) : null;
      return {
        codigo:         p.codigo,
        descripcion:    _LABEL_ENT[p.codigo] || p.codigo,
        monto,
        monto_recibido: montoRec,
        cambio:         montoRec != null ? parseFloat((montoRec - monto).toFixed(2)) : 0,
      };
    });
    if (pagosFinalesS.length === 1) pagosFinalesS[0].monto = saldoACobrar;
    if (pagosFinalesS.length === 2) {
      // Auto-calcular 2do monto si el frontend lo envió null
      if (pagosFinalesS[1].monto === 0 && pagosFinalesS[0].monto > 0)
        pagosFinalesS[1].monto = parseFloat((saldoACobrar - pagosFinalesS[0].monto).toFixed(2));
      const sumaS = parseFloat((pagosFinalesS[0].monto + pagosFinalesS[1].monto).toFixed(2));
      if (Math.abs(sumaS - saldoACobrar) > 0.02)
        return res.status(400).json(createErrorResponse(
          `Los pagos suman $${sumaS} pero el saldo a cobrar es $${saldoACobrar}`, CODIGOS_ERROR.DATOS_INVALIDOS));
    }
    // Validar que efectivo cubre su monto
    for (const _p of pagosFinalesS) {
      if (_p.codigo === 'efectivo' && _p.monto_recibido !== null && _p.monto_recibido < _p.monto)
        return res.status(400).json(createErrorResponse(
          `El monto recibido en efectivo ($${_p.monto_recibido}) no cubre $${_p.monto}`, CODIGOS_ERROR.DATOS_INVALIDOS));
    }

    const primerPagoS   = pagosFinalesS[0];
    const montoRecibido = primerPagoS.monto_recibido;
    const cambio        = primerPagoS.cambio;

    const detR = await client.query(
      'SELECT * FROM pos_pedidos_detalle WHERE pedido_id = $1', [pedidoId]
    );
    const lineas = detR.rows;

    // ── Generar la venta ───────────────────────────────────────
    const folio       = await generarFolioVenta(client);
    const total       = parseFloat(pedido.total);
    const anticipo    = parseFloat(pedido.anticipo);

    const notasVenta = [
      notas,
      `Pedido: ${pedido.folio}`,
      anticipo > 0 ? `Anticipo recibido: $${anticipo.toFixed(2)} (${pedido.metodo_pago_anticipo || 'no especificado'})` : null,
    ].filter(Boolean).join(' | ');

    const ventaQ = await client.query(`
      INSERT INTO pos_ventas (
        folio, fecha_venta, cliente_id, cliente_nombre,
        vendedor_usuario_id, vendedor_nombre,
        subtotal, descuento_pct, descuento_monto, total,
        monto_recibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion,
        descuento_config_id, descuento_autorizado_por,
        notas, requiere_factura, iva_monto, isr_monto, tipo_persona_factura, origen_venta,
        pedido_anticipo_monto, pedido_anticipo_metodo
      ) VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING id
    `, [
      folio,
      pedido.cliente_id || null, pedido.cliente_nombre,
      pedido.terminado_por_id || usuarioId, pedido.terminado_por_nombre || usuarioNombre,
      parseFloat(pedido.subtotal), parseFloat(pedido.descuento_pct),
      parseFloat(pedido.descuento_monto), total,
      montoRecibido, cambio,
      primerPagoS.codigo, primerPagoS.descripcion,
      pedido.descuento_config_id || null, pedido.descuento_autorizado_por || null,
      notasVenta, rfacturaEnt, ivaMonto, isrMonto, tipoPersonaEnt, 'pedido',
      anticipo > 0 ? anticipo : 0,
      anticipo > 0 ? (pedido.metodo_pago_anticipo || null) : null,
    ]);

    const ventaId = ventaQ.rows[0].id;

    // Registrar pagos del saldo en pos_ventas_pagos (omitir si monto es 0, ej. pedido totalmente cubierto por anticipo)
    for (let _pi = 0; _pi < pagosFinalesS.length; _pi++) {
      const _pago = pagosFinalesS[_pi];
      if (_pago.monto <= 0) continue;
      await client.query(
        `INSERT INTO pos_ventas_pagos (venta_id, orden, metodo_pago_codigo, metodo_pago_descripcion, monto, monto_recibido, cambio)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ventaId, _pi + 1, _pago.codigo, _pago.descripcion, _pago.monto, _pago.monto_recibido, _pago.cambio]
      );
    }

    // Registrar pagos del saldo en pos_pedidos_pagos (omitir si monto es 0)
    for (let _pi = 0; _pi < pagosFinalesS.length; _pi++) {
      const _pago = pagosFinalesS[_pi];
      if (_pago.monto <= 0) continue;
      await client.query(
        `INSERT INTO pos_pedidos_pagos (pedido_id, tipo, orden, metodo_pago_codigo, metodo_pago_descripcion, monto, monto_recibido, cambio)
         VALUES ($1, 'saldo', $2, $3, $4, $5, $6, $7)`,
        [pedidoId, _pi + 1, _pago.codigo, _pago.descripcion, _pago.monto, _pago.monto_recibido, _pago.cambio]
      );
    }

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

      // Confirmar salida de inventario (el stock fue descontado al crear el pedido,
      // aquí solo se registra el movimiento de auditoría de la venta generada)
      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id = $1',
          [linea.inventario_id]
        );
        if (stockQ.rows.length > 0) {
          const saldoActual = parseFloat(stockQ.rows[0].existencia_actual);

          await client.query(`
            INSERT INTO inventarios_movimientos
              (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
               usuario_nombre, area_servicio, notas, venta_id)
            VALUES ($1,'salida','venta',$2,$3,$3,$4,'Punto de Venta (Pedido)',$5,$6)
          `, [
            linea.inventario_id, -cantidad, saldoActual,
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
    `, [usuarioId, usuarioNombre, primerPagoS.codigo, montoRecibido || null, ventaId, pedidoId]);

    await registrarHistorial(client, pedidoId, 'terminado', 'finalizado', usuarioId, usuarioNombre,
      `Entregado. Venta generada: ${folio}`);

    // Crear registro de factura si se solicita
    const clienteParaFactura = parseInt(cliente_factura_id) || pedido.cliente_id || null;
    if (rfacturaEnt && clienteParaFactura) {
      // Si el pedido proviene de una cotización, el origen de la factura es la cotización
      const origenFactura = pedido.cotizacion_id ? 'cotizacion' : 'pedido';
      await crearFacturaEnTransaccion(client, {
        tipo_origen: origenFactura,
        pedido_id: pedidoId,
        cotizacion_id: pedido.cotizacion_id || null,
        venta_id: ventaId,
        cliente_id: clienteParaFactura,
        subtotal: total,
        tipo_persona: tipoPersonaEnt,
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
      `SELECT id, estatus, folio FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
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

    // ── Liberar stock reservado al cancelar ───────────────────────────
    const detCancelR = await client.query(
      `SELECT inventario_id, cantidad, nombre_producto
       FROM pos_pedidos_detalle
       WHERE pedido_id = $1
         AND es_servicio   = false
         AND es_item_libre = false
         AND inventario_id IS NOT NULL`,
      [pedidoId]
    );
    for (const linea of detCancelR.rows) {
      const cantidad = parseFloat(linea.cantidad);
      const stockQ = await client.query(
        'SELECT existencia_actual FROM inventarios WHERE id = $1 FOR UPDATE',
        [linea.inventario_id]
      );
      if (stockQ.rows.length === 0) continue;
      const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
      const saldoNuevo    = parseFloat((saldoAnterior + cantidad).toFixed(2));

      await client.query(
        'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
        [saldoNuevo, linea.inventario_id]
      );

      await client.query(`
        INSERT INTO inventarios_movimientos
          (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
           usuario_nombre, area_servicio, notas, pedido_id)
        VALUES ($1, 'entrada', 'liberacion_apartado', $2, $3, $4, $5, 'Punto de Venta (Pedido)', $6, $7)
      `, [
        linea.inventario_id, cantidad, saldoAnterior, saldoNuevo,
        usuarioNombre, `Pedido cancelado: ${pedido.folio}`, pedidoId,
      ]);
    }

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
// PATCH /api/pos/pedidos/:id/items
// Editar cantidades de líneas existentes en cualquier estado activo
// Body: { items: [{ detalle_id, cantidad }], notas? }
// ─────────────────────────────────────────────────────────────
async function actualizarItemsPedido(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pedidoId = parseInt(req.params.id);
    const {
      // Cambios de cantidad en líneas existentes (backward compat: también acepta `items`)
      items_cantidad,
      items = [],
      // IDs de líneas existentes a eliminar
      items_eliminar = [],
      // Nuevas líneas a agregar
      items_agregar  = [],
      notas,
      // Anticipo: undefined = sin cambio; number = nuevo monto (0 = quitar anticipo)
      anticipo: anticipoNuevoRaw,
      metodo_pago_anticipo: metodoAnticipoNuevo,
    } = req.body;

    const cantidadItems = Array.isArray(items_cantidad) ? items_cantidad : items;
    const hayAnticipoCambio = anticipoNuevoRaw !== undefined && anticipoNuevoRaw !== null;

    // Validación previa del anticipo
    const _CODIGOS_ANTICIPO = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia'];
    const _LABELS_ANTICIPO  = { efectivo: 'Efectivo', tarjeta_debito: 'Tarjeta Débito', tarjeta_credito: 'Tarjeta Crédito', transferencia: 'Transferencia' };
    if (hayAnticipoCambio) {
      const val = parseFloat(anticipoNuevoRaw);
      if (isNaN(val) || val < 0)
        return res.status(400).json(createErrorResponse(
          'El monto de anticipo debe ser un número mayor o igual a cero',
          CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      if (val > 0 && !_CODIGOS_ANTICIPO.includes(metodoAnticipoNuevo))
        return res.status(400).json(createErrorResponse(
          `Método de pago del anticipo inválido: ${metodoAnticipoNuevo}. Valores permitidos: ${_CODIGOS_ANTICIPO.join(', ')}`,
          CODIGOS_ERROR.DATOS_INVALIDOS
        ));
    }

    const hayAlgo = cantidadItems.length > 0 || items_eliminar.length > 0 || items_agregar.length > 0 || hayAnticipoCambio;
    if (!hayAlgo)
      return res.status(400).json(createErrorResponse('No se enviaron cambios', CODIGOS_ERROR.DATOS_INVALIDOS));

    const usuarioNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const usuarioId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    // Cargar pedido con lock
    const pedidoR = await client.query(
      `SELECT * FROM pos_pedidos WHERE id = $1 FOR UPDATE`, [pedidoId]
    );
    if (pedidoR.rows.length === 0)
      return res.status(404).json(createErrorResponse('Pedido no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    const pedido = pedidoR.rows[0];
    const ESTADOS_EDITABLES = ['pendiente', 'en_proceso', 'terminado'];
    if (!ESTADOS_EDITABLES.includes(pedido.estatus))
      return res.status(400).json(createErrorResponse(
        `No se puede editar un pedido en estado "${pedido.estatus}"`,
        CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    // Cargar líneas actuales
    const detalleR = await client.query(
      `SELECT * FROM pos_pedidos_detalle WHERE pedido_id = $1`, [pedidoId]
    );
    const detalleActual = detalleR.rows;

    // ── Validar items_eliminar ─────────────────────────────────
    const eliminarSet = new Set(items_eliminar.map(id => parseInt(id)));
    for (const id of eliminarSet) {
      if (!detalleActual.find(d => d.id === id))
        return res.status(400).json(createErrorResponse(
          `El ítem #${id} no pertenece a este pedido`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
    }

    // Verificar que no quede el pedido vacío
    const lineasTrasEliminar = detalleActual.filter(d => !eliminarSet.has(d.id));
    if (lineasTrasEliminar.length === 0 && items_agregar.length === 0)
      return res.status(400).json(createErrorResponse(
        'El pedido debe tener al menos un producto o servicio', CODIGOS_ERROR.DATOS_INVALIDOS
      ));

    // ── Validar cantidadItems ──────────────────────────────────
    const cantidadMap = new Map();
    for (const i of cantidadItems) {
      const detalleId = parseInt(i.detalle_id);
      const nuevaCantidad = parseFloat(i.cantidad);
      if (isNaN(nuevaCantidad) || nuevaCantidad <= 0)
        return res.status(400).json(createErrorResponse(
          `La cantidad del ítem #${detalleId} debe ser mayor a 0`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      if (!detalleActual.find(d => d.id === detalleId))
        return res.status(400).json(createErrorResponse(
          `El ítem #${detalleId} no pertenece a este pedido`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      if (eliminarSet.has(detalleId))
        return res.status(400).json(createErrorResponse(
          `El ítem #${detalleId} no puede modificarse y eliminarse al mismo tiempo`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      cantidadMap.set(detalleId, nuevaCantidad);
    }

    // ── Validar items_agregar ──────────────────────────────────
    for (const n of items_agregar) {
      if (!n.nombre_producto?.trim())
        return res.status(400).json(createErrorResponse(
          'Los ítems nuevos deben tener nombre', CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      if (isNaN(parseFloat(n.cantidad)) || parseFloat(n.cantidad) <= 0)
        return res.status(400).json(createErrorResponse(
          `Cantidad inválida para "${n.nombre_producto}"`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
      if (isNaN(parseFloat(n.precio_unitario)) || parseFloat(n.precio_unitario) < 0)
        return res.status(400).json(createErrorResponse(
          `Precio inválido para "${n.nombre_producto}"`, CODIGOS_ERROR.DATOS_INVALIDOS
        ));
    }

    // ── 1. Eliminar líneas y liberar stock ─────────────────────
    for (const detalleId of eliminarSet) {
      const linea = detalleActual.find(d => d.id === detalleId);
      if (!linea) continue;

      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const cantidad = parseFloat(linea.cantidad);
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id = $1 FOR UPDATE',
          [linea.inventario_id]
        );
        if (stockQ.rows.length > 0) {
          const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
          const saldoNuevo    = parseFloat((saldoAnterior + cantidad).toFixed(2));

          await client.query(
            'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
            [saldoNuevo, linea.inventario_id]
          );
          await client.query(`
            INSERT INTO inventarios_movimientos
              (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
               usuario_nombre, area_servicio, notas, pedido_id)
            VALUES ($1, 'entrada', 'liberacion_apartado', $2, $3, $4, $5,
                    'Punto de Venta (Pedido)', $6, $7)
          `, [
            linea.inventario_id, cantidad, saldoAnterior, saldoNuevo,
            usuarioNombre, `Ítem eliminado del pedido: ${pedido.folio}`, pedidoId,
          ]);
        }
      }
      await client.query(
        'DELETE FROM pos_pedidos_detalle WHERE id = $1 AND pedido_id = $2',
        [detalleId, pedidoId]
      );
    }

    // ── 2. Ajustar cantidades en líneas conservadas ────────────
    const subtotalesConservados = [];
    for (const linea of lineasTrasEliminar) {
      const nuevaCantidad    = cantidadMap.has(linea.id) ? cantidadMap.get(linea.id) : parseFloat(linea.cantidad);
      const cantidadAnterior = parseFloat(linea.cantidad);
      const delta = parseFloat((nuevaCantidad - cantidadAnterior).toFixed(6));

      if (Math.abs(delta) > 0.0001 && linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT id, nombre, existencia_actual FROM inventarios WHERE id = $1 AND activo = true FOR UPDATE',
          [linea.inventario_id]
        );
        if (stockQ.rows.length > 0) {
          const existenciaActual = parseFloat(stockQ.rows[0].existencia_actual);
          if (delta > 0 && existenciaActual < delta) {
            const err = new Error(
              `Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${existenciaActual}, adicional requerido ${delta}`
            );
            err.statusCode = 400; err.errorCode = CODIGOS_ERROR.DATOS_INVALIDOS;
            throw err;
          }
          const saldoAnterior = existenciaActual;
          const saldoNuevo    = parseFloat((existenciaActual - delta).toFixed(2));
          await client.query(
            'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
            [saldoNuevo, linea.inventario_id]
          );
          const tipoMov    = delta > 0 ? 'salida'  : 'entrada';
          const conceptoMov = delta > 0 ? 'apartado_pedido' : 'liberacion_apartado';
          const cantidadMov = parseFloat(Math.abs(delta).toFixed(6));
          await client.query(`
            INSERT INTO inventarios_movimientos
              (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
               usuario_nombre, area_servicio, notas, pedido_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Punto de Venta (Pedido)', $8, $9)
          `, [
            linea.inventario_id, tipoMov, conceptoMov,
            delta > 0 ? -cantidadMov : cantidadMov,
            saldoAnterior, saldoNuevo,
            usuarioNombre,
            `Pedido editado: ${pedido.folio} (${cantidadAnterior} → ${nuevaCantidad})`,
            pedidoId,
          ]);
        }
      }

      const precioUnit    = parseFloat(linea.precio_unitario);
      const descLinPct    = parseFloat(linea.descuento_linea_pct || 0);
      const descLinMonto  = parseFloat(((nuevaCantidad * precioUnit) * descLinPct / 100).toFixed(2));
      const subtotalLinea = parseFloat(((nuevaCantidad * precioUnit) - descLinMonto).toFixed(2));

      await client.query(`
        UPDATE pos_pedidos_detalle
        SET cantidad = $1, descuento_linea_monto = $2, subtotal_linea = $3
        WHERE id = $4 AND pedido_id = $5
      `, [nuevaCantidad, descLinMonto, subtotalLinea, linea.id, pedidoId]);

      subtotalesConservados.push(subtotalLinea);
    }

    // ── 3. Agregar nuevas líneas ───────────────────────────────
    const subtotalesNuevos = [];
    for (const n of items_agregar) {
      const cantidad    = parseFloat(n.cantidad);
      const precioUnit  = parseFloat(n.precio_unitario);
      const descLinPct  = parseFloat(n.descuento_linea_pct || 0);
      const descLinMonto  = parseFloat(((cantidad * precioUnit) * descLinPct / 100).toFixed(2));
      const subtotalLinea = parseFloat(((cantidad * precioUnit) - descLinMonto).toFixed(2));

      // Reservar stock para productos físicos
      if (n.inventario_id && !n.es_servicio && !n.es_item_libre) {
        const stockQ = await client.query(
          'SELECT id, nombre, existencia_actual FROM inventarios WHERE id = $1 AND activo = true FOR UPDATE',
          [n.inventario_id]
        );
        if (stockQ.rows.length > 0) {
          const disponible = parseFloat(stockQ.rows[0].existencia_actual);
          if (disponible < cantidad) {
            const err = new Error(
              `Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${disponible}, requerido ${cantidad}`
            );
            err.statusCode = 400; err.errorCode = CODIGOS_ERROR.DATOS_INVALIDOS;
            throw err;
          }
          const saldoAnterior = disponible;
          const saldoNuevo    = parseFloat((disponible - cantidad).toFixed(2));
          await client.query(
            'UPDATE inventarios SET existencia_actual = $1, fecha_modificacion = NOW() WHERE id = $2',
            [saldoNuevo, n.inventario_id]
          );
          await client.query(`
            INSERT INTO inventarios_movimientos
              (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo,
               usuario_nombre, area_servicio, notas, pedido_id)
            VALUES ($1, 'salida', 'apartado_pedido', $2, $3, $4, $5,
                    'Punto de Venta (Pedido)', $6, $7)
          `, [
            n.inventario_id, -cantidad, saldoAnterior, saldoNuevo,
            usuarioNombre, `Ítem agregado al pedido: ${pedido.folio}`, pedidoId,
          ]);
        }
      }

      await client.query(`
        INSERT INTO pos_pedidos_detalle
          (pedido_id, inventario_id, nombre_producto, sku, es_servicio, es_item_libre,
           cantidad, precio_unitario, descuento_linea_pct, descuento_linea_monto, subtotal_linea)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        pedidoId, n.inventario_id || null, n.nombre_producto.trim(), n.sku || null,
        !!n.es_servicio, !!n.es_item_libre,
        cantidad, precioUnit, descLinPct, descLinMonto, subtotalLinea,
      ]);

      subtotalesNuevos.push(subtotalLinea);
    }

    // ── 4. Recalcular totales del pedido ───────────────────────
    const nuevoSubtotal  = parseFloat(
      [...subtotalesConservados, ...subtotalesNuevos].reduce((s, v) => s + v, 0).toFixed(2)
    );
    const descPct        = parseFloat(pedido.descuento_pct || 0);
    const nuevoDescMonto = parseFloat((nuevoSubtotal * descPct / 100).toFixed(2));
    const nuevoTotal     = parseFloat((nuevoSubtotal - nuevoDescMonto).toFixed(2));

    // Anticipo efectivo: si viene cambio usamos el nuevo; si no, el original del pedido
    const anticipoOriginal    = parseFloat(pedido.anticipo || 0);
    const anticipoEfectivo    = hayAnticipoCambio ? (parseFloat(anticipoNuevoRaw) || 0) : anticipoOriginal;
    const metodoAnticipoFinal = hayAnticipoCambio
      ? (anticipoEfectivo > 0 ? (metodoAnticipoNuevo || null) : null)
      : pedido.metodo_pago_anticipo;

    const tasas = pedido.requiere_factura ? await leerTasas() : null;
    const totalRefNuevo = calcularTotalFacturaConTasas(
      nuevoTotal, !!pedido.requiere_factura, pedido.tipo_persona_factura || 'pm', tasas
    );
    if (anticipoEfectivo > totalRefNuevo + 0.01) {
      const etiqueta = hayAnticipoCambio ? 'El anticipo nuevo' : 'El anticipo ya cobrado';
      const err = new Error(
        `${etiqueta} ($${anticipoEfectivo.toFixed(2)}) supera el total${pedido.requiere_factura ? ' c/factura' : ''} ($${totalRefNuevo.toFixed(2)}).`
      );
      err.statusCode = 400; err.errorCode = CODIGOS_ERROR.DATOS_INVALIDOS;
      throw err;
    }

    await client.query(`
      UPDATE pos_pedidos
      SET subtotal = $1, descuento_monto = $2, total = $3, fecha_modificacion = NOW()
      WHERE id = $4
    `, [nuevoSubtotal, nuevoDescMonto, nuevoTotal, pedidoId]);

    // Actualizar anticipo si cambió
    if (hayAnticipoCambio) {
      await client.query(
        `UPDATE pos_pedidos SET anticipo = $1, metodo_pago_anticipo = $2, fecha_modificacion = NOW() WHERE id = $3`,
        [anticipoEfectivo, metodoAnticipoFinal, pedidoId]
      );

      const deltaAnticipo = parseFloat((anticipoEfectivo - anticipoOriginal).toFixed(2));

      if (anticipoEfectivo === 0) {
        // Anticipo eliminado: quitar todos los registros de pago
        await client.query(
          `DELETE FROM pos_pedidos_pagos WHERE pedido_id = $1 AND tipo = 'anticipo'`,
          [pedidoId]
        );
      } else if (deltaAnticipo > 0 && metodoAnticipoNuevo) {
        // Anticipo AUMENTÓ: solo registrar el delta con fecha de hoy.
        // Los pagos anteriores se conservan con sus fechas y métodos originales.
        const maxOrdenQ = await client.query(
          `SELECT COALESCE(MAX(orden), 0) AS max_orden
           FROM pos_pedidos_pagos WHERE pedido_id = $1 AND tipo = 'anticipo'`,
          [pedidoId]
        );
        const nextOrden = parseInt(maxOrdenQ.rows[0].max_orden) + 1;
        await client.query(
          `INSERT INTO pos_pedidos_pagos
             (pedido_id, tipo, orden, metodo_pago_codigo, metodo_pago_descripcion, monto, monto_recibido, cambio)
           VALUES ($1, 'anticipo', $2, $3, $4, $5, NULL, 0)`,
          [pedidoId, nextOrden, metodoAnticipoNuevo,
           _LABELS_ANTICIPO[metodoAnticipoNuevo] || metodoAnticipoNuevo,
           deltaAnticipo]
        );
      } else if (deltaAnticipo < 0) {
        // Anticipo REDUCIDO (caso excepcional): reemplazar todos los registros
        // con el nuevo monto total para mantener coherencia contable.
        await client.query(
          `DELETE FROM pos_pedidos_pagos WHERE pedido_id = $1 AND tipo = 'anticipo'`,
          [pedidoId]
        );
        if (anticipoEfectivo > 0 && metodoAnticipoFinal) {
          await client.query(
            `INSERT INTO pos_pedidos_pagos
               (pedido_id, tipo, orden, metodo_pago_codigo, metodo_pago_descripcion, monto, monto_recibido, cambio)
             VALUES ($1, 'anticipo', 1, $2, $3, $4, NULL, 0)`,
            [pedidoId, metodoAnticipoFinal,
             _LABELS_ANTICIPO[metodoAnticipoFinal] || metodoAnticipoFinal,
             anticipoEfectivo]
          );
        }
      }
      // Si delta === 0: el monto no cambió, no se altera el historial de pagos.
    }

    if (pedido.requiere_factura && tasas) {
      const ivaMonto  = parseFloat((nuevoTotal * tasas.iva_pct).toFixed(2));
      const isrMonto  = pedido.tipo_persona_factura === 'pf'
        ? 0
        : parseFloat((nuevoTotal * tasas.isr_pct).toFixed(2));
      const totalFact = parseFloat((nuevoTotal + ivaMonto - isrMonto).toFixed(2));
      await client.query(`
        UPDATE facturas
        SET subtotal = $1, iva_monto = $2, isr_monto = $3, total_factura = $4,
            fecha_modificacion = NOW()
        WHERE pedido_id = $5 AND estatus = 'pendiente'
      `, [nuevoTotal, ivaMonto, isrMonto, totalFact, pedidoId]);
    }

    // Resumen para historial
    const partes = [];
    if (items_eliminar.length > 0)  partes.push(`${items_eliminar.length} eliminado(s)`);
    if (items_agregar.length > 0)   partes.push(`${items_agregar.length} agregado(s)`);
    if (cantidadItems.length > 0)   partes.push(`${cantidadItems.length} cantidad(s) editada(s)`);
    if (hayAnticipoCambio) {
      if (anticipoEfectivo === 0 && anticipoOriginal > 0) {
        partes.push('anticipo eliminado');
      } else if (anticipoOriginal === 0 && anticipoEfectivo > 0) {
        partes.push(`anticipo agregado $${anticipoEfectivo.toFixed(2)}`);
      } else {
        partes.push(`anticipo $${anticipoOriginal.toFixed(2)} → $${anticipoEfectivo.toFixed(2)}`);
      }
    }
    const notasHist = `${partes.join(', ')}${notas ? `: ${notas}` : ''} — total: $${parseFloat(pedido.total).toFixed(2)} → $${nuevoTotal.toFixed(2)}`;

    await registrarHistorial(client, pedidoId, pedido.estatus, pedido.estatus,
      usuarioId, usuarioNombre, notasHist);

    await client.query('COMMIT');

    const pedidoCompleto = await getPedidoDetalle(pedidoId);

    registrarBitacora({
      modulo: 'pedidos', accion: 'PEDIDO_ITEMS_EDITADOS',
      entidad: 'pos_pedidos', entidadId: pedido.folio,
      usuarioId, usuarioNombre,
      ip: getIp(req),
      detalle: {
        folio: pedido.folio,
        total_anterior: parseFloat(pedido.total),
        total_nuevo: nuevoTotal,
        eliminados: items_eliminar.length,
        agregados: items_agregar.length,
        cantidades_editadas: cantidadItems.length,
        anticipo_anterior: hayAnticipoCambio ? anticipoOriginal : undefined,
        anticipo_nuevo:    hayAnticipoCambio ? anticipoEfectivo : undefined,
      },
    });

    return res.json(createResponse(true, pedidoCompleto, 'Pedido actualizado correctamente'));
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode === 400)
      return res.status(400).json(createErrorResponse(err.message, err.errorCode));
    console.error('actualizarItemsPedido:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar pedido', CODIGOS_ERROR.ERROR_SERVIDOR));
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
          AND (fecha_entregado AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date) AS finalizados_hoy
      FROM pos_pedidos
      WHERE estatus NOT IN ('cancelado','finalizado')
         OR (estatus = 'finalizado' AND (fecha_entregado AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date)
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
  actualizarItemsPedido,
};
