/**
 * Rutas de Catálogo de Turnos
 * Base: /api/empleados/turnos
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const {
  listTurnos,
  createTurno,
  updateTurno,
  toggleEstadoTurno
} = require('../controllers/turnosController');

router.get('/', auth, listTurnos);
router.post('/', auth, roles(['admin']), createTurno);
router.put('/:id', auth, roles(['admin']), updateTurno);
router.patch('/:id/toggle-estado', auth, roles(['admin']), toggleEstadoTurno);

module.exports = router;
