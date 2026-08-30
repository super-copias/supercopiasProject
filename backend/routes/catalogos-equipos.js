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
 * Obtener tipos de equipos. ?incluir_inactivos=true devuelve también los ocultos.
 */
router.get('/tipos', catalogosEquiposController.getTiposEquipo);

/**
 * POST /api/catalogos-equipos/tipos
 * Crear un nuevo tipo de equipo
 */
router.post('/tipos', catalogosEquiposController.createTipo);

/**
 * PUT /api/catalogos-equipos/tipos/:id
 * Actualizar un tipo de equipo (el código no es editable)
 */
router.put('/tipos/:id', catalogosEquiposController.updateTipo);

/**
 * DELETE /api/catalogos-equipos/tipos/:id
 * Baja lógica: marca activo = false (lo oculta del catálogo)
 */
router.delete('/tipos/:id', catalogosEquiposController.deleteTipo);

/**
 * GET /api/catalogos-equipos/estatus
 * Obtener todos los estatus de equipos activos
 */
router.get('/estatus', catalogosEquiposController.getEstatusEquipo);

/**
 * GET /api/catalogos-equipos/marcas
 * Obtener marcas de equipos. ?incluir_inactivos=true devuelve también las ocultas.
 */
router.get('/marcas', catalogosEquiposController.getMarcasEquipo);

/**
 * POST /api/catalogos-equipos/marcas
 * Crear una nueva marca de equipo
 */
router.post('/marcas', catalogosEquiposController.createMarca);

/**
 * PUT /api/catalogos-equipos/marcas/:id
 * Actualizar una marca de equipo
 */
router.put('/marcas/:id', catalogosEquiposController.updateMarca);

/**
 * DELETE /api/catalogos-equipos/marcas/:id
 * Baja lógica: marca activo = false (la oculta del catálogo)
 */
router.delete('/marcas/:id', catalogosEquiposController.deleteMarca);

/**
 * GET /api/catalogos-equipos/completos
 * Obtener todos los catálogos en una sola petición
 */
router.get('/completos', catalogosEquiposController.getCatalogosCompletos);

module.exports = router;
