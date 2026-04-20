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
 *   GET /corte-caja       – Resumen + detalle de ventas para corte de caja
 *   GET /productos        – Productos / servicios más vendidos
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
  const now = new Date();
  const d = desde
    ? new Date(desde + 'T00:00:00-06:00')
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const h = hasta
    ? new Date(hasta + 'T23:59:59-06:00')
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return [d, h];
}

// ─────────────────────────────────────────────────────────────
// PDF Builder
// ─────────────────────────────────────────────────────────────
function initPDF(res, titulo, subtitulo = '') {
  const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
  const safeFilename = titulo.replace(/[^a-zA-Z0-9_\-]/g, '-');
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
async function sendExcel(res, titulo, sheetName, headers, rows, colWidths = [], extraSheets = []) {
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

  const safeFilename = titulo.replace(/[^a-zA-Z0-9_\-]/g, '-');
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
      return sendExcel(res, `Reporte-Ventas-${desde || 'hoy'}`, 'Ventas',
        headers, dataRows, [14, 18, 22, 18, 14, 12, 12, 10, 12]);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Reporte de Ventas',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} ventas  |  Total: ${fmtCurrency(totalIngresos)}`);
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
    const [d, h] = buildDateRange(fecha, fecha);

    const params = [d, h];
    let pidx = 3;
    const vendedorCond = vendedor_id ? `AND v.vendedor_usuario_id = $${pidx}` : '';
    if (vendedor_id) params.push(vendedor_id);

    // Resumen general
    const { rows: [resumen] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE estatus='completada') AS ventas_completadas,
        COUNT(*) FILTER (WHERE estatus='cancelada')  AS ventas_canceladas,
        COALESCE(SUM(total)         FILTER (WHERE estatus='completada'), 0) AS total_ingresos,
        COALESCE(SUM(descuento_monto) FILTER (WHERE estatus='completada'), 0) AS total_descuentos,
        COALESCE(SUM(iva_monto)      FILTER (WHERE estatus='completada'), 0) AS total_iva
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 ${vendedorCond}
    `, params);

    // Por método de pago
    const { rows: metodosPago } = await query(`
      SELECT metodo_pago_descripcion AS metodo, COUNT(*) AS cantidad,
             SUM(total) AS total
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estatus='completada' ${vendedorCond}
      GROUP BY metodo_pago_descripcion ORDER BY total DESC
    `, params);

    // Por vendedor
    const { rows: vendedores } = await query(`
      SELECT vendedor_nombre AS vendedor, COUNT(*) AS ventas,
             SUM(total) AS total
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estatus='completada' ${vendedorCond}
      GROUP BY vendedor_nombre ORDER BY total DESC
    `, params);

    // Detalle ventas
    const { rows: ventas } = await query(`
      SELECT v.folio, v.fecha_venta, v.cliente_nombre, v.vendedor_nombre,
             v.metodo_pago_descripcion, v.total, v.estatus
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2 ${vendedorCond}
      ORDER BY v.fecha_venta
      LIMIT ${MAX_ROWS}
    `, params);

    const subtitulo = `Fecha: ${fmtDate(d)}  |  Ventas: ${resumen.ventas_completadas}  |  Total: ${fmtCurrency(resumen.total_ingresos)}`;

    if (formato === 'xlsx') {
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
        }
      ];
      const resHeaders = ['Concepto', 'Valor'];
      const resRows = [
        ['Ventas completadas', parseInt(resumen.ventas_completadas)],
        ['Ventas canceladas',  parseInt(resumen.ventas_canceladas)],
        ['Total ingresos',     parseFloat(resumen.total_ingresos)],
        ['Total descuentos',   parseFloat(resumen.total_descuentos)],
        ['Total IVA',          parseFloat(resumen.total_iva)],
      ];
      return sendExcel(res, `Corte-de-Caja-${fecha || fmtDate(d)}`, 'Resumen General',
        resHeaders, resRows, [28, 18], extraSheets);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Corte de Caja', subtitulo);

      // Resumen box
      doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Resumen General');
      doc.moveDown(0.3);
      const resumenData = [
        ['Ventas Completadas', resumen.ventas_completadas],
        ['Ventas Canceladas',  resumen.ventas_canceladas],
        ['Total Ingresos',     fmtCurrency(resumen.total_ingresos)],
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
      data: { resumen, metodos_pago: metodosPago, vendedores, ventas }
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

    const { rows } = await query(`
      SELECT d.nombre_producto, d.sku,
             SUM(d.cantidad)::numeric        AS cantidad_vendida,
             SUM(d.subtotal_linea)::numeric  AS total_generado,
             COUNT(DISTINCT v.id)            AS num_ventas,
             AVG(d.precio_unitario)::numeric AS precio_promedio
      FROM pos_ventas_detalle d
      JOIN pos_ventas v ON d.venta_id = v.id
      WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estatus = 'completada'
      GROUP BY d.nombre_producto, d.sku
      ORDER BY cantidad_vendida DESC
      LIMIT $3
    `, [d, h, topN]);

    if (formato === 'xlsx') {
      const headers = ['Producto/Servicio', 'SKU', 'Cant. Vendida', 'Num. Ventas', 'Precio Prom.', 'Total Generado'];
      const dataRows = rows.map((r, i) => [
        r.nombre_producto, r.sku || '—',
        parseFloat(r.cantidad_vendida), parseInt(r.num_ventas),
        parseFloat(parseFloat(r.precio_promedio).toFixed(2)),
        parseFloat(parseFloat(r.total_generado).toFixed(2))
      ]);
      return sendExcel(res, `Productos-mas-vendidos-${desde || 'hoy'}`, 'Productos',
        headers, dataRows, [32, 14, 14, 13, 14, 16]);
    }

    if (formato === 'pdf') {
      const totalGenerado = rows.reduce((s, r) => s + parseFloat(r.total_generado || 0), 0);
      const doc = initPDF(res, `Top ${topN} Productos / Servicios Más Vendidos`,
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  Total generado: ${fmtCurrency(totalGenerado)}`);
      const headers = ['#', 'Producto/Servicio', 'SKU', 'Cant.', '# Ventas', 'P.Prom.', 'Total'];
      const colW = [25, 160, 65, 40, 45, 55, 65];
      const dataRows = rows.map((r, i) => [
        i + 1, r.nombre_producto, r.sku || '—',
        fmtNum(r.cantidad_vendida, 1), r.num_ventas,
        fmtCurrency(r.precio_promedio), fmtCurrency(r.total_generado)
      ]);
      drawTable(doc, headers, dataRows, colW);
      drawTotalsRow(doc, ['', 'TOTAL', '', '', '', '', fmtCurrency(totalGenerado)], colW);
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows, periodo: { desde: d, hasta: h } } });
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
    const [d, h] = buildDateRange(desde, hasta);

    const params = [d, h];
    let pidx = 3;
    const clienteCond = cliente_id ? `AND c.id = $${pidx++}` : '';
    if (cliente_id) params.push(cliente_id);

    const { rows } = await query(`
      SELECT c.id AS cliente_id, c.nombre_comercial, c.rfc, c.email, c.telefono,
             COUNT(v.id)::int                        AS total_compras,
             COALESCE(SUM(v.total), 0)::numeric       AS monto_total,
             COALESCE(AVG(v.total), 0)::numeric       AS ticket_promedio,
             MAX(v.fecha_venta)                       AS ultima_compra,
             COALESCE(p.puntos_acumulados, 0)::int    AS puntos_acumulados,
             COALESCE(p.puntos_canjeados, 0)::int     AS puntos_canjeados,
             COALESCE(p.puntos_disponibles, 0)::int   AS puntos_disponibles,
             COALESCE(p.nivel_cliente, 'estándar')    AS nivel_cliente
      FROM clientes c
      LEFT JOIN pos_ventas v ON v.cliente_id = c.id
        AND v.estatus = 'completada'
        AND v.fecha_venta BETWEEN $1 AND $2
      LEFT JOIN pos_clientes_puntos p ON p.cliente_id = c.id
      WHERE c.activo = true ${clienteCond}
      GROUP BY c.id, c.nombre_comercial, c.rfc, c.email, c.telefono,
               p.puntos_acumulados, p.puntos_canjeados, p.puntos_disponibles, p.nivel_cliente
      ORDER BY monto_total DESC
      LIMIT ${MAX_ROWS}
    `, params);

    if (formato === 'xlsx') {
      const headers = ['Cliente', 'RFC', 'Email', 'Teléfono', 'Compras', 'Ticket Prom.', 'Monto Total', 'Última Compra', 'Pts. Acumulados', 'Pts. Canjeados', 'Pts. Disponibles', 'Nivel'];
      const dataRows = rows.map(r => [
        r.nombre_comercial, r.rfc || '—', r.email || '—', r.telefono || '—',
        r.total_compras,
        parseFloat(parseFloat(r.ticket_promedio).toFixed(2)),
        parseFloat(parseFloat(r.monto_total).toFixed(2)),
        r.ultima_compra ? fmtDate(r.ultima_compra) : '—',
        r.puntos_acumulados,
        r.puntos_canjeados,
        r.puntos_disponibles,
        r.nivel_cliente
      ]);
      return sendExcel(res, `Compras-por-Cliente-${desde || 'hoy'}`, 'Clientes',
        headers, dataRows, [28, 16, 26, 14, 11, 14, 14, 16, 15, 14, 15, 12]);
    }

    if (formato === 'pdf') {
      const totalGeneral = rows.reduce((s, r) => s + parseFloat(r.monto_total || 0), 0);
      const doc = initPDF(res, 'Compras por Cliente',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} clientes  |  Total: ${fmtCurrency(totalGeneral)}`);
      const headers = ['Cliente', 'RFC', 'Compras', 'Ticket Prom.', 'Monto Total', 'Ult. Compra', 'Pts. Disp.', 'Nivel'];
      const colW = [120, 72, 42, 62, 68, 62, 52, 50];
      const dataRows = rows.map(r => [
        r.nombre_comercial, r.rfc || '—', r.total_compras,
        fmtCurrency(r.ticket_promedio), fmtCurrency(r.monto_total),
        r.ultima_compra ? fmtDate(r.ultima_compra) : '—',
        r.puntos_disponibles,
        r.nivel_cliente
      ]);
      drawTable(doc, headers, dataRows, colW);
      drawTotalsRow(doc, ['TOTAL', '', '', '', fmtCurrency(totalGeneral), '', '', ''], colW);
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows, periodo: { desde: d, hasta: h } } });
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
      return sendExcel(res, 'Inventario-Actual', 'Inventario',
        headers, dataRows, [14, 32, 18, 18, 12, 9, 9, 12, 13, 10, 12]);
    }

    if (formato === 'pdf') {
      const criticos = rows.filter(r => r.nivel_stock === 'critico' || r.nivel_stock === 'sin_stock').length;
      const doc = initPDF(res, 'Inventario Actual',
        `${rows.length} artículos activos  |  ${criticos} en nivel crítico o sin stock`);
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
      return sendExcel(res, `Movimientos-Inventario-${desde || 'hoy'}`, 'Movimientos',
        headers, dataRows, [18, 30, 14, 12, 22, 12, 12, 12, 18]);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Movimientos de Inventario',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} movimientos`);
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
      return sendExcel(res, `Bitacora-${desde || 'hoy'}`, 'Bitácora',
        headers, dataRows, [18, 20, 14, 22, 16, 12, 12, 14, 40]);
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Bitácora del Sistema',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} eventos`);
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

    // Resumen por vendedor
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
        -- Método de pago más usado
        MODE() WITHIN GROUP (ORDER BY v.metodo_pago_descripcion)
          FILTER (WHERE v.estatus = 'completada')                          AS metodo_pago_favorito,
        -- Clientes únicos atendidos
        COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.estatus = 'completada')::int AS clientes_unicos
      FROM pos_ventas v
      WHERE v.fecha_venta BETWEEN $1 AND $2
        AND v.vendedor_nombre IS NOT NULL
      GROUP BY v.vendedor_usuario_id, v.vendedor_nombre
      ORDER BY total_ingresos DESC
    `, [d, h]);

    // Producto más vendido por vendedor
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
      GROUP BY v.vendedor_nombre, d.nombre_producto
      HAVING SUM(d.cantidad) = (
        SELECT MAX(s.q) FROM (
          SELECT SUM(d2.cantidad) AS q
          FROM pos_ventas_detalle d2
          JOIN pos_ventas v2 ON d2.venta_id = v2.id
          WHERE v2.vendedor_nombre = v.vendedor_nombre
            AND v2.fecha_venta BETWEEN $1 AND $2
            AND v2.estatus = 'completada'
          GROUP BY d2.nombre_producto
        ) s
      )
      ORDER BY v.vendedor_nombre
      LIMIT 50
    `, [d, h]);

    // Mapear top producto a cada vendedor
    const topMap = {};
    topProductos.forEach(r => { topMap[r.vendedor_nombre] = r.nombre_producto; });
    const rowsEnriquecidos = rows.map(r => ({
      ...r,
      producto_top: topMap[r.vendedor] || '—'
    }));

    // Resumen global
    const resumen = {
      total_vendedores: rows.length,
      total_ingresos_global: rows.reduce((s, r) => s + parseFloat(r.total_ingresos || 0), 0),
      total_ventas_global: rows.reduce((s, r) => s + parseInt(r.total_ventas || 0), 0),
      top_vendedor: rows[0] ? { nombre: rows[0].vendedor, total: parseFloat(rows[0].total_ingresos) } : null,
      periodo: { desde: d, hasta: h }
    };

    if (formato === 'xlsx') {
      const headers = [
        'Vendedor', '# Ventas', 'Canceladas', 'Total Ingresos',
        'Total Descuentos', 'Total IVA', 'Ticket Promedio',
        'Días Activos', 'Clientes Únicos', 'M.Pago Favorito',
        'Producto Más Vendido', 'Primera Venta', 'Última Venta'
      ];
      const dataRows = rowsEnriquecidos.map((r, i) => [
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
      return sendExcel(res,
        `Ventas-por-Vendedor-${desde || 'hoy'}`, 'Vendedores',
        headers, dataRows,
        [24, 11, 12, 16, 16, 12, 14, 12, 14, 18, 28, 14, 14]
      );
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Ventas por Vendedor',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} vendedores  |  Total: ${fmtCurrency(resumen.total_ingresos_global)}`);

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
      doc.end();
      return;
    }

    return res.json({ ok: true, data: { rows: rowsEnriquecidos, resumen } });
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
        `Auditoria-${desde || 'hoy'}`, 'Auditoría',
        headers, dataRows,
        [8, 18, 18, 12, 14, 11, 22, 16, 22, 40, 40]
      );
    }

    if (formato === 'pdf') {
      const doc = initPDF(res, 'Bitácora de Auditoría',
        `Período: ${fmtDate(d)} al ${fmtDate(h)}  |  ${rows.length} registros`);
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
