/**
 * facturasController.js
 * Controlador para el módulo de Facturación CFDI 4.0
 */
const { query, queryAudit, getClient } = require('../config/database');
const {
  createResponse,
  createErrorResponse,
  createPaginatedResponse,
  CODIGOS_ERROR,
} = require('../utils/apiStandard');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Genera el siguiente folio FA-YYYY-NNNNN usando una secuencia de BD.
 */
async function generarFolio(client) {
  const anio = new Date().getFullYear();
  const seq = await client.query('SELECT nextval($1) AS n', ['public.facturas_folio_seq']);
  const n = String(seq.rows[0].n).padStart(5, '0');
  return `FA-${anio}-${n}`;
}

/**
 * Lee las tasas activas de cat_impuestos_facturacion.
 * Devuelve { iva_pct, isr_pct }.
 */
async function leerTasas() {
  const res = await query(
    `SELECT tipo, porcentaje FROM cat_impuestos_facturacion WHERE activo = TRUE`
  );
  const tasas = { iva_pct: 0.16, isr_pct: 0.0125 };
  for (const row of res.rows) {
    if (row.tipo === 'iva')          tasas.iva_pct = parseFloat(row.porcentaje);
    if (row.tipo === 'isr_retencion') tasas.isr_pct = parseFloat(row.porcentaje);
  }
  return tasas;
}

// ── Helper interno: crear factura dentro de una transacción existente ─────────
/**
 * Crea un registro en `facturas` usando un client de BD ya en transacción.
 * No valida RFC porque puede tratarse de un cliente aún incompleto (pendiente).
 *
 * @param {object} client  - Cliente pg en transacción activa
 * @param {object} opts
 * @param {'venta'|'pedido'|'cotizacion'} opts.tipo_origen
 * @param {number|null} opts.venta_id
 * @param {number|null} opts.pedido_id
 * @param {number|null} opts.cotizacion_id
 * @param {number} opts.cliente_id
 * @param {number} opts.subtotal
 * @param {number|null} opts.usuario_id
 * @param {string|null} opts.usuario_nombre
 * @param {string|null} opts.notas
 * @returns {Promise<object>} Fila insertada en facturas
 */
async function crearFacturaEnTransaccion(client, {
  tipo_origen, venta_id = null, pedido_id = null, cotizacion_id = null,
  cliente_id, subtotal, usuario_id = null, usuario_nombre = null, notas = null,
}) {
  const cliRes = await client.query(
    `SELECT id, razon_social, rfc, regimen_fiscal, uso_cfdi,
            direccion_codigo_postal, nombre_comercial
       FROM clientes WHERE id = $1 AND activo = TRUE`,
    [cliente_id]
  );
  if (cliRes.rows.length === 0) throw new Error(`Cliente ${cliente_id} no encontrado para facturación`);
  const c = cliRes.rows[0];

  const tasas    = await leerTasas();
  const sub      = parseFloat(subtotal);
  const iva_monto = parseFloat((sub * tasas.iva_pct).toFixed(2));
  const isr_monto = parseFloat((sub * tasas.isr_pct).toFixed(2));
  const total     = parseFloat((sub + iva_monto - isr_monto).toFixed(2));
  const folio     = await generarFolio(client);

  const ins = await client.query(
    `INSERT INTO facturas (
        folio, estatus, tipo_origen,
        venta_id, pedido_id, cotizacion_id,
        cliente_id, cliente_nombre, cliente_rfc,
        cliente_razon_social, cliente_regimen, cliente_uso_cfdi, cliente_cp,
        subtotal, iva_pct, iva_monto, isr_pct, isr_monto, total_factura,
        creado_por_id, creado_por_nombre, notas
     ) VALUES (
        $1,'pendiente',$2,
        $3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,
        $19,$20,$21
     ) RETURNING *`,
    [
      folio, tipo_origen,
      venta_id, pedido_id, cotizacion_id,
      cliente_id,
      c.nombre_comercial || c.razon_social || '',
      c.rfc || '',
      c.razon_social || '',
      c.regimen_fiscal || '',
      c.uso_cfdi || '',
      c.direccion_codigo_postal || '',
      sub, tasas.iva_pct, iva_monto, tasas.isr_pct, isr_monto, total,
      usuario_id, usuario_nombre, notas,
    ]
  );
  const facturaId = ins.rows[0].id;

  // Actualizar el origen con el factura_id
  if (tipo_origen === 'venta' && venta_id) {
    await client.query(`UPDATE pos_ventas SET factura_id = $1 WHERE id = $2`, [facturaId, venta_id]);
  } else if (tipo_origen === 'pedido' && pedido_id) {
    await client.query(`UPDATE pos_pedidos SET factura_id = $1 WHERE id = $2`, [facturaId, pedido_id]);
  } else if (tipo_origen === 'cotizacion' && cotizacion_id) {
    await client.query(`UPDATE pos_cotizaciones SET factura_id = $1 WHERE id = $2`, [facturaId, cotizacion_id]);
  }

  return ins.rows[0];
}
exports.crearFacturaEnTransaccion = crearFacturaEnTransaccion;

// ── Calcular impuestos (endpoint utilitario) ──────────────────────────────────

exports.calcularImpuestos = async (req, res) => {
  try {
    const subtotal = parseFloat(req.body.subtotal || req.query.subtotal);
    if (isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json(createErrorResponse('El subtotal debe ser un número positivo'));
    }
    const tasas = await leerTasas();
    const iva_monto   = parseFloat((subtotal * tasas.iva_pct).toFixed(2));
    const isr_monto   = parseFloat((subtotal * tasas.isr_pct).toFixed(2));
    const total       = parseFloat((subtotal + iva_monto - isr_monto).toFixed(2));
    return res.json(createResponse(true, {
      subtotal,
      iva_pct: tasas.iva_pct,
      iva_monto,
      isr_pct: tasas.isr_pct,
      isr_monto,
      total
    }));
  } catch (err) {
    console.error('[facturasController] calcularImpuestos:', err);
    return res.status(500).json(createErrorResponse('Error al calcular impuestos'));
  }
};

// ── Leer tasas vigentes ───────────────────────────────────────────────────────

exports.getTasas = async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, tipo, porcentaje, activo, fecha_modificacion
         FROM cat_impuestos_facturacion
        ORDER BY tipo`
    );
    return res.json(createResponse(true, result.rows));
  } catch (err) {
    console.error('[facturasController] getTasas:', err);
    return res.status(500).json(createErrorResponse('Error al leer tasas'));
  }
};

// ── Actualizar tasa (solo admin) ──────────────────────────────────────────────

exports.updateTasa = async (req, res) => {
  const { id } = req.params;
  const { porcentaje } = req.body;
  const pct = parseFloat(porcentaje);
  if (isNaN(pct) || pct < 0 || pct > 1) {
    return res.status(400).json(createErrorResponse('El porcentaje debe ser un valor entre 0 y 1 (ej: 0.16)'));
  }
  try {
    const result = await query(
      `UPDATE cat_impuestos_facturacion
          SET porcentaje = $1, fecha_modificacion = NOW()
        WHERE id = $2
       RETURNING *`,
      [pct, id]
    );
    if (result.rows.length === 0) return res.status(404).json(createErrorResponse('Tasa no encontrada'));
    return res.json(createResponse(true, result.rows[0]));
  } catch (err) {
    console.error('[facturasController] updateTasa:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar tasa'));
  }
};

// ── Crear factura ─────────────────────────────────────────────────────────────

exports.createFactura = async (req, res) => {
  const {
    tipo_origen,
    venta_id,
    pedido_id,
    cotizacion_id,
    cliente_id,
    subtotal,
    notas,
  } = req.body;

  // Validaciones básicas
  if (!['venta', 'pedido', 'cotizacion'].includes(tipo_origen)) {
    return res.status(400).json(createErrorResponse('tipo_origen inválido'));
  }
  if (!cliente_id) {
    return res.status(400).json(createErrorResponse('Se requiere un cliente registrado para facturar'));
  }
  if (!subtotal || parseFloat(subtotal) <= 0) {
    return res.status(400).json(createErrorResponse('subtotal inválido'));
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Contexto de usuario para trigger_auditoria()
    const _aId   = req.user?.id   ? parseInt(req.user.id).toString()                      : '';
    const _aName = String(req.user?.nombre || req.user?.username || '').substring(0, 255).replace(/'/g, "''");
    await client.query(`SET LOCAL app.current_user_id     = '${_aId}'`);
    await client.query(`SET LOCAL app.current_user_nombre = '${_aName}'`);

    // Verificar que el cliente tiene datos fiscales completos
    const clienteRes = await client.query(
      `SELECT id, razon_social, rfc, regimen_fiscal, uso_cfdi, 
              direccion_codigo_postal, nombre_comercial
         FROM clientes WHERE id = $1 AND activo = TRUE`,
      [cliente_id]
    );
    if (clienteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json(createErrorResponse('Cliente no encontrado'));
    }
    const cliente = clienteRes.rows[0];
    if (!cliente.rfc || !cliente.regimen_fiscal || !cliente.uso_cfdi) {
      await client.query('ROLLBACK');
      return res.status(422).json(createErrorResponse(
        'El cliente no tiene datos fiscales completos (RFC, régimen fiscal y uso de CFDI son obligatorios)'
      ));
    }

    // Verificar que no exista ya una factura activa para este origen
    let origenCol = null;
    let origenId  = null;
    if (tipo_origen === 'venta')      { origenCol = 'venta_id';      origenId = venta_id; }
    if (tipo_origen === 'pedido')     { origenCol = 'pedido_id';     origenId = pedido_id; }
    if (tipo_origen === 'cotizacion') { origenCol = 'cotizacion_id'; origenId = cotizacion_id; }

    if (origenId) {
      const dup = await client.query(
        `SELECT id FROM facturas WHERE ${origenCol} = $1 AND estatus != 'cancelada'`,
        [origenId]
      );
      if (dup.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json(createErrorResponse('Ya existe una factura activa para este registro'));
      }
    }

    // Calcular impuestos con tasas actuales
    const tasas = await leerTasas();
    const sub       = parseFloat(subtotal);
    const iva_monto = parseFloat((sub * tasas.iva_pct).toFixed(2));
    const isr_monto = parseFloat((sub * tasas.isr_pct).toFixed(2));
    const total     = parseFloat((sub + iva_monto - isr_monto).toFixed(2));

    // Generar folio
    const folio = await generarFolio(client);

    // Insertar factura
    const insertRes = await client.query(
      `INSERT INTO facturas (
          folio, estatus, tipo_origen,
          venta_id, pedido_id, cotizacion_id,
          cliente_id, cliente_nombre, cliente_rfc,
          cliente_razon_social, cliente_regimen, cliente_uso_cfdi, cliente_cp,
          subtotal, iva_pct, iva_monto, isr_pct, isr_monto, total_factura,
          creado_por_id, creado_por_nombre, notas
       ) VALUES (
          $1,'pendiente',$2,
          $3,$4,$5,
          $6,$7,$8,
          $9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,
          $19,$20,$21
       ) RETURNING *`,
      [
        folio, tipo_origen,
        venta_id || null, pedido_id || null, cotizacion_id || null,
        cliente_id,
        cliente.nombre_comercial || cliente.razon_social,
        cliente.rfc,
        cliente.razon_social,
        cliente.regimen_fiscal,
        cliente.uso_cfdi,
        cliente.direccion_codigo_postal,
        sub, tasas.iva_pct, iva_monto, tasas.isr_pct, isr_monto, total,
        req.user?.id || null, req.user?.nombre || req.user?.username || null,
        notas || null,
      ]
    );
    const facturaId = insertRes.rows[0].id;

    // Actualizar origen con factura_id y requiere_factura = TRUE
    if (tipo_origen === 'venta' && venta_id) {
      await client.query(
        `UPDATE pos_ventas SET factura_id = $1, requiere_factura = TRUE WHERE id = $2`,
        [facturaId, venta_id]
      );
    } else if (tipo_origen === 'pedido' && pedido_id) {
      await client.query(
        `UPDATE pos_pedidos SET factura_id = $1 WHERE id = $2`,
        [facturaId, pedido_id]
      );
    } else if (tipo_origen === 'cotizacion' && cotizacion_id) {
      await client.query(
        `UPDATE pos_cotizaciones SET factura_id = $1, requiere_factura = TRUE WHERE id = $2`,
        [facturaId, cotizacion_id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json(createResponse(true, insertRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[facturasController] createFactura:', err);
    return res.status(500).json(createErrorResponse('Error al crear la factura'));
  } finally {
    client.release();
  }
};

// ── Listar facturas ───────────────────────────────────────────────────────────

exports.listFacturas = async (req, res) => {
  try {
    const {
      estatus, tipo_origen, cliente_id,
      fecha_inicio, fecha_fin, folio,
      page = 1, limit = 20,
    } = req.query;

    const conditions = [];
    const params     = [];
    let idx = 1;

    if (estatus)      { conditions.push(`f.estatus = $${idx++}`);              params.push(estatus); }
    if (tipo_origen)  { conditions.push(`f.tipo_origen = $${idx++}`);          params.push(tipo_origen); }
    if (cliente_id)   { conditions.push(`f.cliente_id = $${idx++}`);           params.push(parseInt(cliente_id)); }
    if (folio)        { conditions.push(`f.folio ILIKE $${idx++}`);            params.push(`%${folio}%`); }
    if (fecha_inicio) { conditions.push(`f.fecha_creacion >= $${idx++}`);      params.push(fecha_inicio); }
    if (fecha_fin)    { conditions.push(`f.fecha_creacion <= $${idx++} + INTERVAL '1 day'`); params.push(fecha_fin); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRes = await query(
      `SELECT COUNT(*) FROM facturas f ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const dataRes = await query(
      `SELECT f.id, f.folio, f.estatus, f.tipo_origen,
              f.venta_id, f.pedido_id, f.cotizacion_id,
              f.cliente_id, f.cliente_nombre, f.cliente_rfc, f.cliente_razon_social,
              f.subtotal, f.iva_pct, f.iva_monto, f.isr_pct, f.isr_monto, f.total_factura,
              f.uuid_cfdi, f.pdf_url, f.fecha_timbrado,
              f.creado_por_nombre, f.notas, f.fecha_creacion
         FROM facturas f
        ${where}
        ORDER BY f.fecha_creacion DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json(createResponse(true, {
      data: dataRes.rows,
      total,
      page: parseInt(page),
      totalPags: Math.ceil(total / parseInt(limit)),
    }));
  } catch (err) {
    console.error('[facturasController] listFacturas:', err);
    return res.status(500).json(createErrorResponse('Error al listar facturas'));
  }
};

// ── Detalle de factura ────────────────────────────────────────────────────────

exports.getFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT f.*,
              pv.folio AS venta_folio,
              pp.folio AS pedido_folio,
              pc.folio AS cotizacion_folio
         FROM facturas f
         LEFT JOIN pos_ventas      pv ON pv.id = f.venta_id
         LEFT JOIN pos_pedidos     pp ON pp.id = f.pedido_id
         LEFT JOIN pos_cotizaciones pc ON pc.id = f.cotizacion_id
        WHERE f.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json(createErrorResponse('Factura no encontrada'));
    return res.json(createResponse(true, result.rows[0]));
  } catch (err) {
    console.error('[facturasController] getFactura:', err);
    return res.status(500).json(createErrorResponse('Error al obtener la factura'));
  }
};

// ── Marcar como generada ──────────────────────────────────────────────────────

exports.marcarGenerada = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await queryAudit(
      `UPDATE facturas
          SET estatus = 'generada', fecha_modificacion = NOW()
        WHERE id = $1 AND estatus = 'pendiente'
       RETURNING *`,
      [id], req.user?.id, req.user?.nombre || req.user?.username
    );
    if (result.rows.length === 0) {
      return res.status(409).json(createErrorResponse('Solo se pueden marcar como generadas las facturas en estado pendiente'));
    }
    return res.json(createResponse(true, result.rows[0]));
  } catch (err) {
    console.error('[facturasController] marcarGenerada:', err);
    return res.status(500).json(createErrorResponse('Error al actualizar la factura'));
  }
};

// ── Cancelar factura ──────────────────────────────────────────────────────────

exports.cancelarFactura = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json(createErrorResponse('Se requiere un motivo de cancelación (mínimo 5 caracteres)'));
  }
  try {
    const result = await queryAudit(
      `UPDATE facturas
          SET estatus = 'cancelada', motivo_cancelacion = $1, fecha_modificacion = NOW()
        WHERE id = $2 AND estatus != 'cancelada'
       RETURNING *`,
      [motivo.trim(), id], req.user?.id, req.user?.nombre || req.user?.username
    );
    if (result.rows.length === 0) return res.status(404).json(createErrorResponse('Factura no encontrada o ya cancelada'));
    return res.json(createResponse(true, result.rows[0]));
  } catch (err) {
    console.error('[facturasController] cancelarFactura:', err);
    return res.status(500).json(createErrorResponse('Error al cancelar la factura'));
  }
};
