/**
 * Rutas de Reportes - SuperCopias
 * Base URL: /api/reportes
 *
 * Todos los endpoints requieren autenticación JWT.
 * El parámetro opcional ?formato=pdf|xlsx activa la descarga del archivo.
 * Sin formato devuelve JSON para preview en la UI.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  getReporteVentas,
  getReporteCorteCaja,
  getReporteProductos,
  getReporteClientes,
  getReporteInventario,
  getReporteMovimientos,
  getReporteBitacora,
  getReporteVendedores,
  getReporteAuditoria,
} = require('../controllers/reportesController');

// ── Ventas ────────────────────────────────────────────────────
// ?desde=YYYY-MM-DD &hasta=YYYY-MM-DD &vendedor_id= &cliente_id= &metodo_pago= &estatus= &formato=pdf|xlsx
router.get('/ventas', auth, getReporteVentas);

// ── Corte de caja ─────────────────────────────────────────────
// ?fecha=YYYY-MM-DD &vendedor_id= &formato=pdf|xlsx
router.get('/corte-caja', auth, getReporteCorteCaja);

// ── Productos / Servicios más vendidos ────────────────────────
// ?desde= &hasta= &top=50 &formato=pdf|xlsx
router.get('/productos', auth, getReporteProductos);

// ── Compras por cliente ───────────────────────────────────────
// ?desde= &hasta= &cliente_id= &formato=pdf|xlsx
router.get('/clientes', auth, getReporteClientes);

// ── Inventario actual ─────────────────────────────────────────
// ?departamento_id= &nivel_stock=ok|bajo|critico|sin_stock|servicio &formato=pdf|xlsx
router.get('/inventario', auth, getReporteInventario);

// ── Movimientos de inventario ─────────────────────────────────
// ?desde= &hasta= &tipo_movimiento= &inventario_id= &formato=pdf|xlsx
router.get('/movimientos', auth, getReporteMovimientos);

// ── Bitácora del sistema ──────────────────────────────────────
// ?desde= &hasta= &modulo= &accion= &usuario_id= &resultado= &formato=pdf|xlsx
router.get('/bitacora', auth, getReporteBitacora);

// ── Ventas por vendedor ───────────────────────────────────────
// ?desde= &hasta= &formato=pdf|xlsx
router.get('/vendedores', auth, getReporteVendedores);

// ── Bitácora de Auditoría (triggers BD) ────────────────────
// ?desde= &hasta= &tabla= &operacion= &usuario_id= &formato=pdf|xlsx
router.get('/auditoria', auth, getReporteAuditoria);

module.exports = router;
