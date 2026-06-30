/**
 * Rutas de Equipos
 * Gestión de equipos electrónicos del negocio
 * Base URL: /api/equipos
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { 
  listEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  addContador,
  updateContador,
  deleteContador,
  getHistorialContador,
  addMantenimiento,
  updateMantenimiento,
  deleteMantenimiento,
  getHistorialMantenimiento,
  addConsumible,
  updateConsumible,
  deleteConsumible,
  getConsumibles,
  getStats,
  configurarMantenimientoPreventivo,
  getAlertasMantenimiento
} = require('../controllers/equiposController');

/**
 * GET /api/equipos/stats
 * Obtener estadísticas generales de equipos
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/stats', auth, getStats);

/**
 * GET /api/equipos/alertas-mantenimiento
 * Obtener alertas de mantenimientos próximos o vencidos
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/alertas-mantenimiento', auth, getAlertasMantenimiento);

/**
 * GET /api/equipos
 * Listar equipos con filtros y paginación
 * Query params: q, tipo, estatus, cliente_id, page, limit
 */
router.get('/', auth, listEquipos);

/**
 * GET /api/equipos/:id
 * Obtener un equipo específico por ID
 */
router.get('/:id', auth, getEquipoById);

/**
 * POST /api/equipos
 * Crear un nuevo equipo
 */
router.post('/', auth, createEquipo);

/**
 * PUT /api/equipos/:id
 * Actualizar un equipo existente
 */
router.put('/:id', auth, updateEquipo);

/**
 * DELETE /api/equipos/:id
 * Eliminar un equipo (soft delete)
 */
router.delete('/:id', auth, deleteEquipo);

/**
 * POST /api/equipos/:id/contador
 * Agregar lectura de contador
 */
router.post('/:id/contador', auth, addContador);

/**
 * GET /api/equipos/:id/contador
 * Obtener historial de contadores
 */
router.get('/:id/contador', auth, getHistorialContador);

/**
 * PUT /api/equipos/:id/contador/:registroId
 * Actualizar registro de contador
 */
router.put('/:id/contador/:registroId', auth, updateContador);

/**
 * DELETE /api/equipos/:id/contador/:registroId
 * Eliminar registro de contador (hard delete)
 */
router.delete('/:id/contador/:registroId', auth, deleteContador);

/**
 * POST /api/equipos/:id/mantenimiento
 * Agregar registro de mantenimiento
 */
router.post('/:id/mantenimiento', auth, addMantenimiento);

/**
 * GET /api/equipos/:id/mantenimiento
 * Obtener historial de mantenimientos
 */
router.get('/:id/mantenimiento', auth, getHistorialMantenimiento);

/**
 * PUT /api/equipos/:id/mantenimiento/:registroId
 * Actualizar registro de mantenimiento
 */
router.put('/:id/mantenimiento/:registroId', auth, updateMantenimiento);

/**
 * DELETE /api/equipos/:id/mantenimiento/:registroId
 * Eliminar registro de mantenimiento (hard delete)
 */
router.delete('/:id/mantenimiento/:registroId', auth, deleteMantenimiento);

/**
 * POST /api/equipos/:id/consumibles
 * Agregar consumible al equipo
 */
router.post('/:id/consumibles', auth, addConsumible);

/**
 * GET /api/equipos/:id/consumibles
 * Obtener consumibles del equipo
 */
router.get('/:id/consumibles', auth, getConsumibles);

/**
 * PUT /api/equipos/:id/consumibles/:registroId
 * Actualizar consumible
 */
router.put('/:id/consumibles/:registroId', auth, updateConsumible);

/**
 * DELETE /api/equipos/:id/consumibles/:registroId
 * Eliminar consumible (hard delete)
 */
router.delete('/:id/consumibles/:registroId', auth, deleteConsumible);

/**
 * PUT /api/equipos/:id/mantenimiento-preventivo
 * Configurar mantenimiento preventivo del equipo
 */
router.put('/:id/mantenimiento-preventivo', auth, configurarMantenimientoPreventivo);

module.exports = router;
