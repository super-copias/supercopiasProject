/**
 * Controlador Punto de Venta (POS) - SuperCopias
 * Base URL: /api/pos
 *
 * Funciones:
 *   getCatalogo         - Productos/servicios disponibles en POS
 *   createVenta         - Crear venta + descontar inventario (transacción atómica)
 *   listVentas          - Historial de ventas con filtros
 *   getVentaById        - Detalle de una venta (para reimpresión)
 *   cancelarVenta       - Cancelar venta y revertir inventario
 *   getStatsHoy         - Estadísticas del día para dashboard cajero
 *   getDescuentos       - Catálogo de descuentos activos
 *   getPuntosByCliente  - Puntos y nivel del cliente
 */

const { query, getClient, pool: getPool } = require('../config/database');
const {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function calcularNivelCliente(totalComprado) {
  if (totalComprado >= 5000) return 'vip';
  if (totalComprado >= 1000) return 'frecuente';
  return 'estandar';
}

function calcularPuntosPorVenta(total) {
  // 1 punto por cada $10 MXN
  return Math.floor(total / 10);
}

async function generarFolio(client) {
  const anio = new Date().getFullYear();
  // Cuenta cuántas ventas existen en el año actual y genera el siguiente consecutivo.
  // Reinicia automáticamente cada año y soporta cualquier volumen.
  const r = await client.query(
    `SELECT COUNT(*) + 1 AS siguiente
     FROM pos_ventas
     WHERE EXTRACT(YEAR FROM fecha_venta) = $1`,
    [anio]
  );
  const consecutivo = parseInt(r.rows[0].siguiente, 10);
  return `PV-${anio}-${String(consecutivo).padStart(5, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/catalogo
// Lista productos y servicios disponibles en POS con stock
// ─────────────────────────────────────────────────────────────
async function getCatalogo(req, res) {
  try {
    const { q, departamento_id } = req.query;

    let sql = `
      SELECT
        i.id,
        i.nombre,
        i.descripcion,
        i.tipo,
        i.es_servicio,
        i.codigo_sku AS sku,
        i.precio_venta,
        i.existencia_actual,
        i.unidad_medida,
        i.foto_url,
        d.nombre AS departamento_nombre,
        d.color  AS departamento_color,
        d.id     AS departamento_id,
        CASE
          WHEN i.es_servicio = true THEN 'servicio'
          WHEN i.existencia_actual <= 0 THEN 'sin_stock'
          WHEN i.stock_minimo > 0 AND i.existencia_actual < i.stock_minimo THEN 'critico'
          WHEN i.stock_minimo > 0 AND i.existencia_actual <= i.stock_minimo * 1.1 THEN 'bajo'
          ELSE 'ok'
        END AS nivel_stock
      FROM inventarios i
      LEFT JOIN inv_departamentos d ON d.id = i.departamento_id
      WHERE i.activo = true
        AND i.estatus = 'activo'
        AND i.disponible_en_pos = true
        AND i.precio_venta IS NOT NULL
        AND i.precio_venta > 0
    `;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (i.nombre ILIKE $${params.length} OR i.codigo_sku ILIKE $${params.length} OR i.descripcion ILIKE $${params.length})`;
    }
    if (departamento_id) {
      params.push(departamento_id);
      sql += ` AND i.departamento_id = $${params.length}`;
    }

    sql += ' ORDER BY d.orden ASC NULLS LAST, i.nombre ASC';

    const result = await query(sql, params);
    const items = result.rows.map(r => ({
      ...r,
      precio_venta: parseFloat(r.precio_venta),
      existencia_actual: parseFloat(r.existencia_actual),
    }));

    return res.json(createResponse(true, items, `${items.length} artículos disponibles`));
  } catch (err) {
    console.error('getCatalogo POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener catálogo POS', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/pos/ventas
// Crear una nueva venta (transacción atómica)
// Body: { cliente_id?, items[], metodo_pago_codigo, monto_recibido?,
//         descuento_pct?, descuento_config_id?, descuento_autorizado_por?,
//         notas? }
// items[]: { inventario_id?, nombre_producto, cantidad, precio_unitario,
//             descuento_linea_pct?, es_item_libre?, es_servicio? }
// ─────────────────────────────────────────────────────────────
async function createVenta(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      cliente_id,
      items,
      metodo_pago_codigo,
      metodo_pago_descripcion,
      monto_recibido,
      descuento_pct = 0,
      descuento_config_id,
      descuento_autorizado_por,
      notas,
    } = req.body;

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json(createErrorResponse('Debe incluir al menos un producto', CODIGOS_ERROR.DATOS_INVALIDOS));
    if (!metodo_pago_codigo)
      return res.status(400).json(createErrorResponse('Método de pago requerido', CODIGOS_ERROR.DATOS_INVALIDOS));

    const vendedorNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const vendedorId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    // Calcular totales
    let subtotal = 0;
    const lineasProcesadas = [];

    for (const item of items) {
      const cantidad   = parseFloat(item.cantidad);
      const descLinPct = parseFloat(item.descuento_linea_pct || 0);

      if (cantidad <= 0)
        throw new Error(`Línea inválida: ${item.nombre_producto}`);

      // Seguridad: para productos físicos del inventario, obtener precio y stock de la BD
      // El precio_unitario del frontend se ignora para estos ítems (previene manipulación)
      let precioUnit = parseFloat(item.precio_unitario);
      if (item.inventario_id && !item.es_servicio && !item.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual, nombre, precio_venta FROM inventarios WHERE id=$1 AND activo=true FOR UPDATE',
          [item.inventario_id]
        );
        if (stockQ.rows.length === 0)
          throw new Error(`Artículo no encontrado: ID ${item.inventario_id}`);
        const stock = parseFloat(stockQ.rows[0].existencia_actual);
        if (stock < cantidad)
          throw new Error(`Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${stock}, solicitado ${cantidad}`);

        const precioReal = parseFloat(stockQ.rows[0].precio_venta);
        if (!isNaN(precioReal) && precioReal >= 0) {
          // Detectar y registrar intento de manipulación de precio
          if (Math.abs(precioUnit - precioReal) > 0.001) {
            const usuarioId     = req.user?.id || null;
            const usuarioNombre = req.user?.nombre || req.user?.username || 'desconocido';
            const ip            = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'desconocida';
            const descripcion   = `Precio manipulado: enviado $${precioUnit} vs real $${precioReal} - producto "${stockQ.rows[0].nombre}" (ID: ${item.inventario_id})`;

            console.warn(`⚠️  ALERTA SEGURIDAD | ${new Date().toISOString()} | usuario: ${usuarioNombre} (ID:${usuarioId}) | IP: ${ip} | ${descripcion}`);

            // Registrar en BD de forma no bloqueante (fuera de la transacción principal)
            getPool().query(
              `INSERT INTO pos_alertas_seguridad (tipo, usuario_id, usuario_nombre, ip, detalle, descripcion)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [
                'PRECIO_MANIPULADO',
                usuarioId,
                usuarioNombre,
                ip,
                JSON.stringify({
                  inventario_id:   item.inventario_id,
                  nombre_producto: stockQ.rows[0].nombre,
                  precio_enviado:  precioUnit,
                  precio_real:     precioReal,
                  cantidad,
                }),
                descripcion,
              ]
            ).catch(err => console.error('Error guardando alerta seguridad:', err.message));
          }
          precioUnit = precioReal; // precio tomado de BD, no del frontend
        }
      }

      if (precioUnit < 0)
        throw new Error(`Precio inválido: ${item.nombre_producto}`);

      const descLinMonto  = parseFloat(((cantidad * precioUnit) * descLinPct / 100).toFixed(2));
      const subtotalLinea = parseFloat(((cantidad * precioUnit) - descLinMonto).toFixed(2));

      subtotal += subtotalLinea;
      lineasProcesadas.push({
        inventario_id:         item.inventario_id || null,
        nombre_producto:       item.nombre_producto,
        sku:                   item.sku || null,
        es_servicio:           !!item.es_servicio,
        es_item_libre:         !!item.es_item_libre,
        cantidad,
        precio_unitario:       precioUnit,
        descuento_linea_pct:   descLinPct,
        descuento_linea_monto: descLinMonto,
        subtotal_linea:        subtotalLinea,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const descPct   = Math.min(parseFloat(descuento_pct || 0), 100);
    const descMonto = parseFloat((subtotal * descPct / 100).toFixed(2));
    const total     = parseFloat((subtotal - descMonto).toFixed(2));
    const montoRecibido = monto_recibido ? parseFloat(monto_recibido) : null;
    const cambio    = montoRecibido ? parseFloat((montoRecibido - total).toFixed(2)) : 0;

    // Obtener datos cliente si aplica
    let clienteNombre = 'Público General';
    if (cliente_id) {
      const cliQ = await client.query(
        'SELECT COALESCE(nombre_comercial, razon_social) AS nombre FROM clientes WHERE id=$1 AND activo=true',
        [cliente_id]
      );
      if (cliQ.rows.length > 0) clienteNombre = cliQ.rows[0].nombre;
    }

    // Generar folio
    const folio = await generarFolio(client);

    // Insertar cabecera de venta
    const ventaQ = await client.query(`
      INSERT INTO pos_ventas (
        folio, cliente_id, cliente_nombre,
        vendedor_usuario_id, vendedor_nombre,
        subtotal, descuento_pct, descuento_monto, total,
        monto_recibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion,
        descuento_config_id, descuento_autorizado_por, notas
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [
      folio, cliente_id || null, clienteNombre,
      vendedorId, vendedorNombre,
      subtotal, descPct, descMonto, total,
      montoRecibido, cambio,
      metodo_pago_codigo, metodo_pago_descripcion || metodo_pago_codigo,
      descuento_config_id || null, descuento_autorizado_por || null, notas || null,
    ]);
    const venta = ventaQ.rows[0];
    const ventaId = venta.id;

    // Insertar detalle + movimientos de inventario
    for (const linea of lineasProcesadas) {
      await client.query(`
        INSERT INTO pos_ventas_detalle (
          venta_id, inventario_id, nombre_producto, sku,
          es_servicio, es_item_libre,
          cantidad, precio_unitario,
          descuento_linea_pct, descuento_linea_monto, subtotal_linea
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        ventaId, linea.inventario_id, linea.nombre_producto, linea.sku,
        linea.es_servicio, linea.es_item_libre,
        linea.cantidad, linea.precio_unitario,
        linea.descuento_linea_pct, linea.descuento_linea_monto, linea.subtotal_linea,
      ]);

      // Descontar inventario solo para productos físicos
      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id=$1 FOR UPDATE',
          [linea.inventario_id]
        );
        const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
        const saldoNuevo    = parseFloat((saldoAnterior - linea.cantidad).toFixed(2));

        await client.query(
          'UPDATE inventarios SET existencia_actual=$1, fecha_modificacion=NOW() WHERE id=$2',
          [saldoNuevo, linea.inventario_id]
        );

        await client.query(`
          INSERT INTO inventarios_movimientos (
            inventario_id, tipo_movimiento, concepto,
            cantidad, saldo_anterior, saldo_nuevo,
            usuario_nombre, area_servicio, notas, venta_id
          ) VALUES ($1,'salida','venta',$2,$3,$4,$5,'Punto de Venta',$6,$7)
        `, [
          linea.inventario_id,
          -linea.cantidad,
          saldoAnterior,
          saldoNuevo,
          vendedorNombre,
          `Folio POS: ${folio}`,
          ventaId,
        ]);
      }
    }

    // Sistema de puntos (solo clientes registrados)
    if (cliente_id) {
      const puntosGanados = calcularPuntosPorVenta(total);

      // Upsert puntos
      const puntosQ = await client.query(`
        INSERT INTO pos_clientes_puntos (cliente_id, puntos_acumulados, total_comprado, fecha_ultima_compra)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (cliente_id) DO UPDATE SET
          puntos_acumulados = pos_clientes_puntos.puntos_acumulados + $2,
          total_comprado    = pos_clientes_puntos.total_comprado + $3,
          fecha_ultima_compra = NOW(),
          fecha_modificacion  = NOW()
        RETURNING puntos_acumulados, puntos_canjeados, total_comprado
      `, [cliente_id, puntosGanados, total]);

      const pr = puntosQ.rows[0];
      const nuevoNivel = calcularNivelCliente(parseFloat(pr.total_comprado));

      await client.query(
        'UPDATE pos_clientes_puntos SET nivel_cliente=$1 WHERE cliente_id=$2',
        [nuevoNivel, cliente_id]
      );

      if (puntosGanados > 0) {
        const saldoPuntos = pr.puntos_acumulados - pr.puntos_canjeados;
        await client.query(`
          INSERT INTO pos_clientes_puntos_movimientos
            (cliente_id, venta_id, tipo, puntos, saldo_puntos, notas)
          VALUES ($1,$2,'acumulado',$3,$4,$5)
        `, [cliente_id, ventaId, puntosGanados, saldoPuntos, `Venta ${folio}`]);
      }
    }

    await client.query('COMMIT');

    // Retornar venta completa
    const ventaCompleta = await getVentaDetalle(ventaId);
    return res.status(201).json(createResponse(true, ventaCompleta, `Venta ${folio} registrada correctamente`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createVenta POS:', err);
    if (err.message.includes('Stock insuficiente') || err.message.includes('Línea inválida') || err.message.includes('no encontrado'))
      return res.status(400).json(createErrorResponse(err.message, CODIGOS_ERROR.DATOS_INVALIDOS));
    return res.status(500).json(createErrorResponse('Error al procesar la venta', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: obtener venta con detalle completo
// ─────────────────────────────────────────────────────────────
async function getVentaDetalle(ventaId) {
  const ventaQ = await query(`
    SELECT
      v.*,
      c.nombre_comercial AS cliente_nombre_comercial,
      c.rfc AS cliente_rfc,
      c.email AS cliente_email
    FROM pos_ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = $1
  `, [ventaId]);
  if (ventaQ.rows.length === 0) return null;
  const venta = ventaQ.rows[0];

  const detalleQ = await query(
    'SELECT * FROM pos_ventas_detalle WHERE venta_id=$1 ORDER BY id',
    [ventaId]
  );

  // Puntos del cliente
  let puntoCliente = null;
  if (venta.cliente_id) {
    const pQ = await query(
      'SELECT puntos_acumulados, puntos_disponibles, nivel_cliente FROM pos_clientes_puntos WHERE cliente_id=$1',
      [venta.cliente_id]
    );
    if (pQ.rows.length > 0) puntoCliente = pQ.rows[0];
  }

  return {
    ...venta,
    subtotal:       parseFloat(venta.subtotal),
    descuento_pct:  parseFloat(venta.descuento_pct),
    descuento_monto: parseFloat(venta.descuento_monto),
    total:          parseFloat(venta.total),
    monto_recibido: venta.monto_recibido ? parseFloat(venta.monto_recibido) : null,
    cambio:         parseFloat(venta.cambio),
    detalle:        detalleQ.rows.map(d => ({
      ...d,
      cantidad:             parseFloat(d.cantidad),
      precio_unitario:      parseFloat(d.precio_unitario),
      descuento_linea_pct:  parseFloat(d.descuento_linea_pct),
      descuento_linea_monto: parseFloat(d.descuento_linea_monto),
      subtotal_linea:       parseFloat(d.subtotal_linea),
    })),
    puntos_cliente: puntoCliente,
  };
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/ventas
// ─────────────────────────────────────────────────────────────
async function listVentas(req, res) {
  try {
    const {
      fecha_inicio, fecha_fin, cliente_id, vendedor_id,
      estatus, page = 1, limit = 25,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (fecha_inicio) { params.push(fecha_inicio); where += ` AND v.fecha_venta >= $${params.length}::date`; }
    if (fecha_fin)    { params.push(fecha_fin);    where += ` AND v.fecha_venta < ($${params.length}::date + interval '1 day')`; }
    if (cliente_id)   { params.push(cliente_id);   where += ` AND v.cliente_id = $${params.length}`; }
    if (vendedor_id)  { params.push(vendedor_id);  where += ` AND v.vendedor_usuario_id = $${params.length}`; }
    if (estatus)      { params.push(estatus);      where += ` AND v.estatus = $${params.length}`; }

    const totalQ = await query(`SELECT COUNT(*) FROM pos_ventas v ${where}`, params);
    const total  = parseInt(totalQ.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);
    const sql = `
      SELECT
        v.id, v.folio, v.fecha_venta, v.cliente_id, v.cliente_nombre,
        v.vendedor_nombre, v.subtotal, v.descuento_pct, v.descuento_monto,
        v.total, v.metodo_pago_codigo, v.metodo_pago_descripcion,
        v.estatus, v.ticket_generado,
        (SELECT COUNT(*) FROM pos_ventas_detalle d WHERE d.venta_id = v.id) AS num_items
      FROM pos_ventas v
      ${where}
      ORDER BY v.fecha_venta DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await query(sql, params);
    const ventas = result.rows.map(v => ({
      ...v,
      subtotal:        parseFloat(v.subtotal),
      descuento_pct:   parseFloat(v.descuento_pct),
      descuento_monto: parseFloat(v.descuento_monto),
      total:           parseFloat(v.total),
      num_items:       parseInt(v.num_items),
    }));

    return res.json(createPaginatedResponse(ventas, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit)),
    }, 'Ventas obtenidas'));
  } catch (err) {
    console.error('listVentas POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener ventas', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/ventas/:id
// ─────────────────────────────────────────────────────────────
async function getVentaById(req, res) {
  try {
    const venta = await getVentaDetalle(parseInt(req.params.id));
    if (!venta) return res.status(404).json(createErrorResponse('Venta no encontrada', CODIGOS_ERROR.NO_ENCONTRADO));
    return res.json(createResponse(true, venta, 'Venta obtenida'));
  } catch (err) {
    console.error('getVentaById POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener venta', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/ventas/:id/cancelar
// ─────────────────────────────────────────────────────────────
async function cancelarVenta(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ventaId = parseInt(req.params.id);
    const { motivo } = req.body;

    const ventaQ = await client.query(
      'SELECT * FROM pos_ventas WHERE id=$1 FOR UPDATE',
      [ventaId]
    );
    if (ventaQ.rows.length === 0)
      return res.status(404).json(createErrorResponse('Venta no encontrada', CODIGOS_ERROR.NO_ENCONTRADO));

    const venta = ventaQ.rows[0];
    if (venta.estatus === 'cancelada')
      return res.status(400).json(createErrorResponse('La venta ya está cancelada', CODIGOS_ERROR.DATOS_INVALIDOS));

    await client.query(
      `UPDATE pos_ventas SET estatus='cancelada', motivo_cancelacion=$1, fecha_modificacion=NOW() WHERE id=$2`,
      [motivo || null, ventaId]
    );

    // Revertir movimientos de inventario
    const detalleQ = await client.query(
      'SELECT * FROM pos_ventas_detalle WHERE venta_id=$1',
      [ventaId]
    );

    for (const linea of detalleQ.rows) {
      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id=$1 FOR UPDATE',
          [linea.inventario_id]
        );
        const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
        const cantidad      = parseFloat(linea.cantidad);
        const saldoNuevo    = parseFloat((saldoAnterior + cantidad).toFixed(2));

        await client.query(
          'UPDATE inventarios SET existencia_actual=$1, fecha_modificacion=NOW() WHERE id=$2',
          [saldoNuevo, linea.inventario_id]
        );

        await client.query(`
          INSERT INTO inventarios_movimientos (
            inventario_id, tipo_movimiento, concepto,
            cantidad, saldo_anterior, saldo_nuevo,
            usuario_nombre, area_servicio, notas, venta_id
          ) VALUES ($1,'entrada','devolucion',$2,$3,$4,$5,'Punto de Venta',$6,$7)
        `, [
          linea.inventario_id, cantidad, saldoAnterior, saldoNuevo,
          req.user?.username || 'Sistema',
          `Cancelación folio ${venta.folio}: ${motivo || 'Sin motivo'}`,
          ventaId,
        ]);
      }
    }

    // Revertir puntos si tenía cliente
    if (venta.cliente_id) {
      const puntosGanados = calcularPuntosPorVenta(parseFloat(venta.total));
      if (puntosGanados > 0) {
        await client.query(`
          UPDATE pos_clientes_puntos
          SET puntos_acumulados = GREATEST(0, puntos_acumulados - $1),
              total_comprado    = GREATEST(0, total_comprado - $2),
              fecha_modificacion = NOW()
          WHERE cliente_id = $3
        `, [puntosGanados, venta.total, venta.cliente_id]);

        const pQ = await client.query(
          'SELECT puntos_acumulados, puntos_canjeados FROM pos_clientes_puntos WHERE cliente_id=$1',
          [venta.cliente_id]
        );
        const saldo = pQ.rows[0] ? pQ.rows[0].puntos_acumulados - pQ.rows[0].puntos_canjeados : 0;
        await client.query(`
          INSERT INTO pos_clientes_puntos_movimientos
            (cliente_id, venta_id, tipo, puntos, saldo_puntos, notas)
          VALUES ($1,$2,'ajuste',$3,$4,$5)
        `, [venta.cliente_id, ventaId, -puntosGanados, saldo, `Cancelación ${venta.folio}`]);
      }
    }

    await client.query('COMMIT');
    return res.json(createResponse(true, { id: ventaId, folio: venta.folio }, 'Venta cancelada y stock revertido'));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('cancelarVenta POS:', err);
    return res.status(500).json(createErrorResponse('Error al cancelar venta', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/stats/hoy
// ─────────────────────────────────────────────────────────────
async function getStatsHoy(req, res) {
  try {
    const vendedorId = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;
    const esAdmin    = ['admin', 'supervisor'].includes(req.user?.role);

    let whereVendedor = '';
    let params = [];
    if (!esAdmin && vendedorId) {
      params.push(vendedorId);
      whereVendedor = `AND vendedor_usuario_id = $${params.length}`;
    }

    const statsQ = await query(`
      SELECT
        COUNT(*)                                         AS total_ventas,
        COALESCE(SUM(total) FILTER (WHERE estatus='completada'), 0) AS total_ingresos,
        COALESCE(AVG(total) FILTER (WHERE estatus='completada'), 0) AS ticket_promedio,
        COUNT(*) FILTER (WHERE estatus='cancelada')      AS ventas_canceladas,
        COUNT(*) FILTER (WHERE metodo_pago_codigo='efectivo') AS pagos_efectivo,
        COUNT(*) FILTER (WHERE metodo_pago_codigo='tarjeta')  AS pagos_tarjeta,
        COUNT(*) FILTER (WHERE metodo_pago_codigo='transferencia') AS pagos_transferencia
      FROM pos_ventas
      WHERE fecha_venta >= CURRENT_DATE
        AND fecha_venta <  CURRENT_DATE + interval '1 day'
        ${whereVendedor}
    `, params);

    const stats = statsQ.rows[0];

    return res.json(createResponse(true, {
      total_ventas:       parseInt(stats.total_ventas),
      total_ingresos:     parseFloat(stats.total_ingresos),
      ticket_promedio:    parseFloat(parseFloat(stats.ticket_promedio).toFixed(2)),
      ventas_canceladas:  parseInt(stats.ventas_canceladas),
      pagos_efectivo:     parseInt(stats.pagos_efectivo),
      pagos_tarjeta:      parseInt(stats.pagos_tarjeta),
      pagos_transferencia: parseInt(stats.pagos_transferencia),
    }, 'Estadísticas del día'));
  } catch (err) {
    console.error('getStatsHoy POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener estadísticas', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/descuentos
// ─────────────────────────────────────────────────────────────
async function getDescuentos(req, res) {
  try {
    const result = await query(`
      SELECT * FROM pos_descuentos_config
      WHERE activo = true
        AND (fecha_vigencia_inicio IS NULL OR fecha_vigencia_inicio <= CURRENT_DATE)
        AND (fecha_vigencia_fin    IS NULL OR fecha_vigencia_fin    >= CURRENT_DATE)
      ORDER BY nombre
    `);
    return res.json(createResponse(true, result.rows.map(r => ({
      ...r, valor: parseFloat(r.valor), limite_porcentaje_cajero: parseFloat(r.limite_porcentaje_cajero),
    })), 'Descuentos obtenidos'));
  } catch (err) {
    console.error('getDescuentos POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener descuentos', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/clientes/:id/puntos
// ─────────────────────────────────────────────────────────────
async function getPuntosByCliente(req, res) {
  try {
    const clienteId = parseInt(req.params.id);

    // Info del cliente
    const cliQ = await query(
      'SELECT id, COALESCE(nombre_comercial, razon_social) AS nombre, email, telefono FROM clientes WHERE id=$1 AND activo=true',
      [clienteId]
    );
    if (cliQ.rows.length === 0)
      return res.status(404).json(createErrorResponse('Cliente no encontrado', CODIGOS_ERROR.NO_ENCONTRADO));

    // Puntos
    const pQ = await query(
      'SELECT * FROM pos_clientes_puntos WHERE cliente_id=$1',
      [clienteId]
    );
    const puntos = pQ.rows[0] || {
      puntos_acumulados: 0, puntos_canjeados: 0, puntos_disponibles: 0,
      nivel_cliente: 'estandar', total_comprado: 0, fecha_ultima_compra: null,
    };

    // Últimas 5 compras
    const histQ = await query(`
      SELECT id, folio, fecha_venta, total, estatus
      FROM pos_ventas
      WHERE cliente_id=$1 AND estatus='completada'
      ORDER BY fecha_venta DESC LIMIT 5
    `, [clienteId]);

    return res.json(createResponse(true, {
      cliente:        cliQ.rows[0],
      puntos:         { ...puntos, total_comprado: parseFloat(puntos.total_comprado || 0) },
      ultimas_compras: histQ.rows.map(v => ({ ...v, total: parseFloat(v.total) })),
    }, 'Información de puntos del cliente'));
  } catch (err) {
    console.error('getPuntosByCliente POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener puntos', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/pos/ventas/:id/ticket
// Marcar ticket como generado
// ─────────────────────────────────────────────────────────────
async function marcarTicketGenerado(req, res) {
  try {
    const ventaId = parseInt(req.params.id);
    await query('UPDATE pos_ventas SET ticket_generado=true WHERE id=$1', [ventaId]);
    return res.json(createResponse(true, { id: ventaId, ticket_generado: true }, 'Ticket marcado'));
  } catch (err) {
    console.error('marcarTicketGenerado POS:', err);
    return res.status(500).json(createErrorResponse('Error', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

module.exports = {
  getCatalogo,
  createVenta,
  listVentas,
  getVentaById,
  cancelarVenta,
  getStatsHoy,
  getDescuentos,
  getPuntosByCliente,
  marcarTicketGenerado,
};
