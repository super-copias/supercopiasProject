/**
 * Rutas de Inventarios v2 - SuperCopias
 * Base URL: /api/inventarios
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  getDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento,
  listInventarios, getInventariosPorDepartamento, getInventarioById,
  createInventario, updateInventario, deleteInventario, archivarInventario,
  addMovimiento, getHistorialMovimientos, getHistorialGlobal,
  getStats, getAlertas, getCatalogoPos,
  getTabuladorPrecios, saveTabuladorPrecios
} = require('../controllers/inventariosController');

// ── Rutas fijas (deben ir ANTES de /:id) ─────────────────────────────────────
router.get('/stats',              auth, getStats);
router.get('/alertas',            auth, getAlertas);
router.get('/catalogo-pos',       auth, getCatalogoPos);
router.get('/por-departamento',   auth, getInventariosPorDepartamento);
router.get('/movimientos/historial', auth, getHistorialGlobal);

// ── Departamentos ─────────────────────────────────────────────────────────────
router.get('/departamentos',      auth, getDepartamentos);
router.post('/departamentos',     auth, createDepartamento);
router.put('/departamentos/:id',  auth, updateDepartamento);
router.delete('/departamentos/:id', auth, deleteDepartamento);

// ── Artículos ─────────────────────────────────────────────────────────────────
router.get('/',    auth, listInventarios);
router.post('/',   auth, createInventario);
router.get('/:id', auth, getInventarioById);
router.put('/:id', auth, updateInventario);
router.delete('/:id', auth, deleteInventario);
router.patch('/:id/archivar', auth, archivarInventario);

// ── Movimientos por artículo ──────────────────────────────────────────────────
router.post('/:id/movimientos', auth, addMovimiento);
router.get('/:id/movimientos',  auth, getHistorialMovimientos);

// ── Tabulador de precios por volumen ──────────────────────────────────────────
router.get('/:id/tabulador',  auth, getTabuladorPrecios);
router.post('/:id/tabulador', auth, saveTabuladorPrecios);

module.exports = router;
