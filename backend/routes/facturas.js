/**
 * routes/facturas.js
 * Rutas para el módulo de Facturación CFDI 4.0
 */
const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const roles   = require('../middlewares/roles');
const ctrl = require('../controllers/facturasController');

// Todas las rutas requieren autenticación
router.use(auth);

// ── Catálogo de impuestos ───────────────────────────────────────────────────
// Lectura pública para cualquier usuario autenticado (necesaria para calcular)
router.get('/impuestos',          ctrl.getTasas);
router.put('/impuestos/:id',      roles(['admin']), ctrl.updateTasa);

// ── Endpoint de cálculo rápido (GET o POST) ─────────────────────────────────
router.get('/calcular',           ctrl.calcularImpuestos);
router.post('/calcular',          ctrl.calcularImpuestos);

// ── CRUD de facturas ────────────────────────────────────────────────────────
router.get('/',                   ctrl.listFacturas);
router.post('/',                  ctrl.createFactura);
router.get('/:id',                ctrl.getFactura);
router.patch('/:id/generar',      ctrl.marcarGenerada);
router.patch('/:id/cancelar',     ctrl.cancelarFactura);

module.exports = router;
