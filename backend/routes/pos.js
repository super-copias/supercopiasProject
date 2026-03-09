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

module.exports = router;
