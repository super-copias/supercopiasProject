/**
 * ===============================================
 * Rutas de Catálogos de Equipos
 * ===============================================
 * Endpoints para obtener catálogos de tipos,
 * estatus y marcas de equipos
 * ===============================================
 */

const express = require('express');
const router = express.Router();
const catalogosEquiposController = require('../controllers/catalogosEquiposController');
const authenticateToken = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/catalogos-equipos/tipos
 * Obtener todos los tipos de equipos activos
 */
router.get('/tipos', catalogosEquiposController.getTiposEquipo);

/**
 * GET /api/catalogos-equipos/estatus
 * Obtener todos los estatus de equipos activos
 */
router.get('/estatus', catalogosEquiposController.getEstatusEquipo);

/**
 * GET /api/catalogos-equipos/marcas
 * Obtener todas las marcas de equipos activas
 */
router.get('/marcas', catalogosEquiposController.getMarcasEquipo);

/**
 * POST /api/catalogos-equipos/marcas
 * Crear una nueva marca de equipo
 */
router.post('/marcas', catalogosEquiposController.createMarca);

/**
 * GET /api/catalogos-equipos/completos
 * Obtener todos los catálogos en una sola petición
 */
router.get('/completos', catalogosEquiposController.getCatalogosCompletos);

module.exports = router;
