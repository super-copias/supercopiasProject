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
const { requireReporte, obtenerReportesPermitidos } = require('../middlewares/reportesPermisos');
const { REPORTES_CATALOGO } = require('../utils/reportesCatalogo');
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

// ── Reportes permitidos para el usuario autenticado ──────────
router.get('/permitidos', auth, async (req, res) => {
  try {
    const permitidos = await obtenerReportesPermitidos(req.user);
    res.json({ success: true, data: { catalogo: REPORTES_CATALOGO, permitidos } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener los reportes permitidos' });
  }
});

// ── Ventas ────────────────────────────────────────────────────
// ?desde=YYYY-MM-DD &hasta=YYYY-MM-DD &vendedor_id= &cliente_id= &metodo_pago= &estatus= &formato=pdf|xlsx
router.get('/ventas', auth, requireReporte('ventas'), getReporteVentas);

// ── Corte de caja ─────────────────────────────────────────────
// ?fecha=YYYY-MM-DD &vendedor_id= &formato=pdf|xlsx
router.get('/corte-caja', auth, requireReporte('corte-caja'), getReporteCorteCaja);

// ── Productos / Servicios más vendidos ────────────────────────
// ?desde= &hasta= &top=50 &formato=pdf|xlsx
router.get('/productos', auth, requireReporte('productos'), getReporteProductos);

// ── Compras por cliente ───────────────────────────────────────
// ?desde= &hasta= &cliente_id= &formato=pdf|xlsx
router.get('/clientes', auth, requireReporte('clientes'), getReporteClientes);

// ── Inventario actual ─────────────────────────────────────────
// ?departamento_id= &nivel_stock=ok|bajo|critico|sin_stock|servicio &formato=pdf|xlsx
router.get('/inventario', auth, requireReporte('inventario'), getReporteInventario);

// ── Movimientos de inventario ─────────────────────────────────
// ?desde= &hasta= &tipo_movimiento= &inventario_id= &formato=pdf|xlsx
router.get('/movimientos', auth, requireReporte('movimientos'), getReporteMovimientos);

// ── Bitácora del sistema ──────────────────────────────────────
// ?desde= &hasta= &modulo= &accion= &usuario_id= &resultado= &formato=pdf|xlsx
router.get('/bitacora', auth, requireReporte('bitacora'), getReporteBitacora);

// ── Ventas por vendedor ───────────────────────────────────────
// ?desde= &hasta= &formato=pdf|xlsx
router.get('/vendedores', auth, requireReporte('vendedores'), getReporteVendedores);

// ── Bitácora de Auditoría (triggers BD) ────────────────────
// ?desde= &hasta= &tabla= &operacion= &usuario_id= &formato=pdf|xlsx
router.get('/auditoria', auth, requireReporte('auditoria'), getReporteAuditoria);

module.exports = router;
