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

const { query, queryAudit, getClient, pool: getPool } = require('../config/database');
const {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  CODIGOS_ERROR
} = require('../utils/apiStandard');
const { crearFacturaEnTransaccion } = require('./facturasController');
const { registrarBitacora, getIp } = require('../utils/bitacora');

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
  // Advisory lock de transacción: solo una TX a la vez genera el folio,
  // se libera automáticamente al hacer COMMIT o ROLLBACK.
  await client.query('SELECT pg_advisory_xact_lock(987654321)');
  // Usa MAX del consecutivo en lugar de COUNT para que
  // ventas canceladas/eliminadas no provoquen colisiones.
  const r = await client.query(
    `SELECT COALESCE(
       MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)),
     0) + 1 AS siguiente
     FROM pos_ventas
     WHERE folio LIKE $1`,
    [`PV-${anio}-%`]
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
        i.tabulador_activo,
        d.nombre AS departamento_nombre,
        d.color  AS departamento_color,
        d.id     AS departamento_id,
        COALESCE((
          SELECT SUM(det.cantidad)
          FROM pos_ventas_detalle det
          JOIN pos_ventas v ON v.id = det.venta_id
          WHERE det.inventario_id = i.id
            AND v.estatus = 'completada'
        ), 0) AS veces_vendido,
        CASE
          WHEN i.es_servicio = true THEN 'servicio'
          WHEN i.existencia_actual <= 0 THEN 'sin_stock'
          WHEN i.stock_minimo > 0 AND i.existencia_actual < i.stock_minimo THEN 'critico'
          WHEN i.stock_minimo > 0 AND i.existencia_actual <= i.stock_minimo * 1.1 THEN 'bajo'
          ELSE 'ok'
        END AS nivel_stock,
        COALESCE((
          SELECT json_agg(
            json_build_object('cantidad_desde', tp.cantidad_desde, 'precio', tp.precio)
            ORDER BY tp.cantidad_desde ASC
          )
          FROM inv_tabulador_precios tp
          WHERE tp.inventario_id = i.id
        ), '[]'::json) AS tabulador
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

    sql += ' ORDER BY veces_vendido DESC, d.orden ASC NULLS LAST, i.nombre ASC';

    const result = await query(sql, params);
    const items = result.rows.map(r => ({
      ...r,
      precio_venta: parseFloat(r.precio_venta),
      existencia_actual: parseFloat(r.existencia_actual),
      veces_vendido: parseFloat(r.veces_vendido) || 0,
      tabulador: (r.tabulador || []).map(t => ({
        cantidad_desde: parseFloat(t.cantidad_desde),
        precio: parseFloat(t.precio),
      })),
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
    // Contexto de usuario para trigger_auditoria()
    const _aId   = req.user?.id   ? parseInt(req.user.id).toString()                      : '';
    const _aName = String(req.user?.nombre || req.user?.username || '').substring(0, 255).replace(/'/g, "''");
    await client.query(`SET LOCAL app.current_user_id     = '${_aId}'`);
    await client.query(`SET LOCAL app.current_user_nombre = '${_aName}'`);

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
      requiere_factura = false,
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
      let tabuladorAplicado = false;
      if (item.inventario_id && !item.es_servicio && !item.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual, nombre, precio_venta, tabulador_activo FROM inventarios WHERE id=$1 AND activo=true FOR UPDATE',
          [item.inventario_id]
        );
        if (stockQ.rows.length === 0)
          throw new Error(`Artículo no encontrado: ID ${item.inventario_id}`);
        const stock = parseFloat(stockQ.rows[0].existencia_actual);
        if (stock < cantidad)
          throw new Error(`Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${stock}, solicitado ${cantidad}`);

        const precioReal = parseFloat(stockQ.rows[0].precio_venta);
        const tabuladorActivo = stockQ.rows[0].tabulador_activo;
        if (!isNaN(precioReal) && precioReal >= 0) {
          // Si el artículo tiene tabulador activo, verificar si el precio enviado
          // corresponde al tramo válido para la cantidad solicitada.
          if (tabuladorActivo && Math.abs(precioUnit - precioReal) > 0.001) {
            const tabQ = await client.query(
              `SELECT precio FROM inv_tabulador_precios
               WHERE inventario_id = $1 AND cantidad_desde <= $2
               ORDER BY cantidad_desde DESC LIMIT 1`,
              [item.inventario_id, cantidad]
            );
            if (tabQ.rows.length > 0) {
              const precioTabulador = parseFloat(tabQ.rows[0].precio);
              if (Math.abs(precioUnit - precioTabulador) <= 0.01) {
                // Precio coincide con el tabulador: es legítimo
                precioUnit = precioTabulador;
                tabuladorAplicado = true;
              } else {
                // El precio no coincide con el tabulador ni con el base: manipulación
                precioUnit = precioReal;
              }
            } else {
              // No hay tramo de tabulador para esta cantidad: usar precio base
              precioUnit = precioReal;
            }
          }
          // Detectar y registrar intento de manipulación de precio (excluyendo tabulador)
          if (!tabuladorAplicado && Math.abs(precioUnit - precioReal) > 0.001) {
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

            registrarBitacora({
              modulo: 'pos', accion: 'PRECIO_MANIPULADO',
              entidad: 'inventarios', entidadId: String(item.inventario_id),
              usuarioId, usuarioNombre, ip,
              detalle: { nombre_producto: stockQ.rows[0].nombre, precio_enviado: precioUnit, precio_real: precioReal, cantidad },
              resultado: 'bloqueado',
            });
          }
          // Si no hubo tabulador, forzar el precio de BD (seguridad)
          if (!tabuladorAplicado) {
            precioUnit = precioReal;
          }
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
        tabulador_aplicado:    tabuladorAplicado,
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
        descuento_config_id, descuento_autorizado_por, notas, requiere_factura
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [
      folio, cliente_id || null, clienteNombre,
      vendedorId, vendedorNombre,
      subtotal, descPct, descMonto, total,
      montoRecibido, cambio,
      metodo_pago_codigo, metodo_pago_descripcion || metodo_pago_codigo,
      descuento_config_id || null, descuento_autorizado_por || null, notas || null,
      !!requiere_factura,
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
          descuento_linea_pct, descuento_linea_monto, subtotal_linea,
          tabulador_aplicado
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [
        ventaId, linea.inventario_id, linea.nombre_producto, linea.sku,
        linea.es_servicio, linea.es_item_libre,
        linea.cantidad, linea.precio_unitario,
        linea.descuento_linea_pct, linea.descuento_linea_monto, linea.subtotal_linea,
        linea.tabulador_aplicado || false,
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

      // Siempre registrar movimiento aunque los puntos sean 0 (bitácora completa)
      const saldoPuntos = parseInt(pr.puntos_acumulados, 10) - parseInt(pr.puntos_canjeados, 10);
      await client.query(`
        INSERT INTO pos_clientes_puntos_movimientos
          (cliente_id, venta_id, tipo, puntos, saldo_puntos, notas)
        VALUES ($1,$2,'acumulado',$3,$4,$5)
      `, [cliente_id, ventaId, puntosGanados, saldoPuntos, `Venta ${folio} · $${total}`]);
    }

    // Crear registro de factura si se requiere y hay cliente registrado
    if (requiere_factura && cliente_id) {
      await crearFacturaEnTransaccion(client, {
        tipo_origen: 'venta',
        venta_id: ventaId,
        cliente_id,
        subtotal: total,
        usuario_id: vendedorId,
        usuario_nombre: vendedorNombre,
        notas: notas || null,
      });
    }

    await client.query('COMMIT');

    // Retornar venta completa
    const ventaCompleta = await getVentaDetalle(ventaId);

    registrarBitacora({
      modulo: 'pos', accion: 'VENTA_COMPLETADA',
      entidad: 'pos_ventas', entidadId: folio,
      usuarioId: vendedorId, usuarioNombre: vendedorNombre,
      ip: getIp(req),
      detalle: { folio, total, metodo_pago_codigo, cliente_id: cliente_id || null, num_items: lineasProcesadas.length },
    });

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
      estatus, folio, page = 1, limit = 25,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (fecha_inicio) { params.push(fecha_inicio);        where += ` AND v.fecha_venta >= $${params.length}::date`; }
    if (fecha_fin)    { params.push(fecha_fin);            where += ` AND v.fecha_venta < ($${params.length}::date + interval '1 day')`; }
    if (cliente_id)   { params.push(cliente_id);           where += ` AND v.cliente_id = $${params.length}`; }
    if (vendedor_id)  { params.push(vendedor_id);          where += ` AND v.vendedor_usuario_id = $${params.length}`; }
    if (estatus)      { params.push(estatus);              where += ` AND v.estatus = $${params.length}`; }
    if (folio)        { params.push(`%${folio.trim()}%`);  where += ` AND v.folio ILIKE $${params.length}`; }

    const totalQ = await query(`SELECT COUNT(*) FROM pos_ventas v ${where}`, params);
    const total  = parseInt(totalQ.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);
    const sql = `
      SELECT
        v.id, v.folio, v.fecha_venta, v.cliente_id, v.cliente_nombre,
        v.vendedor_usuario_id, v.vendedor_nombre,
        v.subtotal, v.descuento_pct, v.descuento_monto,
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
    // Contexto de usuario para trigger_auditoria()
    const _aId   = req.user?.id   ? parseInt(req.user.id).toString()                      : '';
    const _aName = String(req.user?.nombre || req.user?.username || '').substring(0, 255).replace(/'/g, "''");
    await client.query(`SET LOCAL app.current_user_id     = '${_aId}'`);
    await client.query(`SET LOCAL app.current_user_nombre = '${_aName}'`);

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

    registrarBitacora({
      modulo: 'pos', accion: 'VENTA_CANCELADA',
      entidad: 'pos_ventas', entidadId: venta.folio,
      usuarioId: req.user?.id || null, usuarioNombre: req.user?.nombre || req.user?.username || null,
      ip: getIp(req),
      detalle: { folio: venta.folio, total: parseFloat(venta.total), motivo: motivo || null },
    });

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
        COUNT(*)                                                          AS total_ventas,
        COUNT(*) FILTER (WHERE estatus='completada')                      AS ventas_completadas,
        COUNT(*) FILTER (WHERE estatus='cancelada')                       AS ventas_canceladas,
        COALESCE(SUM(total)           FILTER (WHERE estatus='completada'), 0) AS total_ingresos,
        COALESCE(AVG(total)           FILTER (WHERE estatus='completada'), 0) AS ticket_promedio,
        COALESCE(SUM(descuento_monto) FILTER (WHERE estatus='completada'), 0) AS total_descuentos,
        -- Conteo por método de pago (solo ventas completadas)
        COUNT(*) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='efectivo')      AS pagos_efectivo,
        COUNT(*) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='tarjeta')       AS pagos_tarjeta,
        COUNT(*) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='transferencia') AS pagos_transferencia,
        -- Monto por método de pago (solo ventas completadas)
        COALESCE(SUM(total) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='efectivo'),      0) AS monto_efectivo,
        COALESCE(SUM(total) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='tarjeta'),       0) AS monto_tarjeta,
        COALESCE(SUM(total) FILTER (WHERE estatus='completada' AND metodo_pago_codigo='transferencia'), 0) AS monto_transferencia
      FROM pos_ventas
      WHERE fecha_venta >= CURRENT_DATE
        AND fecha_venta <  CURRENT_DATE + interval '1 day'
        ${whereVendedor}
    `, params);

    const stats = statsQ.rows[0];

    return res.json(createResponse(true, {
      total_ventas:         parseInt(stats.total_ventas),
      ventas_completadas:   parseInt(stats.ventas_completadas),
      ventas_canceladas:    parseInt(stats.ventas_canceladas),
      total_ingresos:       parseFloat(parseFloat(stats.total_ingresos).toFixed(2)),
      ticket_promedio:      parseFloat(parseFloat(stats.ticket_promedio).toFixed(2)),
      total_descuentos:     parseFloat(parseFloat(stats.total_descuentos).toFixed(2)),
      pagos_efectivo:       parseInt(stats.pagos_efectivo),
      pagos_tarjeta:        parseInt(stats.pagos_tarjeta),
      pagos_transferencia:  parseInt(stats.pagos_transferencia),
      monto_efectivo:       parseFloat(parseFloat(stats.monto_efectivo).toFixed(2)),
      monto_tarjeta:        parseFloat(parseFloat(stats.monto_tarjeta).toFixed(2)),
      monto_transferencia:  parseFloat(parseFloat(stats.monto_transferencia).toFixed(2)),
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
    await queryAudit('UPDATE pos_ventas SET ticket_generado=true WHERE id=$1', [ventaId], req.user?.id, req.user?.nombre || req.user?.username);
    return res.json(createResponse(true, { id: ventaId, ticket_generado: true }, 'Ticket marcado'));
  } catch (err) {
    console.error('marcarTicketGenerado POS:', err);
    return res.status(500).json(createErrorResponse('Error', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// COTIZACIONES
// ─────────────────────────────────────────────────────────────

async function generarFolioCotizacion(client) {
  const anio = new Date().getFullYear();
  const r = await client.query(
    `SELECT COUNT(*) + 1 AS siguiente FROM pos_cotizaciones WHERE EXTRACT(YEAR FROM fecha_creacion) = $1`,
    [anio]
  );
  const consecutivo = parseInt(r.rows[0].siguiente, 10);
  return `CQ-${anio}-${String(consecutivo).padStart(5, '0')}`;
}

async function getCotizacionDetalle(id) {
  const r = await query(`
    SELECT c.*,
           cl.nombre_comercial AS cliente_nombre_comercial,
           cl.rfc AS cliente_rfc,
           cl.email AS cliente_email
    FROM pos_cotizaciones c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    WHERE c.id = $1
  `, [id]);
  if (r.rows.length === 0) return null;
  const cotiz = r.rows[0];
  const detR = await query(
    'SELECT * FROM pos_cotizaciones_detalle WHERE cotizacion_id=$1 ORDER BY id ASC',
    [id]
  );
  return { ...cotiz, detalle: detR.rows.map(d => ({
    ...d,
    cantidad: parseFloat(d.cantidad),
    precio_unitario: parseFloat(d.precio_unitario),
    descuento_linea_pct: parseFloat(d.descuento_linea_pct),
    descuento_linea_monto: parseFloat(d.descuento_linea_monto),
    subtotal_linea: parseFloat(d.subtotal_linea),
  })) };
}

// POST /api/pos/cotizaciones
async function createCotizacion(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { cliente_id, items, descuento_pct = 0, notas, fecha_vencimiento, requiere_factura = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json(createErrorResponse('Debe incluir al menos un producto', CODIGOS_ERROR.DATOS_INVALIDOS));

    const vendedorNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const vendedorId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

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
      lineas.push({ ...item, cantidad, precio_unitario: precioUnit, descuento_linea_pct: descLinPct, descuento_linea_monto: descLinMonto, subtotal_linea: subtotalLinea });
    }
    subtotal = parseFloat(subtotal.toFixed(2));
    const descPct   = Math.min(parseFloat(descuento_pct || 0), 100);
    const descMonto = parseFloat((subtotal * descPct / 100).toFixed(2));
    const total     = parseFloat((subtotal - descMonto).toFixed(2));

    let clienteNombre = 'Público General';
    if (cliente_id) {
      const cliQ = await client.query(
        'SELECT COALESCE(nombre_comercial, razon_social) AS nombre FROM clientes WHERE id=$1 AND activo=true',
        [cliente_id]
      );
      if (cliQ.rows.length > 0) clienteNombre = cliQ.rows[0].nombre;
    }

    const folio = await generarFolioCotizacion(client);

    const cotizQ = await client.query(`
      INSERT INTO pos_cotizaciones
        (folio, estatus, cliente_id, cliente_nombre, vendedor_usuario_id, vendedor_nombre,
         subtotal, descuento_pct, descuento_monto, total, notas, fecha_vencimiento, requiere_factura)
      VALUES ($1,'pendiente',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [folio, cliente_id || null, clienteNombre, vendedorId, vendedorNombre,
        subtotal, descPct, descMonto, total, notas || null, fecha_vencimiento || null, !!requiere_factura]);

    const cotizId = cotizQ.rows[0].id;

    for (const l of lineas) {
      await client.query(`
        INSERT INTO pos_cotizaciones_detalle
          (cotizacion_id, inventario_id, nombre_producto, sku, es_servicio, es_item_libre,
           cantidad, precio_unitario, descuento_linea_pct, descuento_linea_monto, subtotal_linea)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [cotizId, l.inventario_id || null, l.nombre_producto, l.sku || null,
          !!l.es_servicio, !!l.es_item_libre, l.cantidad, l.precio_unitario,
          l.descuento_linea_pct, l.descuento_linea_monto, l.subtotal_linea]);
    }

    await client.query('COMMIT');
    const cotizCompleta = await getCotizacionDetalle(cotizId);
    return res.status(201).json(createResponse(true, cotizCompleta, 'Cotización creada exitosamente'));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createCotizacion:', err);
    return res.status(500).json(createErrorResponse('Error al crear cotización', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// GET /api/pos/cotizaciones
async function listCotizaciones(req, res) {
  try {
    const { folio, cliente_id, estatus, fecha_inicio, fecha_fin, page = 1, limit = 20 } = req.query;
    const params = [];
    const where  = [];
    let p = 1;

    if (folio)        { where.push(`c.folio ILIKE $${p}`);        params.push(`%${folio}%`);     p++; }
    if (cliente_id)   { where.push(`c.cliente_id = $${p}`);       params.push(parseInt(cliente_id)); p++; }
    if (estatus)      { where.push(`c.estatus = $${p}`);          params.push(estatus);           p++; }
    if (fecha_inicio) { where.push(`c.fecha_creacion >= $${p}`);  params.push(fecha_inicio);      p++; }
    if (fecha_fin)    { where.push(`c.fecha_creacion < ($${p}::date + interval '1 day')`); params.push(fecha_fin); p++; }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    const [dataR, countR] = await Promise.all([
      query(`SELECT c.*, cl.nombre_comercial AS cliente_nombre_comercial
             FROM pos_cotizaciones c
             LEFT JOIN clientes cl ON cl.id = c.cliente_id
             ${whereStr} ORDER BY c.fecha_creacion DESC
             LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) FROM pos_cotizaciones c ${whereStr}`, params),
    ]);

    const total = parseInt(countR.rows[0].count);
    return res.json(createPaginatedResponse(dataR.rows.map(r => ({
      ...r,
      subtotal: parseFloat(r.subtotal),
      descuento_pct: parseFloat(r.descuento_pct),
      descuento_monto: parseFloat(r.descuento_monto),
      total: parseFloat(r.total),
    })), parseInt(page), parseInt(limit), total));
  } catch (err) {
    console.error('listCotizaciones:', err);
    return res.status(500).json(createErrorResponse('Error al obtener cotizaciones', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// GET /api/pos/cotizaciones/:id
async function getCotizacionById(req, res) {
  try {
    const cotiz = await getCotizacionDetalle(parseInt(req.params.id));
    if (!cotiz) return res.status(404).json(createErrorResponse('Cotización no encontrada', CODIGOS_ERROR.NOT_FOUND));
    return res.json(createResponse(true, cotiz, 'Cotización obtenida'));
  } catch (err) {
    console.error('getCotizacionById:', err);
    return res.status(500).json(createErrorResponse('Error al obtener cotización', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// PATCH /api/pos/cotizaciones/:id/estatus
async function updateEstatusCotizacion(req, res) {
  try {
    const { id } = req.params;
    const { estatus } = req.body;
    const permitidos = ['rechazada', 'vencida'];
    if (!permitidos.includes(estatus))
      return res.status(400).json(createErrorResponse(`Estatus inválido. Use: ${permitidos.join(', ')}`, CODIGOS_ERROR.DATOS_INVALIDOS));

    const r = await query(
      `UPDATE pos_cotizaciones SET estatus=$1, fecha_modificacion=NOW() WHERE id=$2 AND estatus='pendiente' RETURNING *`,
      [estatus, parseInt(id)]
    );
    if (r.rowCount === 0)
      return res.status(404).json(createErrorResponse('Cotización no encontrada o ya no está pendiente', CODIGOS_ERROR.NOT_FOUND));

    return res.json(createResponse(true, r.rows[0], `Cotización marcada como ${estatus}`));
  } catch (err) {
    console.error('updateEstatusCotizacion:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar estatus', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// POST /api/pos/cotizaciones/:id/convertir
async function convertirCotizacion(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Contexto de usuario para trigger_auditoria()
    const _aId   = req.user?.id   ? parseInt(req.user.id).toString()                      : '';
    const _aName = String(req.user?.nombre || req.user?.username || '').substring(0, 255).replace(/'/g, "''");
    await client.query(`SET LOCAL app.current_user_id     = '${_aId}'`);
    await client.query(`SET LOCAL app.current_user_nombre = '${_aName}'`);

    const cotizId = parseInt(req.params.id);
    const { metodo_pago_codigo, metodo_pago_descripcion, monto_recibido, notas, requiere_factura, cliente_factura_id } = req.body;

    if (!metodo_pago_codigo)
      return res.status(400).json(createErrorResponse('Método de pago requerido', CODIGOS_ERROR.DATOS_INVALIDOS));

    const cotizR = await client.query(
      `SELECT * FROM pos_cotizaciones WHERE id=$1 FOR UPDATE`, [cotizId]
    );
    if (cotizR.rows.length === 0)
      return res.status(404).json(createErrorResponse('Cotización no encontrada', CODIGOS_ERROR.NOT_FOUND));

    const cotiz = cotizR.rows[0];
    if (cotiz.estatus !== 'pendiente')
      return res.status(400).json(createErrorResponse('Solo se pueden convertir cotizaciones pendientes', CODIGOS_ERROR.DATOS_INVALIDOS));

    const detR = await client.query(
      'SELECT * FROM pos_cotizaciones_detalle WHERE cotizacion_id=$1', [cotizId]
    );
    const items = detR.rows;

    // Reutilizar lógica de createVenta: verificar stock y descontar
    const vendedorNombre = req.user?.nombre || req.user?.username || 'Sistema';
    const vendedorId     = req.user?.id && req.user.id !== 'dev' ? req.user.id : null;

    let subtotal = 0;
    const lineasProcesadas = [];

    for (const item of items) {
      const cantidad   = parseFloat(item.cantidad);
      const descLinPct = parseFloat(item.descuento_linea_pct || 0);
      let precioUnit   = parseFloat(item.precio_unitario);

      if (item.inventario_id && !item.es_servicio && !item.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual, nombre, precio_venta FROM inventarios WHERE id=$1 AND activo=true FOR UPDATE',
          [item.inventario_id]
        );
        if (stockQ.rows.length === 0) throw new Error(`Artículo no encontrado: ${item.nombre_producto}`);
        const stock = parseFloat(stockQ.rows[0].existencia_actual);
        if (stock < cantidad) throw new Error(`Stock insuficiente para "${stockQ.rows[0].nombre}": disponible ${stock}, solicitado ${cantidad}`);
        const precioReal = parseFloat(stockQ.rows[0].precio_venta);
        if (!isNaN(precioReal) && precioReal >= 0) precioUnit = precioReal;
      }

      const descLinMonto  = parseFloat(((cantidad * precioUnit) * descLinPct / 100).toFixed(2));
      const subtotalLinea = parseFloat(((cantidad * precioUnit) - descLinMonto).toFixed(2));
      subtotal += subtotalLinea;
      lineasProcesadas.push({ ...item, cantidad, precio_unitario: precioUnit, descuento_linea_pct: descLinPct, descuento_linea_monto: descLinMonto, subtotal_linea: subtotalLinea });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const descPct   = parseFloat(cotiz.descuento_pct);
    const descMonto = parseFloat((subtotal * descPct / 100).toFixed(2));
    const total     = parseFloat((subtotal - descMonto).toFixed(2));
    const montoRecibido = monto_recibido ? parseFloat(monto_recibido) : null;
    const cambio    = montoRecibido ? parseFloat((montoRecibido - total).toFixed(2)) : 0;

    const folio = await generarFolio(client);

    const rfactura = requiere_factura !== undefined ? !!requiere_factura : !!(cotiz.requiere_factura);

    const ventaQ = await client.query(`
      INSERT INTO pos_ventas (
        folio, cliente_id, cliente_nombre, vendedor_usuario_id, vendedor_nombre,
        subtotal, descuento_pct, descuento_monto, total, monto_recibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion, notas, requiere_factura
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [folio, cotiz.cliente_id || null, cotiz.cliente_nombre, vendedorId, vendedorNombre,
        subtotal, descPct, descMonto, total, montoRecibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion || metodo_pago_codigo,
        notas || cotiz.notas || null, rfactura]);

    const venta   = ventaQ.rows[0];
    const ventaId = venta.id;

    for (const linea of lineasProcesadas) {
      await client.query(`
        INSERT INTO pos_ventas_detalle
          (venta_id, inventario_id, nombre_producto, sku, es_servicio, es_item_libre,
           cantidad, precio_unitario, descuento_linea_pct, descuento_linea_monto, subtotal_linea,
           tabulador_aplicado)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [ventaId, linea.inventario_id, linea.nombre_producto, linea.sku,
          linea.es_servicio, linea.es_item_libre, linea.cantidad, linea.precio_unitario,
          linea.descuento_linea_pct, linea.descuento_linea_monto, linea.subtotal_linea,
          linea.tabulador_aplicado || false]);

      if (linea.inventario_id && !linea.es_servicio && !linea.es_item_libre) {
        const stockQ = await client.query(
          'SELECT existencia_actual FROM inventarios WHERE id=$1 FOR UPDATE', [linea.inventario_id]
        );
        const saldoAnterior = parseFloat(stockQ.rows[0].existencia_actual);
        const saldoNuevo    = parseFloat((saldoAnterior - linea.cantidad).toFixed(2));
        await client.query(
          'UPDATE inventarios SET existencia_actual=$1, fecha_modificacion=NOW() WHERE id=$2',
          [saldoNuevo, linea.inventario_id]
        );
        await client.query(`
          INSERT INTO inventarios_movimientos
            (inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo, usuario_nombre, area_servicio, notas, venta_id)
          VALUES ($1,'salida','venta',$2,$3,$4,$5,'Punto de Venta',$6,$7)
        `, [linea.inventario_id, -linea.cantidad, saldoAnterior, saldoNuevo, vendedorNombre, `Folio POS: ${folio}`, ventaId]);
      }
    }

    // Marcar cotización como aceptada y vincular a la venta
    await client.query(
      `UPDATE pos_cotizaciones SET estatus='aceptada', venta_id=$1, fecha_modificacion=NOW() WHERE id=$2`,
      [ventaId, cotizId]
    );

    // Crear registro de factura si se requiere y hay cliente registrado
    const clienteParaFacturaCotiz = parseInt(cliente_factura_id) || cotiz.cliente_id || null;
    if (rfactura && clienteParaFacturaCotiz) {
      await crearFacturaEnTransaccion(client, {
        tipo_origen: 'venta',
        venta_id: ventaId,
        cliente_id: clienteParaFacturaCotiz,
        subtotal: total,
        usuario_id: vendedorId,
        usuario_nombre: vendedorNombre,
        notas: notas || cotiz.notas || null,
      });
    }

    await client.query('COMMIT');

    const ventaCompleta = await getVentaDetalle(ventaId);
    return res.status(201).json(createResponse(true, ventaCompleta, `Cotización ${cotiz.folio} convertida a venta ${folio}`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('convertirCotizacion:', err);
    return res.status(500).json(createErrorResponse(err.message || 'Error al convertir cotización', CODIGOS_ERROR.ERROR_SERVIDOR));
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/reportes/vendedores
// Resumen de ventas agrupado por vendedor
// Query params: fecha_inicio, fecha_fin, vendedor_id
// ─────────────────────────────────────────────────────────────
async function getReporteVendedores(req, res) {
  try {
    const { fecha_inicio, fecha_fin, vendedor_id } = req.query;

    const params = [];
    const where = [];
    where.push(`estatus = 'completada'`);

    if (fecha_inicio) { params.push(fecha_inicio); where.push(`fecha_venta >= $${params.length}::date`); }
    if (fecha_fin)    { params.push(fecha_fin);     where.push(`fecha_venta < ($${params.length}::date + interval '1 day')`); }
    if (vendedor_id)  { params.push(vendedor_id);   where.push(`vendedor_usuario_id = $${params.length}`); }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const result = await query(`
      SELECT
        vendedor_usuario_id,
        vendedor_nombre,
        COUNT(*)                      AS total_ventas,
        SUM(total)                    AS total_ingresos,
        AVG(total)                    AS ticket_promedio,
        SUM(descuento_monto)          AS total_descuentos,
        COUNT(*) FILTER (WHERE metodo_pago_codigo = 'efectivo')     AS pagos_efectivo,
        COUNT(*) FILTER (WHERE metodo_pago_codigo = 'tarjeta')      AS pagos_tarjeta,
        COUNT(*) FILTER (WHERE metodo_pago_codigo = 'transferencia') AS pagos_transferencia,
        MIN(fecha_venta)              AS primera_venta,
        MAX(fecha_venta)              AS ultima_venta
      FROM pos_ventas
      ${whereClause}
      GROUP BY vendedor_usuario_id, vendedor_nombre
      ORDER BY total_ingresos DESC
    `, params);

    const rows = result.rows.map(r => ({
      vendedor_usuario_id:  r.vendedor_usuario_id,
      vendedor_nombre:      r.vendedor_nombre,
      total_ventas:         parseInt(r.total_ventas),
      total_ingresos:       parseFloat(parseFloat(r.total_ingresos).toFixed(2)),
      ticket_promedio:      parseFloat(parseFloat(r.ticket_promedio).toFixed(2)),
      total_descuentos:     parseFloat(parseFloat(r.total_descuentos).toFixed(2)),
      pagos_efectivo:       parseInt(r.pagos_efectivo),
      pagos_tarjeta:        parseInt(r.pagos_tarjeta),
      pagos_transferencia:  parseInt(r.pagos_transferencia),
      primera_venta:        r.primera_venta,
      ultima_venta:         r.ultima_venta,
    }));

    return res.json(createResponse(true, rows, 'Reporte de ventas por vendedor'));
  } catch (err) {
    console.error('getReporteVendedores POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener reporte de vendedores', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/reportes/clientes
// Resumen de compras agrupado por cliente registrado
// Query params: fecha_inicio, fecha_fin, cliente_id
// ─────────────────────────────────────────────────────────────
async function getReporteClientes(req, res) {
  try {
    const { fecha_inicio, fecha_fin, cliente_id } = req.query;

    const params = [];
    const where = [];
    where.push(`v.estatus = 'completada'`);
    where.push(`v.cliente_id IS NOT NULL`);

    if (fecha_inicio) { params.push(fecha_inicio); where.push(`v.fecha_venta >= $${params.length}::date`); }
    if (fecha_fin)    { params.push(fecha_fin);     where.push(`v.fecha_venta < ($${params.length}::date + interval '1 day')`); }
    if (cliente_id)   { params.push(cliente_id);    where.push(`v.cliente_id = $${params.length}`); }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const result = await query(`
      SELECT
        v.cliente_id,
        v.cliente_nombre,
        c.email              AS cliente_email,
        c.telefono           AS cliente_telefono,
        COUNT(v.id)          AS total_compras,
        SUM(v.total)         AS total_gastado,
        AVG(v.total)         AS ticket_promedio,
        MIN(v.fecha_venta)   AS primera_compra,
        MAX(v.fecha_venta)   AS ultima_compra,
        cp.puntos_acumulados,
        cp.puntos_canjeados,
        (cp.puntos_acumulados - cp.puntos_canjeados) AS puntos_disponibles,
        cp.nivel_cliente
      FROM pos_ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN pos_clientes_puntos cp ON cp.cliente_id = v.cliente_id
      ${whereClause}
      GROUP BY v.cliente_id, v.cliente_nombre, c.email, c.telefono,
               cp.puntos_acumulados, cp.puntos_canjeados, cp.nivel_cliente
      ORDER BY total_gastado DESC
    `, params);

    const rows = result.rows.map(r => ({
      cliente_id:          r.cliente_id,
      cliente_nombre:      r.cliente_nombre,
      cliente_email:       r.cliente_email,
      cliente_telefono:    r.cliente_telefono,
      total_compras:       parseInt(r.total_compras),
      total_gastado:       parseFloat(parseFloat(r.total_gastado).toFixed(2)),
      ticket_promedio:     parseFloat(parseFloat(r.ticket_promedio).toFixed(2)),
      primera_compra:      r.primera_compra,
      ultima_compra:       r.ultima_compra,
      puntos_acumulados:   parseInt(r.puntos_acumulados || 0),
      puntos_canjeados:    parseInt(r.puntos_canjeados  || 0),
      puntos_disponibles:  parseInt(r.puntos_disponibles || 0),
      nivel_cliente:       r.nivel_cliente || 'estandar',
    }));

    return res.json(createResponse(true, rows, 'Reporte de compras por cliente'));
  } catch (err) {
    console.error('getReporteClientes POS:', err);
    return res.status(500).json(createErrorResponse('Error al obtener reporte de clientes', CODIGOS_ERROR.ERROR_SERVIDOR));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/pos/corte
// Corte de caja: desglose completo de ingresos por período
// Query params: fecha (YYYY-MM-DD, default: hoy), vendedor_id
// ─────────────────────────────────────────────────────────────
async function getCorteCaja(req, res) {
  try {
    const { fecha, vendedor_id } = req.query;

    // Si no se pasa fecha se usa hoy (zona horaria del servidor)
    const fechaCorte = fecha || new Date().toISOString().slice(0, 10);

    const params = [fechaCorte];
    const whereVendedor = vendedor_id ? `AND vendedor_usuario_id = $${params.push(vendedor_id)}` : '';

    // ── 1. Totales generales ──────────────────────────────────
    const totalesQ = await query(`
      SELECT
        COUNT(*)                                                              AS total_ventas,
        COUNT(*) FILTER (WHERE estatus = 'completada')                        AS ventas_completadas,
        COUNT(*) FILTER (WHERE estatus = 'cancelada')                         AS ventas_canceladas,
        COALESCE(SUM(total)           FILTER (WHERE estatus = 'completada'), 0) AS total_ingresos,
        COALESCE(SUM(subtotal)        FILTER (WHERE estatus = 'completada'), 0) AS total_subtotal,
        COALESCE(SUM(descuento_monto) FILTER (WHERE estatus = 'completada'), 0) AS total_descuentos,
        COALESCE(SUM(iva_monto)       FILTER (WHERE estatus = 'completada'), 0) AS total_iva,
        COALESCE(AVG(total)           FILTER (WHERE estatus = 'completada'), 0) AS ticket_promedio,
        COALESCE(SUM(total)           FILTER (WHERE estatus = 'cancelada'),  0) AS monto_cancelado
      FROM pos_ventas
      WHERE fecha_venta >= $1::date
        AND fecha_venta <  $1::date + interval '1 day'
        ${whereVendedor}
    `, params);

    // ── 2. Desglose por método de pago ────────────────────────
    // Agrupa todos los métodos registrados (no solo los 3 fijos)
    const metodosQ = await query(`
      SELECT
        metodo_pago_codigo,
        metodo_pago_descripcion,
        COUNT(*)   AS cantidad_ventas,
        SUM(total) AS total_monto,
        AVG(total) AS ticket_promedio
      FROM pos_ventas
      WHERE estatus = 'completada'
        AND fecha_venta >= $1::date
        AND fecha_venta <  $1::date + interval '1 day'
        ${whereVendedor}
      GROUP BY metodo_pago_codigo, metodo_pago_descripcion
      ORDER BY total_monto DESC
    `, params);

    // ── 3. Desglose por vendedor ──────────────────────────────
    const vendedoresQ = await query(`
      SELECT
        vendedor_usuario_id,
        vendedor_nombre,
        COUNT(*) FILTER (WHERE estatus = 'completada')  AS ventas,
        COUNT(*) FILTER (WHERE estatus = 'cancelada')   AS canceladas,
        COALESCE(SUM(total) FILTER (WHERE estatus = 'completada'), 0) AS total
      FROM pos_ventas
      WHERE fecha_venta >= $1::date
        AND fecha_venta <  $1::date + interval '1 day'
        ${whereVendedor}
      GROUP BY vendedor_usuario_id, vendedor_nombre
      ORDER BY total DESC
    `, params);

    // ── 4. Listado de ventas del período ──────────────────────
    const ventasQ = await query(`
      SELECT
        id, folio, fecha_venta,
        cliente_nombre, vendedor_nombre,
        subtotal, descuento_pct, descuento_monto, total,
        monto_recibido, cambio,
        metodo_pago_codigo, metodo_pago_descripcion,
        estatus, motivo_cancelacion, ticket_generado
      FROM pos_ventas
      WHERE fecha_venta >= $1::date
        AND fecha_venta <  $1::date + interval '1 day'
        ${whereVendedor}
      ORDER BY fecha_venta ASC
    `, params);

    const totales = totalesQ.rows[0];

    return res.json(createResponse(true, {
      fecha_corte:   fechaCorte,
      vendedor_id:   vendedor_id || null,
      generado_en:   new Date().toISOString(),

      resumen: {
        total_ventas:       parseInt(totales.total_ventas),
        ventas_completadas: parseInt(totales.ventas_completadas),
        ventas_canceladas:  parseInt(totales.ventas_canceladas),
        total_subtotal:     parseFloat(parseFloat(totales.total_subtotal).toFixed(2)),
        total_descuentos:   parseFloat(parseFloat(totales.total_descuentos).toFixed(2)),
        total_iva:          parseFloat(parseFloat(totales.total_iva).toFixed(2)),
        total_ingresos:     parseFloat(parseFloat(totales.total_ingresos).toFixed(2)),
        ticket_promedio:    parseFloat(parseFloat(totales.ticket_promedio).toFixed(2)),
        monto_cancelado:    parseFloat(parseFloat(totales.monto_cancelado).toFixed(2)),
      },

      metodos_pago: metodosQ.rows.map(m => ({
        codigo:           m.metodo_pago_codigo,
        descripcion:      m.metodo_pago_descripcion,
        cantidad_ventas:  parseInt(m.cantidad_ventas),
        total_monto:      parseFloat(parseFloat(m.total_monto).toFixed(2)),
        ticket_promedio:  parseFloat(parseFloat(m.ticket_promedio).toFixed(2)),
      })),

      vendedores: vendedoresQ.rows.map(v => ({
        vendedor_usuario_id: v.vendedor_usuario_id,
        vendedor_nombre:     v.vendedor_nombre,
        ventas:              parseInt(v.ventas),
        canceladas:          parseInt(v.canceladas),
        total:               parseFloat(parseFloat(v.total).toFixed(2)),
      })),

      ventas: ventasQ.rows.map(v => ({
        ...v,
        subtotal:        parseFloat(v.subtotal),
        descuento_pct:   parseFloat(v.descuento_pct),
        descuento_monto: parseFloat(v.descuento_monto),
        total:           parseFloat(v.total),
        monto_recibido:  v.monto_recibido ? parseFloat(v.monto_recibido) : null,
        cambio:          parseFloat(v.cambio),
      })),
    }, `Corte de caja: ${fechaCorte}`));

  } catch (err) {
    console.error('getCorteCaja POS:', err);
    return res.status(500).json(createErrorResponse('Error al generar corte de caja', CODIGOS_ERROR.ERROR_SERVIDOR));
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
  createCotizacion,
  listCotizaciones,
  getCotizacionById,
  updateEstatusCotizacion,
  convertirCotizacion,
  getReporteVendedores,
  getReporteClientes,
  getCorteCaja,
};
