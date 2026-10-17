/**
 * Controlador de Reportes - SuperCopias
 * Base URL: /api/reportes
 *
 * Genera reportes en formato JSON (preview), PDF o Excel.
 * Cada endpoint acepta el parámetro ?formato=pdf|xlsx
 * Sin formato → devuelve JSON para preview en tabla Angular.
 *
 * Reportes disponibles:
 *   GET /ventas           – Lista de ventas filtrada por período, vendedor, etc.
 *   GET /corte-caja       – Resumen + detalle de cobros (rango de fechas y horario/turno opcional)
 *   GET /productos        – Productos / servicios más vendidos (filtro por departamento, incluye ítems libres)
 *   GET /clientes         – Resumen de compras por cliente
 *   GET /inventario       – Stock actual con nivel de riesgo
 *   GET /movimientos      – Movimientos de inventario por período
 *   GET /bitacora         – Bitácora de acciones del sistema
 */

const { query } = require('../config/database');
const { createErrorResponse } = require('../utils/apiStandard');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────
const COMPANY = 'SuperCopias';
const MAX_ROWS = 5000; // Límite de seguridad para reportes

// ─────────────────────────────────────────────────────────────
// Helpers de formato
// ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Mexico_City'
  });
}
function fmtDatetime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Mexico_City'
  });
}
function fmtCurrency(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
}
function fmtNum(n, decimals = 2) {
  if (n === null || n === undefined) return '';
  return parseFloat(n).toFixed(decimals);
}
function trunc(str, max = 30) {
  if (!str) return '';
  str = String(str);
  return str.length > max ? str.slice(0, max - 2) + '..' : str;
}

// ─────────────────────────────────────────────────────────────
// Helpers de fechas
// ─────────────────────────────────────────────────────────────
function buildDateRange(desde, hasta) {
  // Obtener la fecha actual en zona horaria de México (CST = UTC-6, sin horario de verano desde oct 2022)
  const todayMX = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const d = new Date((desde || todayMX) + 'T00:00:00-06:00');
  const h = new Date((hasta || todayMX) + 'T23:59:59-06:00');
  return [d, h];
}

function dateMx(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Valida una hora 'HH:MM' (24 h). Devuelve null si no es válida. */
function parseHora(h) {
  const v = String(h || '').trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null;
}

function buildFileDateSuffix(desde, hasta) {
  const from = String(desde || dateMx());
  const to = String(hasta || from);
  return from === to ? from : `${from}_a_${to}`;
}

// ─────────────────────────────────────────────────────────────
// PDF Builder
// ─────────────────────────────────────────────────────────────
function initPDF(res, titulo, subtitulo = '', fileNameBase = null) {
  const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
  const safeFilename = (fileNameBase || titulo).replace(/[^a-zA-Z0-9_\-]/g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
  doc.pipe(res);

  // Header azul
  const w = doc.page.width - 80; // ancho útil
  doc.rect(40, 40, w, 50).fill('#1565C0');
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
    .text(COMPANY, 50, 52, { width: w - 20 });
  doc.fontSize(10).font('Helvetica')
    .text(titulo, 50, 70, { width: w - 20 });

  if (subtitulo) {
    doc.fillColor('#BBDEFB').fontSize(8)
      .text(subtitulo, 50, 83, { width: w - 20 });
  }

  doc.moveDown(3.5);
  doc.fillColor('#666').fontSize(8).font('Helvetica')
    .text(`Generado: ${fmtDatetime(new Date())}   |   ${COMPANY} Sistema de Gestión`, { align: 'right' });
  doc.moveDown(0.5);
  doc.fillColor('#1565C0').moveTo(40, doc.y).lineTo(40 + w, doc.y).lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fillColor('#000').font('Helvetica');
  return doc;
}

/**
 * Dibuja una tabla en el documento PDF con soporte de salto de página.
 * @param {PDFDocument} doc
 * @param {string[]} headers - Encabezados de columna
 * @param {Array[]} rows - Filas de datos (array de arrays)
 * @param {number[]} colWidths - Ancho por columna en pt
 * @param {object} opts
 */
function drawTable(doc, headers, rows, colWidths, opts = {}) {
  const {
    startX = 40,
    rowHeight = 16,
    headerBg = '#1565C0',
    headerFg = '#FFFFFF',
    altBg = '#E3F2FD',
    fontSize = 7,
  } = opts;

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const pageBottom = doc.page.height - 60;
  let y = doc.y;

  const drawHeader = (yPos) => {
    doc.rect(startX, yPos, totalWidth, rowHeight).fill(headerBg);
    let x = startX;
    headers.forEach((h, i) => {
      doc.fillColor(headerFg).fontSize(fontSize).font('Helvetica-Bold')
        .text(trunc(h, 28), x + 2, yPos + 4, { width: colWidths[i] - 4, lineBreak: false });
      x += colWidths[i];
    });
    return yPos + rowHeight;
  };

  y = drawHeader(y);

  rows.forEach((row, ri) => {
    // Salto de página
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = 50;
      y = drawHeader(y);
    }
    // Fila alternada
    if (ri % 2 === 1) {
      doc.rect(startX, y, totalWidth, rowHeight).fill(altBg);
    }
    // Borde inferior
    doc.rect(startX, y, totalWidth, rowHeight).stroke('#D0D0D0');

    let x = startX;
    row.forEach((cell, ci) => {
      doc.fillColor('#333').fontSize(fontSize).font('Helvetica')
        .text(trunc(String(cell ?? ''), 32), x + 2, y + 4, {
          width: colWidths[ci] - 4,
          lineBreak: false
        });
      x += colWidths[ci];
    });
    y += rowHeight;
  });

  doc.y = y + 6;
}

/**
 * Agrega una fila de totales al PDF.
 */
function drawTotalsRow(doc, labels, colWidths, opts = {}) {
  const { startX = 40, rowHeight = 18, bg = '#0D47A1', fg = '#FFFFFF', fontSize = 8 } = opts;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let y = doc.y;
  doc.rect(startX, y, totalWidth, rowHeight).fill(bg);
  let x = startX;
  labels.forEach((lbl, i) => {
    doc.fillColor(fg).fontSize(fontSize).font('Helvetica-Bold')
      .text(String(lbl ?? ''), x + 2, y + 4, { width: colWidths[i] - 4, lineBreak: false });
    x += colWidths[i];
  });
  doc.y = y + rowHeight + 6;
}

// ─────────────────────────────────────────────────────────────
// Excel Builder
// ─────────────────────────────────────────────────────────────
async function sendExcel(res, titulo, sheetName, headers, rows, colWidths = [], extraSheets = [], fileNameBase = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = COMPANY;
  wb.created = new Date();

  /**
   * Agrega una hoja de cálculo con estilo corporativo.
   */
  const addSheet = (name, hdrs, dataRows, widths) => {
    const ws = wb.addWorksheet(name);

    // Fila 1: título
    ws.mergeCells(1, 1, 1, hdrs.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `${COMPANY} — ${titulo}`;
    titleCell.font = { bold: true, size: 13, color: { argb: 'FF1565C0' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;

    // Fila 2: timestamp + filtros
    ws.mergeCells(2, 1, 2, hdrs.length);
    const infoCell = ws.getCell(2, 1);
    infoCell.value = `Generado: ${fmtDatetime(new Date())}`;
    infoCell.font = { size: 9, color: { argb: 'FF666666' } };
    infoCell.alignment = { horizontal: 'right' };

    // Fila 3 en blanco
    ws.getRow(3).height = 4;

    // Fila 4: encabezados
    const headerRow = ws.getRow(4);
    hdrs.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF0D47A1' } } };
      ws.getColumn(i + 1).width = widths[i] || 16;
    });
    headerRow.height = 20;
    ws.views = [{ state: 'frozen', ySplit: 4 }];

    // Datos
    dataRows.forEach((row, ri) => {
      const wsRow = ws.addRow(row);
      const isAlt = ri % 2 === 1;
      wsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (isAlt) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
        }
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFBDBDBD' } } };
        // Alineación de números
        if (typeof row[colNum - 1] === 'number') {
          cell.alignment = { horizontal: 'right' };
          cell.numFmt = row[colNum - 1] % 1 !== 0 ? '#,##0.00' : '#,##0';
        }
      });
    });

    // Auto-filter en encabezados
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: hdrs.length } };
    return ws;
  };

  addSheet(sheetName, headers, rows, colWidths);

  // Hojas adicionales opcionales (ej. Corte de caja)
  extraSheets.forEach(s => addSheet(s.name, s.headers, s.rows, s.colWidths || []));

  const safeFilename = (fileNameBase || titulo).replace(/[^a-zA-Z0-9_\-]/g, '-');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

// ─────────────────────────────────────────────────────────────
// 1. Ventas por período
// ─────────────────────────────────────────────────────────────
async function getReporteVentas(req, res) {
  try {
    const { desde, hasta, vendedor_id, cliente_id, metodo_pago, estatus, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const nombreArchivo = `Reporte-Ventas-${buildFileDateSuffix(desde, hasta)}`;

    const params = [d, h];
    let paramIdx = 3;
    const conditions = ['v.fecha_venta BETWEEN $1 AND $2'];

    if (vendedor_id) { conditions.push(`v.vendedor_usuario_id = $${paramIdx++}`); params.push(vendedor_id); }
    if (cliente_id)  { conditions.push(`v.cliente_id = $${paramIdx++}`);          params.push(cliente_id); }
    if (metodo_pago) { conditions.push(`v.metodo_pago_codigo = $${paramIdx++}`);  params.push(metodo_pago); }
    if (estatus)     { conditions.push(`v.estatus = $${paramIdx++}`);              params.push(estatus); }
    else             { conditions.push(`v.estatus = 'completada'`); }

    const sql = `
      SELECT v.folio, v.fecha_venta, v.cliente_nombre,
             v.vendedor_nombre, v.metodo_pago_descripcion,
             v.subtotal, v.descuento_monto, v.iva_monto, v.total, v.estatus
      FROM pos_ventas v
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.fecha_venta DESC
      LIMIT ${MAX_ROWS}
    `;

    const { rows } = await query(sql, params);

    // Totales
    const totalIngresos = rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const totalDescuentos = rows.reduce((s, r) => s + parseFloat(r.descuento_monto || 0), 0);

    if (formato === 'xlsx') {
      const headers = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'M.Pago', 'Subtotal', 'Descuento', 'IVA', 'Total'];
      const dataRows = rows.map(r => [
        r.folio, fmtDatetime(r.fecha_venta), r.cliente_nombre || '—', r.vendedor_nombre || '—',
        r.metodo_pago_descripcion || '—',
        parseFloat(r.subtotal || 0), parseFloat(r.descuento_monto || 0),
        parseFloat(r.iva_monto || 0), parseFloat(r.total || 0)
      ]);
      // Fila de totales
      dataRows.push(['', '', '', '', 'TOTAL', '', parseFloat(totalDescuentos.toFixed(2)), '', parseFloat(totalIngresos.toFixed(2))]);
      return sendExcel(res, 'Reporte de Ventas', 'Ventas',
        headers, dataRows, [14, 18, 22, 18, 14, 12, 12, 10, 12], [], nombreArchivo);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Reporte de Ventas',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} ventas  |  Total: ${fmtCurrency(totalIngresos)}`,
        nombreArchivo);
      const headers = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'M.Pago', 'Subtotal', 'Desc.', 'Total'];
      const colW = [75, 85, 90, 80, 60, 50, 45, 55];
      const dataRows = rows.map(r => [
        r.folio, fmtDatetime(r.fecha_venta), r.cliente_nombre || '—', r.vendedor_nombre || '—',
        r.metodo_pago_descripcion || '—',
        fmtCurrency(r.subtotal), fmtCurrency(r.descuento_monto), fmtCurrency(r.total)
      ]);
      drawTable(doc, headers, dataRows, colW);
      drawTotalsRow(doc, ['TOTALES', '', '', '', '', '', fmtCurrency(totalDescuentos), fmtCurrency(totalIngresos)], colW);
      doc.end();
      return;
    }

    // JSON preview
    return res.json({
      ok: true,
      data: {
        rows,
        resumen: {
          total_registros: rows.length,
          total_ingresos: parseFloat(totalIngresos.toFixed(2)),
          total_descuentos: parseFloat(totalDescuentos.toFixed(2)),
          periodo: { desde: d, hasta: h }
        }
      }
    });
  } catch (err) {
    console.error('reportes/ventas error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de ventas', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Corte de caja
// ─────────────────────────────────────────────────────────────
async function getReporteCorteCaja(req, res) {
  try {
    const { fecha, vendedor_id, formato } = req.query;
    // Rango de fechas (desde/hasta). `fecha` se conserva por compatibilidad (un solo día).
    let desde = req.query.desde || fecha || dateMx();
    let hasta = req.query.hasta || fecha || desde;
    if (desde > hasta) [desde, hasta] = [hasta, desde];

    // Horario / turno opcional: se aplica a cada día del rango (ej. 07:00–14:00 de cada día).
    const horaDesde = parseHora(req.query.hora_desde) || '00:00';
    const horaHasta = parseHora(req.query.hora_hasta) || '23:59';
    const usaHorario = !(horaDesde === '00:00' && horaHasta === '23:59');
    if (usaHorario && horaDesde >= horaHasta) {
      return res.status(400).json(createErrorResponse('La hora inicial debe ser menor que la hora final'));
    }

    const [d, h] = buildDateRange(desde, hasta);
    const horarioArchivo = usaHorario ? `_${horaDesde.replace(':', '-')}_a_${horaHasta.replace(':', '-')}` : '';
    const nombreArchivoCorte = `Corte-de-Caja-${buildFileDateSuffix(desde, hasta)}${horarioArchivo}`;
    const periodoLabel = desde === hasta ? fmtDate(d) : `${fmtDate(d)} al ${fmtDate(h)}`;
    const horarioLabel = usaHorario ? `${horaDesde} a ${horaHasta} hrs` : 'Todo el día';

    const params = [d, h];
    let pidx = 3;

    // Condición de horario sobre la hora local (México). Fin exclusivo, salvo 23:59 que cubre hasta el final del día.
    let horaCond = () => '';
    if (usaHorario) {
      const iDesde = pidx, iHasta = pidx + 1;
      params.push(horaDesde, horaHasta === '23:59' ? '23:59:59.999999' : horaHasta);
      pidx += 2;
      const opFin = horaHasta === '23:59' ? '<=' : '<';
      horaCond = (col) => `AND (${col} AT TIME ZONE 'America/Mexico_City')::time >= $${iDesde}::time
          AND (${col} AT TIME ZONE 'America/Mexico_City')::time ${opFin} $${iHasta}::time`;
    }
    const horaVenta = horaCond('v.fecha_venta');
    const horaPago = horaCond('pp.fecha_pago');

    const vendedorCond = vendedor_id ? `AND v.vendedor_usuario_id = $${pidx}` : '';
    if (vendedor_id) params.push(vendedor_id);
    const vendedorCondArqueoVentas = vendedor_id ? `AND v.vendedor_usuario_id = $${pidx}` : '';
    const vendedorCondArqueoAnticipo = vendedor_id ? `AND ped.creado_por_id = $${pidx}` : '';
    const vendedorCondArqueoSaldo = vendedor_id ? `AND ped.entregado_por_id = $${pidx}` : '';

    // Resumen general
    const { rows: [resumen] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE estatus='completada') AS ventas_completadas,
        COUNT(*) FILTER (WHERE estatus='cancelada')  AS ventas_canceladas,
        COALESCE(SUM(total)         FILTER (WHERE estatus='completada'), 0) AS total_ingresos,
        COALESCE(SUM(descuento_monto) FILTER (WHERE estatus='completada'), 0) AS total_descuentos,
        COALESCE(SUM(iva_monto)      FILTER (WHERE estatus='completada'), 0) AS total_iva,
        COALESCE(SUM(total)         FILTER (WHERE estatus='cancelada'), 0) AS total_cancelado
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 ${horaVenta} ${vendedorCond}
    `, params);

    // Por método de pago
    const { rows: metodosPago } = await query(`
      SELECT metodo_pago_descripcion AS metodo, COUNT(*) AS cantidad,
             SUM(total) AS total
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estatus='completada' ${horaVenta} ${vendedorCond}
      GROUP BY metodo_pago_descripcion ORDER BY total DESC
    `, params);

    // Por vendedor
    const { rows: vendedores } = await query(`
      SELECT vendedor_nombre AS vendedor, COUNT(*) AS ventas,
             SUM(total) AS total
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estatus='completada' ${horaVenta} ${vendedorCond}
      GROUP BY vendedor_nombre ORDER BY total DESC
    `, params);

    // Detalle ventas
    const { rows: ventas } = await query(`
      SELECT v.folio, v.fecha_venta, v.cliente_nombre, v.vendedor_nombre,
             v.metodo_pago_descripcion, v.total, v.estatus
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 ${horaVenta} ${vendedorCond}
      ORDER BY v.fecha_venta
      LIMIT ${MAX_ROWS}
    `, params);

    // Arqueo físico del día (movimientos reales de caja por método)
    const arqueoMovimientosSQL = `
      WITH movs AS (
        -- Ventas rápidas / cotización convertida: pagos reales de pos_ventas_pagos
        SELECT
          v.fecha_venta AS fecha_evento,
          v.folio AS referencia,
          v.vendedor_nombre,
          'venta'::text AS origen,
          p.metodo_pago_codigo,
          COALESCE(NULLIF(TRIM(p.metodo_pago_descripcion), ''), p.metodo_pago_codigo) AS metodo_pago_descripcion,
          p.monto::numeric AS monto
        FROM pos_ventas_pagos p
        JOIN pos_ventas v ON v.id = p.venta_id
        WHERE v.estatus = 'completada'
          AND v.origen_venta IN ('directa', 'cotizacion')
          AND v.fecha_venta BETWEEN $1 AND $2
          ${horaVenta}
          ${vendedorCondArqueoVentas}

        UNION ALL

        -- Anticipos de pedidos: se reconocen en la fecha real del pago (fecha_pago)
        -- Así los anticipos editados hoy aparecen en el corte de hoy aunque el pedido sea de otro día
        SELECT
          pp.fecha_pago AS fecha_evento,
          ped.folio AS referencia,
          ped.creado_por_nombre AS vendedor_nombre,
          'anticipo_pedido'::text AS origen,
          pp.metodo_pago_codigo,
          COALESCE(NULLIF(TRIM(pp.metodo_pago_descripcion), ''), pp.metodo_pago_codigo) AS metodo_pago_descripcion,
          pp.monto::numeric AS monto
        FROM pos_pedidos_pagos pp
        JOIN pos_pedidos ped ON ped.id = pp.pedido_id
        WHERE pp.tipo = 'anticipo'
          AND pp.anulado = false
          AND pp.fecha_pago BETWEEN $1 AND $2
          ${horaPago}
          ${vendedorCondArqueoAnticipo}

        UNION ALL

        -- Saldo de pedidos entregados: se reconoce en la fecha real del pago (fecha_pago)
        SELECT
          pp.fecha_pago AS fecha_evento,
          ped.folio AS referencia,
          ped.entregado_por_nombre AS vendedor_nombre,
          'saldo_pedido'::text AS origen,
          pp.metodo_pago_codigo,
          COALESCE(NULLIF(TRIM(pp.metodo_pago_descripcion), ''), pp.metodo_pago_codigo) AS metodo_pago_descripcion,
          pp.monto::numeric AS monto
        FROM pos_pedidos_pagos pp
        JOIN pos_pedidos ped ON ped.id = pp.pedido_id
        WHERE pp.tipo = 'saldo'
          AND pp.anulado = false
          AND pp.fecha_pago BETWEEN $1 AND $2
          ${horaPago}
          ${vendedorCondArqueoSaldo}
      )
    `;

    const { rows: arqueoResumenRows } = await query(`
      ${arqueoMovimientosSQL}
      SELECT
        COALESCE(SUM(monto), 0) AS total_cobrado,
        COALESCE(SUM(monto) FILTER (WHERE origen = 'venta'), 0) AS total_ventas_directas,
        COALESCE(SUM(monto) FILTER (WHERE origen = 'anticipo_pedido'), 0) AS total_anticipos_pedidos,
        COALESCE(SUM(monto) FILTER (WHERE origen = 'saldo_pedido'), 0) AS total_saldos_pedidos
      FROM movs
    `, params);

    const { rows: arqueoMetodos } = await query(`
      ${arqueoMovimientosSQL}
      SELECT
        metodo_pago_codigo,
        metodo_pago_descripcion,
        COUNT(*) AS movimientos,
        COALESCE(SUM(monto), 0) AS total
      FROM movs
      GROUP BY metodo_pago_codigo, metodo_pago_descripcion
      ORDER BY total DESC
    `, params);

    const { rows: arqueoOrigenes } = await query(`
      ${arqueoMovimientosSQL}
      SELECT
        origen,
        COUNT(*) AS movimientos,
        COALESCE(SUM(monto), 0) AS total
      FROM movs
      GROUP BY origen
      ORDER BY total DESC
    `, params);

    const { rows: arqueoMovimientos } = await query(`
      ${arqueoMovimientosSQL}
      SELECT
        fecha_evento,
        referencia,
        vendedor_nombre,
        origen,
        metodo_pago_codigo,
        metodo_pago_descripcion,
        monto
      FROM movs
      ORDER BY fecha_evento ASC
      LIMIT ${MAX_ROWS}
    `, params);

    const arqueoResumenDB = arqueoResumenRows[0] || {};
    const arqueoResumen = {
      total_cobrado: parseFloat(arqueoResumenDB.total_cobrado || 0),
      total_ventas_directas: parseFloat(arqueoResumenDB.total_ventas_directas || 0),
      total_anticipos_pedidos: parseFloat(arqueoResumenDB.total_anticipos_pedidos || 0),
      total_saldos_pedidos: parseFloat(arqueoResumenDB.total_saldos_pedidos || 0),
      total_efectivo: 0,
      total_tarjeta_debito: 0,
      total_tarjeta_credito: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
    };

    for (const m of arqueoMetodos) {
      const codigo = String(m.metodo_pago_codigo || '').toLowerCase();
      const totalMetodo = parseFloat(m.total || 0);
      if (codigo === 'efectivo') arqueoResumen.total_efectivo += totalMetodo;
      else if (codigo === 'transferencia') arqueoResumen.total_transferencia += totalMetodo;
      else if (codigo === 'tarjeta_debito') {
        arqueoResumen.total_tarjeta_debito += totalMetodo;
        arqueoResumen.total_tarjeta += totalMetodo;
      } else if (['tarjeta', 'tarjeta_credito'].includes(codigo)) {
        // Compatibilidad: algunos registros históricos usan codigo "tarjeta".
        arqueoResumen.total_tarjeta_credito += totalMetodo;
        arqueoResumen.total_tarjeta += totalMetodo;
      }
    }

    arqueoResumen.total_efectivo = parseFloat(arqueoResumen.total_efectivo.toFixed(2));
    arqueoResumen.total_tarjeta_debito = parseFloat(arqueoResumen.total_tarjeta_debito.toFixed(2));
    arqueoResumen.total_tarjeta_credito = parseFloat(arqueoResumen.total_tarjeta_credito.toFixed(2));
    arqueoResumen.total_tarjeta = parseFloat(arqueoResumen.total_tarjeta.toFixed(2));
    arqueoResumen.total_transferencia = parseFloat(arqueoResumen.total_transferencia.toFixed(2));

    const subtitulo = `Periodo: ${periodoLabel}  |  Horario: ${horarioLabel}  |  Ventas: ${resumen.ventas_completadas}  |  Total cobrado: ${fmtCurrency(arqueoResumen.total_cobrado)}`;

    if (formato === 'xlsx') {
      const origenLabel = (origen) => ({
        venta: 'Venta mostrador/cotización',
        anticipo_pedido: 'Anticipo cobrado',
        saldo_pedido: 'Saldo cobrado',
      }[origen] || origen);

      const extraSheets = [
        {
          name: 'Por Método de Pago',
          headers: ['Método de Pago', 'Cantidad', 'Total'],
          rows: metodosPago.map(r => [r.metodo, parseInt(r.cantidad), parseFloat(r.total)]),
          colWidths: [28, 14, 16]
        },
        {
          name: 'Por Vendedor',
          headers: ['Vendedor', 'Ventas', 'Total'],
          rows: vendedores.map(r => [r.vendedor, parseInt(r.ventas), parseFloat(r.total)]),
          colWidths: [28, 12, 16]
        },
        {
          name: 'Detalle Ventas',
          headers: ['Folio', 'Fecha/Hora', 'Cliente', 'Vendedor', 'M.Pago', 'Total', 'Estatus'],
          rows: ventas.map(r => [r.folio, fmtDatetime(r.fecha_venta), r.cliente_nombre || '—',
            r.vendedor_nombre || '—', r.metodo_pago_descripcion || '—',
            parseFloat(r.total), r.estatus]),
          colWidths: [14, 18, 22, 18, 16, 12, 12]
        },
        {
          name: 'Cobros por Método',
          headers: ['Código', 'Método de Pago', 'Movimientos', 'Total'],
          rows: arqueoMetodos.map(r => [
            r.metodo_pago_codigo,
            r.metodo_pago_descripcion,
            parseInt(r.movimientos),
            parseFloat(r.total),
          ]),
          colWidths: [20, 26, 14, 16]
        },
        {
          name: 'Detalle Cobros',
          headers: ['Fecha/Hora', 'Origen', 'Referencia', 'Vendedor', 'Código', 'Método', 'Monto'],
          rows: arqueoMovimientos.map(r => [
            fmtDatetime(r.fecha_evento),
            origenLabel(r.origen),
            r.referencia,
            r.vendedor_nombre || '—',
            r.metodo_pago_codigo,
            r.metodo_pago_descripcion,
            parseFloat(r.monto),
          ]),
          colWidths: [20, 16, 15, 20, 14, 20, 14]
        }
      ];
      const resHeaders = ['Concepto', 'Valor'];
      const resRows = [
        ['Periodo', periodoLabel],
        ['Horario', horarioLabel],
        ['Ventas completadas', parseInt(resumen.ventas_completadas)],
        ['Ventas canceladas',  parseInt(resumen.ventas_canceladas)],
        ['Total ingresos',     parseFloat(resumen.total_ingresos)],
        ['Monto cancelado (no cuenta)', parseFloat(resumen.total_cancelado)],
        ['Total descuentos',   parseFloat(resumen.total_descuentos)],
        ['Total IVA',          parseFloat(resumen.total_iva)],
        ['Total cobrado en el periodo', arqueoResumen.total_cobrado],
        ['Cobrado en efectivo', arqueoResumen.total_efectivo],
        ['Cobrado con tarjeta (débito + crédito)', arqueoResumen.total_tarjeta],
        ['   - Tarjeta débito', arqueoResumen.total_tarjeta_debito],
        ['   - Tarjeta crédito', arqueoResumen.total_tarjeta_credito],
        ['Cobrado por transferencia', arqueoResumen.total_transferencia],
        ['Anticipos cobrados', arqueoResumen.total_anticipos_pedidos],
        ['Saldos cobrados', arqueoResumen.total_saldos_pedidos],
      ];
      return sendExcel(res, 'Corte de Caja', 'Resumen General',
        resHeaders, resRows, [28, 18], extraSheets, nombreArchivoCorte);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Corte de Caja', subtitulo, nombreArchivoCorte);

      // Resumen box
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Resumen General');
      doc.moveDown(0.3);
      const resumenData = [
        ['Ventas Completadas', resumen.ventas_completadas],
        ['Ventas Canceladas',  resumen.ventas_canceladas],
        ['Total Ingresos',     fmtCurrency(resumen.total_ingresos)],
        ['Monto Cancelado (no cuenta)', fmtCurrency(resumen.total_cancelado)],
        ['Total Descuentos',   fmtCurrency(resumen.total_descuentos)],
        ['Total IVA',          fmtCurrency(resumen.total_iva)],
      ];
      drawTable(doc, ['Concepto', 'Valor'], resumenData, [200, 130], { rowHeight: 18, fontSize: 9 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Por Método de Pago');
      doc.moveDown(0.3);
      drawTable(doc, ['Método de Pago', 'Cantidad', 'Total'],
        metodosPago.map(r => [r.metodo || '—', r.cantidad, fmtCurrency(r.total)]),
        [180, 80, 130], { rowHeight: 16 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Por Vendedor');
      doc.moveDown(0.3);
      drawTable(doc, ['Vendedor', 'Ventas', 'Total'],
        vendedores.map(r => [r.vendedor || '—', r.ventas, fmtCurrency(r.total)]),
        [220, 80, 130], { rowHeight: 16 });

      const origenLabelPdf = (origen) => ({
        venta: 'Venta mostrador/cotización',
        anticipo_pedido: 'Anticipo cobrado',
        saldo_pedido: 'Saldo cobrado',
      }[origen] || origen);

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Dinero Recibido en el Periodo');
      doc.moveDown(0.3);
      drawTable(doc, ['Concepto', 'Monto'], [
        ['Total cobrado en el periodo', fmtCurrency(arqueoResumen.total_cobrado)],
        ['Cobrado en efectivo', fmtCurrency(arqueoResumen.total_efectivo)],
        ['Cobrado con tarjeta (débito + crédito)', fmtCurrency(arqueoResumen.total_tarjeta)],
        ['   - Tarjeta débito', fmtCurrency(arqueoResumen.total_tarjeta_debito)],
        ['   - Tarjeta crédito', fmtCurrency(arqueoResumen.total_tarjeta_credito)],
        ['Cobrado por transferencia', fmtCurrency(arqueoResumen.total_transferencia)],
        ['Anticipos cobrados', fmtCurrency(arqueoResumen.total_anticipos_pedidos)],
        ['Saldos cobrados', fmtCurrency(arqueoResumen.total_saldos_pedidos)],
      ], [220, 130], { rowHeight: 16 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Cobros por Método de Pago');
      doc.moveDown(0.3);
      drawTable(doc, ['Método de Pago', 'Movimientos', 'Total'],
        arqueoMetodos.map(r => [r.metodo_pago_descripcion || r.metodo_pago_codigo || '—', r.movimientos, fmtCurrency(r.total)]),
        [180, 80, 130], { rowHeight: 16 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Detalle de Cobros del Periodo');
      doc.moveDown(0.3);
      drawTable(doc,
        ['Fecha/Hora', 'Origen', 'Referencia', 'Vendedor', 'Código', 'Método', 'Monto'],
        arqueoMovimientos.map(r => [
          fmtDatetime(r.fecha_evento),
          origenLabelPdf(r.origen),
          r.referencia,
          r.vendedor_nombre || '—',
          r.metodo_pago_codigo,
          r.metodo_pago_descripcion,
          fmtCurrency(r.monto),
        ]),
        [78, 95, 65, 88, 45, 70, 62]
      );

      doc.moveDown(0.8);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Detalle de Ventas');
      doc.moveDown(0.3);
      drawTable(doc,
        ['Folio', 'Fecha/Hora', 'Cliente', 'Vendedor', 'M.Pago', 'Total', 'Estatus'],
        ventas.map(r => [r.folio, fmtDatetime(r.fecha_venta), r.cliente_nombre || '—',
          r.vendedor_nombre || '—', r.metodo_pago_descripcion || '—',
          fmtCurrency(r.total), r.estatus]),
        [70, 80, 90, 80, 60, 65, 60]);
      doc.end();
      return;
    }

    return res.json({
      ok: true,
      data: {
        periodo: {
          desde,
          hasta,
          hora_desde: usaHorario ? horaDesde : null,
          hora_hasta: usaHorario ? horaHasta : null,
          etiqueta: periodoLabel,
          horario: horarioLabel,
        },
        resumen,
        metodos_pago: metodosPago,
        vendedores,
        ventas,
        resumen_arqueo: arqueoResumen,
        arqueo_metodos_pago: arqueoMetodos.map(r => ({
          metodo_pago_codigo: r.metodo_pago_codigo,
          metodo_pago_descripcion: r.metodo_pago_descripcion,
          movimientos: parseInt(r.movimientos),
          total: parseFloat(r.total),
        })),
        arqueo_origenes: arqueoOrigenes.map(r => ({
          origen: r.origen,
          movimientos: parseInt(r.movimientos),
          total: parseFloat(r.total),
        })),
        arqueo_movimientos: arqueoMovimientos.map(r => ({
          fecha_evento: r.fecha_evento,
          referencia: r.referencia,
          vendedor_nombre: r.vendedor_nombre,
          origen: r.origen,
          metodo_pago_codigo: r.metodo_pago_codigo,
          metodo_pago_descripcion: r.metodo_pago_descripcion,
          monto: parseFloat(r.monto),
        })),
      }
    });
  } catch (err) {
    console.error('reportes/corte-caja error:', err);
    return res.status(500).json(createErrorResponse('Error al generar corte de caja', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Productos / Servicios más vendidos
// ─────────────────────────────────────────────────────────────
async function getReporteProductos(req, res) {
  try {
    const { desde, hasta, top = 50, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const topN = Math.min(parseInt(top) || 50, 500);

    // Departamento: id numérico, 'libres' (ítems no registrados en inventario) o 'sin_departamento'.
    const depRaw = String(req.query.departamento || req.query.departamento_id || '').trim();
    const departamento = /^\d+$/.test(depRaw) || ['libres', 'sin_departamento'].includes(depRaw) ? depRaw : '';

    const params = [d, h];
    let depCond = '';
    let departamentoLabel = 'Todos';
    if (departamento === 'libres') {
      depCond = 'AND d.es_item_libre = true';
      departamentoLabel = 'Ítems libres (sin inventario)';
    } else if (departamento === 'sin_departamento') {
      depCond = 'AND d.es_item_libre = false AND i.departamento_id IS NULL';
      departamentoLabel = 'Sin departamento';
    } else if (departamento) {
      params.push(parseInt(departamento));
      depCond = `AND d.es_item_libre = false AND i.departamento_id = $${params.length}`;
      const { rows: [dep] } = await query('SELECT nombre FROM inv_departamentos WHERE id = $1', [parseInt(departamento)]);
      departamentoLabel = dep?.nombre || `#${departamento}`;
    }

    const depArchivo = departamento ? `-${departamentoLabel.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
    const nombreArchivo = `Productos-mas-vendidos-${buildFileDateSuffix(desde, hasta)}${depArchivo}`;

    // Líneas de venta del periodo. Los ítems libres (es_item_libre) no tienen inventario_id:
    // se agrupan por nombre normalizado (minúsculas, sin espacios extremos) para unir "Clip" y "clip ".
    // El departamento es el actual del producto en inventario.
    const lineasSQL = `
      WITH lineas AS (
        SELECT
          v.id AS venta_id,
          d.cantidad,
          d.subtotal_linea,
          CASE WHEN d.es_item_libre THEN 'libre'
               WHEN d.es_servicio  THEN 'servicio'
               ELSE 'producto' END AS tipo,
          CASE WHEN d.es_item_libre THEN 'Ítems libres (sin inventario)'
               ELSE COALESCE(dep.nombre, 'Sin departamento') END AS departamento,
          CASE WHEN d.inventario_id IS NOT NULL AND NOT d.es_item_libre
               THEN 'inv-' || d.inventario_id
               ELSE 'txt-' || LOWER(TRIM(d.nombre_producto)) END AS clave,
          COALESCE(i.nombre, TRIM(d.nombre_producto)) AS nombre_producto,
          COALESCE(i.codigo_sku, d.sku) AS sku
        FROM pos_ventas_detalle d
        JOIN pos_ventas v ON d.venta_id = v.id
        LEFT JOIN inventarios i ON i.id = d.inventario_id
        LEFT JOIN inv_departamentos dep ON dep.id = i.departamento_id
        WHERE v.fecha_venta BETWEEN $1 AND $2
          AND v.estatus = 'completada'
          ${depCond}
      )
    `;

    const { rows } = await query(`
      ${lineasSQL}
      SELECT MAX(nombre_producto)            AS nombre_producto,
             MAX(sku)                        AS sku,
             MAX(departamento)               AS departamento,
             MAX(tipo)                       AS tipo,
             SUM(cantidad)::numeric          AS cantidad_vendida,
             COUNT(DISTINCT venta_id)::int   AS num_ventas,
             (SUM(subtotal_linea) / NULLIF(SUM(cantidad), 0))::numeric(12,2) AS precio_promedio,
             SUM(subtotal_linea)::numeric    AS total_generado
      FROM lineas
      GROUP BY clave
      ORDER BY cantidad_vendida DESC, total_generado DESC
      LIMIT ${topN}
    `, params);

    const { rows: [resumenDB] } = await query(`
      ${lineasSQL}
      SELECT COUNT(DISTINCT clave)::int                       AS productos_distintos,
             COUNT(*)::int                                    AS lineas,
             COUNT(DISTINCT venta_id)::int                    AS ventas,
             COALESCE(SUM(cantidad), 0)::numeric              AS cantidad_total,
             COALESCE(SUM(subtotal_linea), 0)::numeric        AS total_generado,
             COUNT(DISTINCT clave) FILTER (WHERE tipo = 'libre')::int             AS libres_distintos,
             COALESCE(SUM(cantidad) FILTER (WHERE tipo = 'libre'), 0)::numeric    AS libres_cantidad,
             COALESCE(SUM(subtotal_linea) FILTER (WHERE tipo = 'libre'), 0)::numeric AS libres_total
      FROM lineas
    `, params);

    const { rows: porDepartamentoDB } = await query(`
      ${lineasSQL}
      SELECT departamento,
             COUNT(DISTINCT clave)::int        AS productos,
             SUM(cantidad)::numeric            AS cantidad,
             COUNT(DISTINCT venta_id)::int     AS ventas,
             SUM(subtotal_linea)::numeric      AS total
      FROM lineas
      GROUP BY departamento
      ORDER BY total DESC
    `, params);

    const num = (v) => parseFloat(v || 0);
    const round2 = (n) => parseFloat(n.toFixed(2));
    const tipoLabel = (t) => ({ producto: 'Producto', servicio: 'Servicio', libre: 'Ítem libre' }[t] || t);
    const fmtCant = (n) => { const x = num(n); return Number.isInteger(x) ? String(x) : x.toFixed(2); };

    const productos = rows.map((r, i) => ({
      posicion: i + 1,
      nombre_producto: r.nombre_producto,
      sku: r.sku || null,
      departamento: r.departamento,
      tipo: tipoLabel(r.tipo),
      cantidad_vendida: num(r.cantidad_vendida),
      num_ventas: r.num_ventas,
      precio_promedio: num(r.precio_promedio),
      total_generado: num(r.total_generado),
    }));

    const resumen = {
      productos_distintos: resumenDB.productos_distintos,
      productos_listados: productos.length,
      lineas: resumenDB.lineas,
      ventas: resumenDB.ventas,
      cantidad_total: num(resumenDB.cantidad_total),
      total_generado: num(resumenDB.total_generado),
      cantidad_listados: round2(productos.reduce((a, r) => a + r.cantidad_vendida, 0)),
      total_listados: round2(productos.reduce((a, r) => a + r.total_generado, 0)),
      libres_distintos: resumenDB.libres_distintos,
      libres_cantidad: num(resumenDB.libres_cantidad),
      libres_total: num(resumenDB.libres_total),
    };
    const porDepartamento = porDepartamentoDB.map(r => ({
      departamento: r.departamento,
      productos: r.productos,
      cantidad: num(r.cantidad),
      ventas: r.ventas,
      total: num(r.total),
      porcentaje: resumen.total_generado > 0 ? round2(num(r.total) * 100 / resumen.total_generado) : 0,
    }));

    const periodoLabel = `${fmtDate(d)} al ${fmtDate(h)}`;
    const resumenRows = [
      ['Periodo', periodoLabel],
      ['Departamento', departamentoLabel],
      ['Productos/servicios distintos vendidos', resumen.productos_distintos],
      ['Productos listados en el top', resumen.productos_listados],
      ['Ventas (tickets) con estos productos', resumen.ventas],
      ['Unidades vendidas (todas)', resumen.cantidad_total],
      ['Total generado (todas)', resumen.total_generado],
      [`Unidades vendidas (top ${topN})`, resumen.cantidad_listados],
      [`Total generado (top ${topN})`, resumen.total_listados],
      ['Ítems libres distintos', resumen.libres_distintos],
      ['Unidades de ítems libres', resumen.libres_cantidad],
      ['Total de ítems libres', resumen.libres_total],
    ];

    if (formato === 'xlsx') {
      const headers = ['#', 'Producto/Servicio', 'SKU', 'Departamento', 'Tipo', 'Cant. Vendida', 'Num. Ventas', 'Precio Prom.', 'Total Generado'];
      const dataRows = productos.map(r => [
        r.posicion, r.nombre_producto, r.sku || '—', r.departamento, r.tipo,
        r.cantidad_vendida, r.num_ventas, r.precio_promedio, r.total_generado,
      ]);
      dataRows.push(['', `TOTAL (top ${topN})`, '', '', '', resumen.cantidad_listados, '', '', resumen.total_listados]);
      dataRows.push(['', 'TOTAL DEL PERIODO (todos los productos)', '', '', '', resumen.cantidad_total, resumen.ventas, '', resumen.total_generado]);

      const extraSheets = [
        {
          name: 'Por Departamento',
          headers: ['Departamento', 'Productos', 'Cant. Vendida', 'Num. Ventas', 'Total', '% del Total'],
          rows: [
            ...porDepartamento.map(r => [r.departamento, r.productos, r.cantidad, r.ventas, r.total, r.porcentaje]),
            ['TOTAL', resumen.productos_distintos, resumen.cantidad_total, resumen.ventas, resumen.total_generado, porDepartamento.length ? 100 : 0],
          ],
          colWidths: [32, 12, 15, 13, 16, 12],
        },
        {
          name: 'Resumen',
          headers: ['Concepto', 'Valor'],
          rows: resumenRows,
          colWidths: [40, 26],
        },
      ];
      return sendExcel(res, 'Productos Más Vendidos', 'Productos',
        headers, dataRows, [6, 34, 14, 24, 12, 14, 13, 14, 16], extraSheets, nombreArchivo);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, `Top ${topN} Productos / Servicios Más Vendidos`,
        `Período: ${periodoLabel}  |  Departamento: ${departamentoLabel}  |  Total generado: ${fmtCurrency(resumen.total_generado)}`,
        nombreArchivo);

      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Resumen');
      doc.moveDown(0.3);
      drawTable(doc, ['Concepto', 'Valor'], resumenRows.map(([k, v]) => [
        k,
        /total/i.test(k) ? fmtCurrency(v) : (typeof v === 'number' ? fmtCant(v) : v),
      ]), [260, 140], { rowHeight: 15, fontSize: 8 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text(`Top ${topN} productos / servicios`);
      doc.moveDown(0.3);
      const headers = ['#', 'Producto/Servicio', 'SKU', 'Departamento', 'Tipo', 'Cant.', '# Ventas', 'P.Prom.', 'Total'];
      const colW = [20, 140, 55, 80, 48, 40, 40, 52, 57];
      drawTable(doc, headers, productos.map(r => [
        r.posicion, r.nombre_producto, r.sku || '—', r.departamento, r.tipo,
        fmtCant(r.cantidad_vendida), r.num_ventas, fmtCurrency(r.precio_promedio), fmtCurrency(r.total_generado),
      ]), colW);
      drawTotalsRow(doc, ['', `TOTAL (top ${topN})`, '', '', '', fmtCant(resumen.cantidad_listados), '', '', fmtCurrency(resumen.total_listados)], colW);
      drawTotalsRow(doc, ['', 'TOTAL DEL PERIODO', '', '', '', fmtCant(resumen.cantidad_total), resumen.ventas, '', fmtCurrency(resumen.total_generado)], colW, { bg: '#1B5E20' });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Ventas por departamento');
      doc.moveDown(0.3);
      const colWD = [170, 60, 70, 60, 90, 60];
      drawTable(doc, ['Departamento', 'Productos', 'Cant. Vendida', '# Ventas', 'Total', '% Total'],
        porDepartamento.map(r => [r.departamento, r.productos, fmtCant(r.cantidad), r.ventas, fmtCurrency(r.total), `${r.porcentaje.toFixed(2)}%`]),
        colWD);
      drawTotalsRow(doc, ['TOTAL', resumen.productos_distintos, fmtCant(resumen.cantidad_total), resumen.ventas, fmtCurrency(resumen.total_generado), '100%'], colWD);
      doc.end();
      return;
    }

    return res.json({
      ok: true,
      data: {
        rows: productos,
        resumen,
        por_departamento: porDepartamento,
        periodo: { desde: d, hasta: h, etiqueta: periodoLabel, departamento: departamentoLabel, top: topN },
      }
    });
  } catch (err) {
    console.error('reportes/productos error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de productos', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Compras por cliente
// ─────────────────────────────────────────────────────────────
async function getReporteClientes(req, res) {
  try {
    const { desde, hasta, cliente_id, formato } = req.query;
    // historico=true: ranking desde la primera venta registrada hasta hoy (ignora desde/hasta).
    const historico = ['1', 'true'].includes(String(req.query.historico || '').toLowerCase());
    let [d, h] = buildDateRange(desde, hasta);
    if (historico) {
      const { rows: [ini] } = await query(`
        SELECT LEAST(
          (SELECT MIN(fecha_venta) FROM pos_ventas),
          (SELECT MIN(fecha) FROM pos_clientes_puntos_movimientos)
        ) AS inicio
      `);
      d = ini?.inicio ? new Date(ini.inicio) : new Date('2000-01-01T00:00:00-06:00');
      h = buildDateRange(null, null)[1];
    }
    const topN = Math.min(Math.max(parseInt(req.query.top) || 50, 1), MAX_ROWS);

    // Criterio del ranking (columna whitelisteada, nunca interpolar el valor del usuario).
    const CRITERIOS = {
      monto:             { col: 'monto_total',             label: 'Dinero comprado' },
      compras:           { col: 'total_compras',           label: 'Número de compras' },
      puntos:            { col: 'puntos_disponibles',      label: 'Puntos disponibles (saldo actual)' },
      puntos_periodo:    { col: 'puntos_ganados_periodo',  label: 'Puntos ganados en el periodo' },
    };
    const ordenKey = CRITERIOS[req.query.orden] ? req.query.orden : 'monto';
    const criterio = CRITERIOS[ordenKey];
    const nombreArchivo = `Top-Clientes-por-${ordenKey}-${historico ? 'historico' : buildFileDateSuffix(desde, hasta)}`;

    const params = [d, h];
    let clienteCond = '';
    if (cliente_id) { params.push(cliente_id); clienteCond = `AND c.id = $${params.length}`; }

    const baseSQL = `
      WITH compras AS (
        SELECT v.cliente_id,
               COUNT(*)::int        AS total_compras,
               SUM(v.total)         AS monto_total,
               MAX(v.fecha_venta)   AS ultima_compra
        FROM pos_ventas v
        WHERE v.estatus = 'completada'
          AND v.fecha_venta BETWEEN $1 AND $2
          AND v.cliente_id IS NOT NULL
        GROUP BY v.cliente_id
      ),
      mov AS (
        SELECT m.cliente_id,
               SUM(m.puntos)      FILTER (WHERE m.tipo = 'acumulado') AS ganados,
               SUM(ABS(m.puntos)) FILTER (WHERE m.tipo = 'canjeado')  AS canjeados
        FROM pos_clientes_puntos_movimientos m
        WHERE m.fecha BETWEEN $1 AND $2
        GROUP BY m.cliente_id
      ),
      base AS (
        SELECT c.id AS cliente_id, c.nombre_comercial, c.rfc, c.email, c.telefono,
               COALESCE(co.total_compras, 0)::int                AS total_compras,
               COALESCE(co.monto_total, 0)::numeric(14,2)        AS monto_total,
               CASE WHEN co.total_compras > 0
                    THEN (co.monto_total / co.total_compras)::numeric(14,2)
                    ELSE 0 END                                    AS ticket_promedio,
               co.ultima_compra,
               COALESCE(mov.ganados, 0)::int                     AS puntos_ganados_periodo,
               COALESCE(mov.canjeados, 0)::int                   AS puntos_canjeados_periodo,
               COALESCE(p.puntos_acumulados, 0)::int             AS puntos_acumulados,
               COALESCE(p.puntos_disponibles, 0)::int            AS puntos_disponibles,
               COALESCE(p.nivel_cliente, 'estandar')             AS nivel_cliente
        FROM clientes c
        LEFT JOIN compras co ON co.cliente_id = c.id
        LEFT JOIN mov        ON mov.cliente_id = c.id
        LEFT JOIN pos_clientes_puntos p ON p.cliente_id = c.id
        WHERE c.activo = true ${clienteCond}
      )
    `;

    // Solo clientes con valor en el criterio elegido (ej. top por dinero = clientes que compraron en el periodo).
    const { rows } = await query(`
      ${baseSQL}
      SELECT * FROM base
      WHERE ${criterio.col} > 0
      ORDER BY ${criterio.col} DESC, monto_total DESC, nombre_comercial ASC
      LIMIT ${topN}
    `, params);

    const { rows: [resDB] } = await query(`
      ${baseSQL}
      SELECT COUNT(*) FILTER (WHERE total_compras > 0)::int           AS clientes_con_compras,
             COUNT(*) FILTER (WHERE ${criterio.col} > 0)::int          AS clientes_en_ranking,
             COALESCE(SUM(total_compras), 0)::int                      AS compras,
             COALESCE(SUM(monto_total), 0)::numeric                    AS monto_total,
             COALESCE(SUM(puntos_ganados_periodo), 0)::int             AS puntos_ganados_periodo,
             COALESCE(SUM(puntos_canjeados_periodo), 0)::int           AS puntos_canjeados_periodo,
             COALESCE(SUM(puntos_disponibles), 0)::int                 AS puntos_disponibles,
             COUNT(*) FILTER (WHERE puntos_disponibles > 0)::int       AS clientes_con_puntos
      FROM base
    `, params);

    // Ventas sin cliente registrado (Público General): contexto para el total vendido.
    let publico = { compras: 0, monto: 0 };
    if (!cliente_id) {
      const { rows: [p] } = await query(`
        SELECT COUNT(*)::int AS compras, COALESCE(SUM(total), 0)::numeric AS monto
        FROM pos_ventas
        WHERE estatus = 'completada' AND fecha_venta BETWEEN $1 AND $2 AND cliente_id IS NULL
      `, [d, h]);
      publico = p;
    }

    const num = (v) => parseFloat(v || 0);
    const round2 = (n) => parseFloat(n.toFixed(2));
    const nivelLabel = (n) => ({ estandar: 'Estándar', 'estándar': 'Estándar', frecuente: 'Frecuente', vip: 'VIP' }[n] || n);

    const montoTotalClientes = num(resDB.monto_total);
    const clientes = rows.map((r, i) => ({
      posicion: i + 1,
      cliente_id: r.cliente_id,
      nombre_comercial: r.nombre_comercial,
      rfc: r.rfc,
      email: r.email,
      telefono: r.telefono,
      total_compras: r.total_compras,
      ticket_promedio: num(r.ticket_promedio),
      monto_total: num(r.monto_total),
      porcentaje_monto: montoTotalClientes > 0 ? round2(num(r.monto_total) * 100 / montoTotalClientes) : 0,
      ultima_compra: r.ultima_compra,
      puntos_ganados_periodo: r.puntos_ganados_periodo,
      puntos_canjeados_periodo: r.puntos_canjeados_periodo,
      puntos_disponibles: r.puntos_disponibles,
      nivel_cliente: nivelLabel(r.nivel_cliente),
    }));

    const resumen = {
      criterio: criterio.label,
      clientes_listados: clientes.length,
      clientes_en_ranking: resDB.clientes_en_ranking,
      clientes_con_compras: resDB.clientes_con_compras,
      compras: resDB.compras,
      monto_total: montoTotalClientes,
      ticket_promedio: resDB.compras > 0 ? round2(montoTotalClientes / resDB.compras) : 0,
      puntos_ganados_periodo: resDB.puntos_ganados_periodo,
      puntos_canjeados_periodo: resDB.puntos_canjeados_periodo,
      puntos_disponibles: resDB.puntos_disponibles,
      clientes_con_puntos: resDB.clientes_con_puntos,
      publico_compras: publico.compras,
      publico_monto: num(publico.monto),
      // Totales de los clientes listados
      listados_compras: clientes.reduce((a, r) => a + r.total_compras, 0),
      listados_monto: round2(clientes.reduce((a, r) => a + r.monto_total, 0)),
      listados_puntos_ganados: clientes.reduce((a, r) => a + r.puntos_ganados_periodo, 0),
      listados_puntos_disponibles: clientes.reduce((a, r) => a + r.puntos_disponibles, 0),
    };
    resumen.listados_porcentaje = montoTotalClientes > 0 ? round2(resumen.listados_monto * 100 / montoTotalClientes) : 0;

    const periodoLabel = historico
      ? `Todo el historial (${fmtDate(d)} al ${fmtDate(h)})`
      : `${fmtDate(d)} al ${fmtDate(h)}`;
    const resumenRows = [
      ['Periodo', periodoLabel],
      ['Ranking por', criterio.label],
      ['Clientes listados', resumen.clientes_listados],
      ['Clientes con compras en el periodo', resumen.clientes_con_compras],
      ['Compras de clientes registrados', resumen.compras],
      ['Monto comprado por clientes registrados', resumen.monto_total],
      ['Ticket promedio (clientes registrados)', resumen.ticket_promedio],
      ['Ventas a Público General (sin cliente)', resumen.publico_compras],
      ['Monto Público General', resumen.publico_monto],
      ['Puntos ganados en el periodo', resumen.puntos_ganados_periodo],
      ['Puntos canjeados en el periodo', resumen.puntos_canjeados_periodo],
      ['Puntos disponibles (saldo actual)', resumen.puntos_disponibles],
      ['Clientes con puntos disponibles', resumen.clientes_con_puntos],
    ];
    const esMonto = (k) => /monto|ticket/i.test(k);

    if (formato === 'xlsx') {
      const headers = ['#', 'Cliente', 'RFC', 'Email', 'Teléfono', 'Compras', 'Ticket Prom.', 'Monto Total', '% del Monto',
        'Última Compra', 'Pts. Ganados (periodo)', 'Pts. Canjeados (periodo)', 'Pts. Disponibles', 'Nivel'];
      const dataRows = clientes.map(r => [
        r.posicion, r.nombre_comercial, r.rfc || '—', r.email || '—', r.telefono || '—',
        r.total_compras, r.ticket_promedio, r.monto_total, r.porcentaje_monto,
        r.ultima_compra ? fmtDate(r.ultima_compra) : '—',
        r.puntos_ganados_periodo, r.puntos_canjeados_periodo, r.puntos_disponibles, r.nivel_cliente,
      ]);
      dataRows.push(['', `TOTAL (${clientes.length} listados)`, '', '', '', resumen.listados_compras, '', resumen.listados_monto,
        resumen.listados_porcentaje, '', resumen.listados_puntos_ganados, '', resumen.listados_puntos_disponibles, '']);
      dataRows.push(['', 'TOTAL CLIENTES REGISTRADOS', '', '', '', resumen.compras, resumen.ticket_promedio, resumen.monto_total,
        resumen.monto_total > 0 ? 100 : 0, '', resumen.puntos_ganados_periodo, resumen.puntos_canjeados_periodo, resumen.puntos_disponibles, '']);
      return sendExcel(res, `Top Clientes — ${criterio.label}`, 'Clientes',
        headers, dataRows, [6, 30, 16, 26, 14, 10, 13, 14, 11, 14, 14, 15, 14, 11],
        [{ name: 'Resumen', headers: ['Concepto', 'Valor'], rows: resumenRows, colWidths: [42, 26] }],
        nombreArchivo);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, `Top Clientes — ${criterio.label}`,
        `Período: ${periodoLabel}  |  ${clientes.length} clientes  |  Monto clientes: ${fmtCurrency(resumen.monto_total)}`,
        nombreArchivo);

      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Resumen');
      doc.moveDown(0.3);
      drawTable(doc, ['Concepto', 'Valor'], resumenRows.map(([k, v]) => [k, esMonto(k) ? fmtCurrency(v) : String(v)]),
        [260, 140], { rowHeight: 15, fontSize: 8 });

      doc.moveDown(0.5);
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text(`Top ${clientes.length} clientes por ${criterio.label.toLowerCase()}`);
      doc.moveDown(0.3);
      const headers = ['#', 'Cliente', 'Compras', 'Ticket Prom.', 'Monto', '%', 'Ult. Compra', 'Pts. Gan.', 'Pts. Disp.', 'Nivel'];
      const colW = [18, 132, 40, 55, 62, 34, 52, 45, 50, 44];
      drawTable(doc, headers, clientes.map(r => [
        r.posicion, r.nombre_comercial, r.total_compras, fmtCurrency(r.ticket_promedio), fmtCurrency(r.monto_total),
        `${r.porcentaje_monto.toFixed(1)}%`, r.ultima_compra ? fmtDate(r.ultima_compra) : '—',
        r.puntos_ganados_periodo, r.puntos_disponibles, r.nivel_cliente,
      ]), colW);
      drawTotalsRow(doc, ['', `TOTAL (${clientes.length} listados)`, resumen.listados_compras, '', fmtCurrency(resumen.listados_monto),
        `${resumen.listados_porcentaje.toFixed(1)}%`, '', resumen.listados_puntos_ganados, resumen.listados_puntos_disponibles, ''], colW);
      drawTotalsRow(doc, ['', 'TOTAL CLIENTES REGISTRADOS', resumen.compras, fmtCurrency(resumen.ticket_promedio), fmtCurrency(resumen.monto_total),
        '100%', '', resumen.puntos_ganados_periodo, resumen.puntos_disponibles, ''], colW, { bg: '#1B5E20' });
      doc.end();
      return;
    }

    return res.json({
      ok: true,
      data: {
        rows: clientes,
        resumen,
        periodo: { desde: d, hasta: h, etiqueta: periodoLabel, criterio: criterio.label, top: topN, historico },
      }
    });
  } catch (err) {
    console.error('reportes/clientes error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de clientes', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Inventario actual
// ─────────────────────────────────────────────────────────────
async function getReporteInventario(req, res) {
  try {
    const { departamento_id, nivel_stock, formato } = req.query;
    const nombreArchivo = `Inventario-Actual-${dateMx()}`;

    const params = [];
    let pidx = 1;
    const conditions = ['i.activo = true'];

    if (departamento_id) { conditions.push(`i.departamento_id = $${pidx++}`); params.push(departamento_id); }

    const nivelExpr = `
      CASE
        WHEN i.es_servicio THEN 'servicio'
        WHEN i.existencia_actual = 0 THEN 'sin_stock'
        WHEN i.existencia_actual <= i.stock_minimo THEN 'critico'
        WHEN i.existencia_actual <= i.stock_minimo * 1.5 THEN 'bajo'
        ELSE 'ok'
      END
    `;

    if (nivel_stock && nivel_stock !== 'todos') {
      conditions.push(`(${nivelExpr}) = $${pidx++}`);
      params.push(nivel_stock);
    }

    const { rows } = await query(`
      SELECT i.codigo_sku, i.nombre, i.categoria,
             d.nombre AS departamento,
             i.existencia_actual, i.stock_minimo, i.stock_maximo,
             i.costo_compra, i.precio_venta, i.unidad_medida,
             i.es_servicio,
             (${nivelExpr}) AS nivel_stock
      FROM inventarios i
      LEFT JOIN inv_departamentos d ON i.departamento_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY d.nombre NULLS LAST, i.nombre
      LIMIT ${MAX_ROWS}
    `, params);

    if (formato === 'xlsx') {
      const headers = ['SKU', 'Producto', 'Categoría', 'Departamento', 'Existencia', 'Mín', 'Máx', 'Costo', 'Precio Venta', 'Unidad', 'Nivel'];
      const dataRows = rows.map(r => [
        r.codigo_sku || '—', r.nombre, r.categoria || '—', r.departamento || '—',
        parseFloat(r.existencia_actual), parseFloat(r.stock_minimo || 0),
        parseFloat(r.stock_maximo || 0),
        parseFloat(r.costo_compra || 0), parseFloat(r.precio_venta || 0),
        r.unidad_medida || '—', r.nivel_stock
      ]);
      return sendExcel(res, 'Inventario Actual', 'Inventario',
        headers, dataRows, [14, 32, 18, 18, 12, 9, 9, 12, 13, 10, 12], [], nombreArchivo);
    }

    if (formato === 'pdf') {
      const criticos = rows.filter(r => r.nivel_stock === 'critico' || r.nivel_stock === 'sin_stock').length;
      const doc = initPDF(res, 'Inventario Actual',
        `${rows.length} artículos activos  |  ${criticos} en nivel crítico o sin stock`,
        nombreArchivo);
      const headers = ['SKU', 'Producto', 'Departamento', 'Exist.', 'Mín.', 'Costo', 'P.Venta', 'Nivel'];
      const colW = [55, 140, 80, 35, 30, 55, 55, 55];
      const dataRows = rows.map(r => [
        r.codigo_sku || '—', r.nombre, r.departamento || '—',
        fmtNum(r.existencia_actual, 1), fmtNum(r.stock_minimo, 1),
        fmtCurrency(r.costo_compra), fmtCurrency(r.precio_venta), r.nivel_stock
      ]);
      drawTable(doc, headers, dataRows, colW);
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows } });
  } catch (err) {
    console.error('reportes/inventario error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de inventario', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Movimientos de inventario
// ─────────────────────────────────────────────────────────────
async function getReporteMovimientos(req, res) {
  try {
    const { desde, hasta, tipo_movimiento, inventario_id, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const nombreArchivo = `Movimientos-Inventario-${buildFileDateSuffix(desde, hasta)}`;

    const params = [d, h];
    let pidx = 3;
    const conditions = ['m.fecha_movimiento BETWEEN $1 AND $2'];

    if (tipo_movimiento) { conditions.push(`m.tipo_movimiento = $${pidx++}`); params.push(tipo_movimiento); }
    if (inventario_id)   { conditions.push(`m.inventario_id = $${pidx++}`);   params.push(inventario_id); }

    const { rows } = await query(`
      SELECT m.fecha_movimiento, i.nombre AS producto, i.codigo_sku AS sku,
             m.tipo_movimiento, m.concepto, m.cantidad,
             m.saldo_anterior, m.saldo_nuevo, m.usuario_nombre,
             m.area_servicio, m.notas
      FROM inventarios_movimientos m
      JOIN inventarios i ON m.inventario_id = i.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.fecha_movimiento DESC
      LIMIT ${MAX_ROWS}
    `, params);

    if (formato === 'xlsx') {
      const headers = ['Fecha', 'Producto', 'SKU', 'Tipo', 'Concepto', 'Cantidad', 'Saldo Ant.', 'Saldo Nuevo', 'Usuario'];
      const dataRows = rows.map(r => [
        fmtDatetime(r.fecha_movimiento), r.producto, r.sku || '—',
        r.tipo_movimiento, r.concepto || '—',
        parseFloat(r.cantidad),
        parseFloat(r.saldo_anterior), parseFloat(r.saldo_nuevo),
        r.usuario_nombre || '—'
      ]);
      return sendExcel(res, 'Movimientos de Inventario', 'Movimientos',
        headers, dataRows, [18, 30, 14, 12, 22, 12, 12, 12, 18], [], nombreArchivo);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Movimientos de Inventario',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} movimientos`,
        nombreArchivo);
      const headers = ['Fecha', 'Producto', 'SKU', 'Tipo', 'Concepto', 'Cant.', 'S.Ant.', 'S.Nuevo'];
      const colW = [78, 110, 50, 50, 80, 35, 40, 40];
      const dataRows = rows.map(r => [
        fmtDatetime(r.fecha_movimiento), r.producto, r.sku || '—',
        r.tipo_movimiento, r.concepto || '—',
        fmtNum(r.cantidad, 1), fmtNum(r.saldo_anterior, 1), fmtNum(r.saldo_nuevo, 1)
      ]);
      drawTable(doc, headers, dataRows, colW);
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows, periodo: { desde: d, hasta: h } } });
  } catch (err) {
    console.error('reportes/movimientos error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de movimientos', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 7. Bitácora del sistema
// ─────────────────────────────────────────────────────────────
async function getReporteBitacora(req, res) {
  try {
    const { desde, hasta, modulo, accion, usuario_id, resultado, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const nombreArchivo = `Bitacora-${buildFileDateSuffix(desde, hasta)}`;

    const params = [d, h];
    let pidx = 3;
    const conditions = ['b.fecha BETWEEN $1 AND $2'];

    if (modulo)     { conditions.push(`b.modulo = $${pidx++}`);      params.push(modulo); }
    if (accion)     { conditions.push(`b.accion = $${pidx++}`);       params.push(accion); }
    if (usuario_id) { conditions.push(`b.usuario_id = $${pidx++}`);  params.push(usuario_id); }
    if (resultado)  { conditions.push(`b.resultado = $${pidx++}`);   params.push(resultado); }

    const { rows } = await query(`
      SELECT b.fecha, b.usuario_nombre, b.modulo, b.accion,
             b.entidad, b.entidad_id, b.resultado, b.ip_address,
             b.detalle
      FROM bitacora_negocio b
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.fecha DESC
      LIMIT ${MAX_ROWS}
    `, params);

    if (formato === 'xlsx') {
      const headers = ['Fecha/Hora', 'Usuario', 'Módulo', 'Acción', 'Entidad', 'ID', 'Resultado', 'IP', 'Detalle'];
      const dataRows = rows.map(r => [
        fmtDatetime(r.fecha), r.usuario_nombre || '—', r.modulo || '—', r.accion || '—',
        r.entidad || '—', r.entidad_id || '—', r.resultado || '—', r.ip_address || '—',
        r.detalle ? JSON.stringify(r.detalle).slice(0, 120) : '—'
      ]);
      return sendExcel(res, 'Bitácora del Sistema', 'Bitácora',
        headers, dataRows, [18, 20, 14, 22, 16, 12, 12, 14, 40], [], nombreArchivo);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Bitácora del Sistema',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} eventos`,
        nombreArchivo);
      const headers = ['Fecha/Hora', 'Usuario', 'Módulo', 'Acción', 'Entidad', 'Resultado'];
      const colW = [90, 90, 65, 110, 80, 65];
      const dataRows = rows.map(r => [
        fmtDatetime(r.fecha), r.usuario_nombre || '—', r.modulo || '—',
        r.accion || '—', r.entidad || '—', r.resultado || '—'
      ]);
      drawTable(doc, headers, dataRows, colW);
      doc.end();
      return;
    }

    return res.json({
      ok: true,
      data: {
        rows: rows.map(r => ({ ...r, detalle: r.detalle || {} })),
        periodo: { desde: d, hasta: h }
      }
    });
  } catch (err) {
    console.error('reportes/bitacora error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de bitácora', err.message));
  }
}

module.exports = {
  getReporteVentas,
  getReporteCorteCaja,
  getReporteProductos,
  getReporteClientes,
  getReporteInventario,
  getReporteMovimientos,
  getReporteBitacora,
  getReporteVendedores,
  getReporteAuditoria,
};

// ─────────────────────────────────────────────────────────────
// 8. Ventas por vendedor / usuario
// ─────────────────────────────────────────────────────────────
async function getReporteVendedores(req, res) {
  try {
    const { desde, hasta, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const nombreArchivo = `Ventas-por-Vendedor-${buildFileDateSuffix(desde, hasta)}`;

    // Resumen por vendedor (excluye ventas de Trabajo en equipo)
    const { rows } = await query(`
      SELECT
        v.vendedor_usuario_id                                              AS usuario_id,
        COALESCE(v.vendedor_nombre, '(sin usuario)')                       AS vendedor,
        COUNT(*)  FILTER (WHERE v.estatus = 'completada')::int             AS total_ventas,
        COUNT(*)  FILTER (WHERE v.estatus = 'cancelada')::int              AS ventas_canceladas,
        COALESCE(SUM(v.total)           FILTER (WHERE v.estatus = 'completada'), 0)::numeric AS total_ingresos,
        COALESCE(SUM(v.descuento_monto) FILTER (WHERE v.estatus = 'completada'), 0)::numeric AS total_descuentos,
        COALESCE(SUM(v.iva_monto)       FILTER (WHERE v.estatus = 'completada'), 0)::numeric AS total_iva,
        COALESCE(AVG(v.total)           FILTER (WHERE v.estatus = 'completada'), 0)::numeric AS ticket_promedio,
        MIN(v.fecha_venta) FILTER (WHERE v.estatus = 'completada')         AS primera_venta,
        MAX(v.fecha_venta) FILTER (WHERE v.estatus = 'completada')         AS ultima_venta,
        COUNT(DISTINCT DATE(v.fecha_venta AT TIME ZONE 'America/Mexico_City'))
          FILTER (WHERE v.estatus = 'completada')::int                     AS dias_activos,
        MODE() WITHIN GROUP (ORDER BY v.metodo_pago_descripcion)
          FILTER (WHERE v.estatus = 'completada')                          AS metodo_pago_favorito,
        COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.estatus = 'completada')::int AS clientes_unicos
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2
        AND v.vendedor_nombre IS NOT NULL
        AND v.es_trabajo_equipo = false
      GROUP BY v.vendedor_usuario_id, v.vendedor_nombre
      ORDER BY total_ingresos DESC
    `, [d, h]);

    // Producto más vendido por vendedor (excluye trabajo en equipo)
    const { rows: topProductos } = await query(`
      SELECT
        v.vendedor_nombre,
        d.nombre_producto,
        SUM(d.cantidad)::numeric AS cantidad
      FROM pos_ventas_detalle d
      JOIN pos_ventas v ON d.venta_id = v.id
      WHERE v.fecha_venta BETWEEN $1 AND $2
        AND v.estatus = 'completada'
        AND v.vendedor_nombre IS NOT NULL
        AND v.es_trabajo_equipo = false
      GROUP BY v.vendedor_nombre, d.nombre_producto
      HAVING SUM(d.cantidad) = (
        SELECT MAX(s.q) FROM (
          SELECT SUM(d2.cantidad) AS q
          FROM pos_ventas_detalle d2
          JOIN pos_ventas v2 ON d2.venta_id = v2.id
          WHERE v2.vendedor_nombre = v.vendedor_nombre
            AND v2.fecha_venta BETWEEN $1 AND $2
            AND v2.estatus = 'completada'
            AND v2.es_trabajo_equipo = false
          GROUP BY d2.nombre_producto
        ) s
      )
      ORDER BY v.vendedor_nombre
      LIMIT 50
    `, [d, h]);

    // Detalle de ventas de Trabajo en equipo — una fila por participante
    const { rows: equipoRows } = await query(`
      SELECT
        v.folio                   AS folio_venta,
        v.fecha_venta,
        v.cliente_nombre,
        v.total,
        v.metodo_pago_descripcion AS metodo_pago,
        COALESCE(pte.empleado_nombre, '\u2014') AS empleado_nombre,
        COALESCE(pte.comentario, '')            AS comentario
      FROM pos_ventas v
      LEFT JOIN pos_pedidos_trabajo_equipo pte ON pte.venta_id = v.id
      WHERE v.fecha_venta BETWEEN $1 AND $2
        AND v.es_trabajo_equipo = true
        AND v.estatus = 'completada'
      ORDER BY v.fecha_venta DESC, v.id, pte.id
    `, [d, h]);

    // Mapear top producto a cada vendedor
    const topMap = {};
    topProductos.forEach(r => { topMap[r.vendedor_nombre] = r.nombre_producto; });
    const rowsEnriquecidos = rows.map(r => ({
      ...r,
      producto_top: topMap[r.vendedor] || '—'
    }));

    // Resumen global
    // Calcular ingresos únicos por venta (evitar contar N veces por participante)
    const equipoIngresosMap = {};
    equipoRows.forEach(r => { equipoIngresosMap[r.folio_venta] = parseFloat(r.total); });
    const equipoVentasUnicas = Object.keys(equipoIngresosMap).length;
    const equipoIngresosTotal = Object.values(equipoIngresosMap).reduce((s, v) => s + v, 0);

    const resumen = {
      total_vendedores: rows.length,
      total_ingresos_global: rows.reduce((s, r) => s + parseFloat(r.total_ingresos || 0), 0),
      total_ventas_global: rows.reduce((s, r) => s + parseInt(r.total_ventas || 0), 0),
      top_vendedor: rows[0] ? { nombre: rows[0].vendedor, total: parseFloat(rows[0].total_ingresos) } : null,
      equipo_ventas: equipoVentasUnicas,
      equipo_ingresos: equipoIngresosTotal,
      periodo: { desde: d, hasta: h }
    };

    if (formato === 'xlsx') {
      const headers = [
        'Vendedor', '# Ventas', 'Canceladas', 'Total Ingresos',
        'Total Descuentos', 'Total IVA', 'Ticket Promedio',
        'Días Activos', 'Clientes Únicos', 'M.Pago Favorito',
        'Producto Más Vendido', 'Primera Venta', 'Última Venta'
      ];
      const dataRows = rowsEnriquecidos.map((r) => [
        r.vendedor,
        r.total_ventas,
        r.ventas_canceladas,
        parseFloat(parseFloat(r.total_ingresos).toFixed(2)),
        parseFloat(parseFloat(r.total_descuentos).toFixed(2)),
        parseFloat(parseFloat(r.total_iva).toFixed(2)),
        parseFloat(parseFloat(r.ticket_promedio).toFixed(2)),
        r.dias_activos,
        r.clientes_unicos,
        r.metodo_pago_favorito || '—',
        r.producto_top,
        r.primera_venta ? fmtDate(r.primera_venta) : '—',
        r.ultima_venta  ? fmtDate(r.ultima_venta)  : '—',
      ]);
      dataRows.push([
        'TOTAL', resumen.total_ventas_global, '', parseFloat(resumen.total_ingresos_global.toFixed(2)),
        '', '', '', '', '', '', '', '', ''
      ]);

      // Hoja extra: Trabajo en equipo — una fila por participante
      const extraSheets = [];
      if (equipoRows.length > 0) {
        const equipoDataRows = equipoRows.map(r => [
          r.folio_venta,
          r.fecha_venta ? fmtDate(r.fecha_venta) : '—',
          r.cliente_nombre || '—',
          parseFloat(parseFloat(r.total).toFixed(2)),
          r.metodo_pago || '—',
          r.empleado_nombre || '—',
          r.comentario || '',
        ]);
        extraSheets.push({
          name: 'Trabajo en Equipo',
          headers: ['Folio Venta', 'Fecha', 'Cliente', 'Total', 'Método Pago', 'Empleado', 'Comentario'],
          rows: equipoDataRows,
          colWidths: [14, 14, 30, 12, 18, 22, 40],
        });
      }

      return sendExcel(res,
        'Ventas por Vendedor', 'Vendedores',
        headers, dataRows,
        [24, 11, 12, 16, 16, 12, 14, 12, 14, 18, 28, 14, 14], extraSheets, nombreArchivo
      );
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Ventas por Vendedor',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} vendedores  |  Total: ${fmtCurrency(resumen.total_ingresos_global)}`,
        nombreArchivo);

      const headers = ['#', 'Vendedor', '# Ventas', 'Canceladas', 'Total Ingresos', 'Descuentos', 'Ticket Prom.', 'Clientes', 'M.Pago Fav.', 'Producto Top'];
      const colW   = [22, 100, 42, 48, 68, 58, 62, 48, 65, 90];
      const dataRows = rowsEnriquecidos.map((r, i) => [
        i + 1, r.vendedor, r.total_ventas, r.ventas_canceladas,
        fmtCurrency(r.total_ingresos), fmtCurrency(r.total_descuentos),
        fmtCurrency(r.ticket_promedio), r.clientes_unicos,
        r.metodo_pago_favorito || '—', r.producto_top
      ]);
      drawTable(doc, headers, dataRows, colW);
      drawTotalsRow(doc,
        ['', 'TOTAL', resumen.total_ventas_global, '', fmtCurrency(resumen.total_ingresos_global), '', '', '', '', ''],
        colW
      );

      // Sección Trabajo en equipo — agrupar por venta para el PDF
      if (equipoRows.length > 0) {
        const equipoPorVenta = new Map();
        equipoRows.forEach(r => {
          if (!equipoPorVenta.has(r.folio_venta)) {
            equipoPorVenta.set(r.folio_venta, { ...r, partes: [] });
          }
          const v = equipoPorVenta.get(r.folio_venta);
          if (r.empleado_nombre && r.empleado_nombre !== '—') {
            v.partes.push(r.empleado_nombre + (r.comentario ? ': ' + r.comentario : ''));
          }
        });
        const equipoVentas = Array.from(equipoPorVenta.values());

        doc.moveDown(1.5);
        doc.fillColor('#1565C0').fontSize(11).font('Helvetica-Bold')
          .text(`Trabajo en Equipo  (${equipoVentas.length} venta${equipoVentas.length !== 1 ? 's' : ''}  |  Total: ${fmtCurrency(resumen.equipo_ingresos)})`);
        doc.moveDown(0.4);
        const equipoHeaders = ['Folio', 'Fecha', 'Cliente', 'Total', 'M.Pago', 'Participantes'];
        const equipoColW    = [55, 55, 90, 55, 60, 178];
        const equipoDataRows = equipoVentas.map(r => [
          r.folio_venta,
          fmtDate(r.fecha_venta),
          r.cliente_nombre || '—',
          fmtCurrency(r.total),
          r.metodo_pago || '—',
          r.partes.join(' | ') || '—',
        ]);
        drawTable(doc, equipoHeaders, equipoDataRows, equipoColW, { fontSize: 8 });
        drawTotalsRow(doc,
          ['', 'TOTAL', '', fmtCurrency(resumen.equipo_ingresos), '', ''],
          equipoColW
        );
      }

      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows: rowsEnriquecidos, equipo_rows: equipoRows, resumen } });
  } catch (err) {
    console.error('reportes/vendedores error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de vendedores', err.message));
  }
}

// ─────────────────────────────────────────────────────────────
// 9. Bitácora de Auditoría (tabla auditoria — triggers BD)
// ─────────────────────────────────────────────────────────────
async function getReporteAuditoria(req, res) {
  try {
    const { desde, hasta, tabla, operacion, usuario_id, formato } = req.query;
    const [d, h] = buildDateRange(desde, hasta);
    const nombreArchivo = `Auditoria-${buildFileDateSuffix(desde, hasta)}`;

    const conditions = ['a.fecha_operacion BETWEEN $1 AND $2'];
    const params = [d, h];
    let idx = 3;

    if (tabla && tabla.trim()) {
      conditions.push(`a.tabla = $${idx++}`);
      params.push(tabla.trim());
    }
    if (operacion && operacion.trim()) {
      conditions.push(`a.operacion = $${idx++}`);
      params.push(operacion.trim().toUpperCase());
    }
    if (usuario_id) {
      const uid = parseInt(usuario_id);
      if (!isNaN(uid)) {
        conditions.push(`a.usuario_id = $${idx++}`);
        params.push(uid);
      }
    }

    const { rows } = await query(`
      SELECT
        a.id,
        a.tabla,
        a.operacion,
        a.registro_id,
        a.usuario_id,
        a.usuario_nombre,
        a.fecha_operacion,
        a.modulo,
        a.accion,
        a.datos_anteriores,
        a.datos_nuevos
      FROM auditoria a
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.fecha_operacion DESC
      LIMIT 2000
    `, params);

    const resumen = {
      total_registros: rows.length,
      inserts:   rows.filter(r => r.operacion === 'INSERT').length,
      updates:   rows.filter(r => r.operacion === 'UPDATE').length,
      deletes:   rows.filter(r => r.operacion === 'DELETE').length,
      periodo: { desde: d, hasta: h }
    };

    if (formato === 'xlsx') {
      const headers = ['ID', 'Fecha', 'Tabla', 'Operación', 'Registro ID', 'Usuario ID', 'Usuario', 'Módulo', 'Acción', 'Datos Anteriores', 'Datos Nuevos'];
      const dataRows = rows.map(r => [
        r.id,
        fmtDate(r.fecha_operacion),
        r.tabla,
        r.operacion,
        r.registro_id || '',
        r.usuario_id  || '',
        r.usuario_nombre || '',
        r.modulo || '',
        r.accion || '',
        r.datos_anteriores ? JSON.stringify(r.datos_anteriores) : '',
        r.datos_nuevos     ? JSON.stringify(r.datos_nuevos)     : '',
      ]);
      return sendExcel(res,
        'Bitácora de Auditoría', 'Auditoría',
        headers, dataRows,
        [8, 18, 18, 12, 14, 11, 22, 16, 22, 40, 40], [], nombreArchivo
      );
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Bitácora de Auditoría',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} registros`,
        nombreArchivo);
      const headers = ['Fecha', 'Tabla', 'Operación', 'Registro', 'Usuario', 'Módulo'];
      const colW    = [85, 85, 65, 60, 100, 70];
      const dataRows = rows.map(r => [
        fmtDate(r.fecha_operacion),
        r.tabla,
        r.operacion,
        r.registro_id || '—',
        r.usuario_nombre || '—',
        r.modulo || '—',
      ]);
      drawTable(doc, headers, dataRows, colW);
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows, resumen } });
  } catch (err) {
    console.error('reportes/auditoria error:', err);
    return res.status(500).json(createErrorResponse('Error al generar reporte de auditoría', err.message));
  }
}
