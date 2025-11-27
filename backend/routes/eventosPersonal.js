/**
 * Rutas de Eventos de Personal
 * Manejo de vacaciones, faltas, permisos y otros eventos de empleados
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Para acceder a :empleadoId
const auth = require('../middlewares/auth');
const {
  listEventos,
  getResumenVacaciones,
  createEvento,
  updateEvento,
  deleteEvento,
  getEstadisticas
} = require('../controllers/eventosPersonalController');

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas de eventos de personal
router.get('/', listEventos); // GET /api/empleados/:empleadoId/eventos
router.get('/resumen-vacaciones', getResumenVacaciones); // GET /api/empleados/:empleadoId/eventos/resumen-vacaciones
router.get('/estadisticas', getEstadisticas); // GET /api/empleados/:empleadoId/eventos/estadisticas
router.post('/', createEvento); // POST /api/empleados/:empleadoId/eventos
router.put('/:id', updateEvento); // PUT /api/empleados/:empleadoId/eventos/:id
router.delete('/:id', deleteEvento); // DELETE /api/empleados/:empleadoId/eventos/:id

module.exports = router;
