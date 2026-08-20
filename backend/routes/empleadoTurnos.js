/**
 * Rutas de asignación de Turnos por empleado
 * Base: /api/empleados/:empleadoId/turnos-dias y /turnos-historial
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth');
const {
  getTurnosDias,
  setTurnosDias,
  listTurnosHistorial
} = require('../controllers/turnosController');

router.use(auth);

router.get('/turnos-dias', getTurnosDias);
router.put('/turnos-dias', setTurnosDias);
router.get('/turnos-historial', listTurnosHistorial);

module.exports = router;
