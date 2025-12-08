/**
 * Rutas de Inventarios
 * Gestión de inventarios: productos para venta, insumos operativos e items genéricos
 * Base URL: /api/inventarios
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { 
  listInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
  archivarInventario,
  addMovimiento,
  getHistorialMovimientos,
  getAlertas,
  getStats,
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getReglasStock,
  createReglasStock,
  updateReglasStock,
  deleteReglasStock
} = require('../controllers/inventariosController');

/**
 * GET /api/inventarios/stats
 * Obtener estadísticas generales del inventario
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/stats', auth, getStats);

/**
 * GET /api/inventarios/alertas
 * Obtener alertas de stock bajo o crítico
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/alertas', auth, getAlertas);

/**
 * GET /api/inventarios/categorias
 * Obtener catálogo de categorías disponibles
 * Query params: tipo (opcional: venta, insumo, generico)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/categorias', auth, getCategorias);

/**
 * POST /api/inventarios/categorias
 * Crear nueva categoría personalizada
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.post('/categorias', auth, createCategoria);

/**
 * PUT /api/inventarios/categorias/:id
 * Actualizar categoría existente
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.put('/categorias/:id', auth, updateCategoria);

/**
 * DELETE /api/inventarios/categorias/:id
 * Eliminar (desactivar) categoría
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.delete('/categorias/:id', auth, deleteCategoria);

/**
 * GET /api/inventarios
 * Listar inventarios con filtros y paginación
 * Query params: q, tipo, categoria, estatus, stockNivel, page, limit
 */
router.get('/', auth, listInventarios);

/**
 * GET /api/inventarios/:id
 * Obtener un artículo específico por ID
 */
router.get('/:id', auth, getInventarioById);

/**
 * POST /api/inventarios
 * Crear un nuevo artículo en inventario
 */
router.post('/', auth, createInventario);

/**
 * PUT /api/inventarios/:id
 * Actualizar un artículo existente
 */
router.put('/:id', auth, updateInventario);

/**
 * DELETE /api/inventarios/:id
 * Eliminar un artículo (hard delete - solo si no tiene movimientos)
 */
router.delete('/:id', auth, deleteInventario);

/**
 * PATCH /api/inventarios/:id/archivar
 * Archivar/desarchivar un artículo (soft delete usando campo activo)
 * Body: { archivar: true/false }
 */
router.patch('/:id/archivar', auth, archivarInventario);

/**
 * POST /api/inventarios/:id/movimientos
 * Registrar movimiento de inventario (entrada/salida/ajuste)
 */
router.post('/:id/movimientos', auth, addMovimiento);

/**
 * GET /api/inventarios/:id/movimientos
 * Obtener historial de movimientos de un artículo
 */
router.get('/:id/movimientos', auth, getHistorialMovimientos);

/**
 * GET /api/inventarios/:id/reglas-stock
 * Obtener reglas de stock personalizadas de un artículo
 */
router.get('/:id/reglas-stock', auth, getReglasStock);

/**
 * POST /api/inventarios/:id/reglas-stock
 * Crear reglas de stock personalizadas para un artículo
 */
router.post('/:id/reglas-stock', auth, createReglasStock);

/**
 * PUT /api/inventarios/:id/reglas-stock
 * Actualizar reglas de stock existentes
 */
router.put('/:id/reglas-stock', auth, updateReglasStock);

/**
 * DELETE /api/inventarios/:id/reglas-stock
 * Eliminar reglas personalizadas (volver a usar reglas por defecto)
 */
router.delete('/:id/reglas-stock', auth, deleteReglasStock);

module.exports = router;
