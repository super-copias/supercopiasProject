/**
 * Rutas Punto de Venta (POS) - SuperCopias
 * Base URL: /api/pos
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const {
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
} = require('../controllers/posController');

// ── Catálogo de productos disponibles en POS ──────────────────
router.get('/catalogo', auth, getCatalogo);

// ── Descuentos ────────────────────────────────────────────────
router.get('/descuentos', auth, getDescuentos);

// ── Estadísticas del día ──────────────────────────────────────
router.get('/stats/hoy', auth, getStatsHoy);

// ── Ventas ────────────────────────────────────────────────────
router.get('/ventas',          auth, listVentas);
router.post('/ventas',         auth, createVenta);
router.get('/ventas/:id',      auth, getVentaById);
router.patch('/ventas/:id/cancelar', auth, cancelarVenta);
router.patch('/ventas/:id/ticket',   auth, marcarTicketGenerado);

// ── Clientes - Puntos ─────────────────────────────────────────
router.get('/clientes/:id/puntos', auth, getPuntosByCliente);

// ── Reportes ──────────────────────────────────────────────────
router.get('/reportes/vendedores', auth, getReporteVendedores);
router.get('/reportes/clientes',   auth, getReporteClientes);

// ── Corte de caja ─────────────────────────────────────────────
router.get('/corte', auth, getCorteCaja);

// ── Cotizaciones ──────────────────────────────────────────────
router.get('/cotizaciones',                 auth, listCotizaciones);
router.post('/cotizaciones',                auth, createCotizacion);
router.get('/cotizaciones/:id',             auth, getCotizacionById);
router.patch('/cotizaciones/:id/estatus',   auth, updateEstatusCotizacion);
router.post('/cotizaciones/:id/convertir',  auth, convertirCotizacion);

module.exports = router;
