/**
 * Rutas de Sueldos (historial por empleado)
 * Base: /api/empleados/:empleadoId/sueldos
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth');
const {
  listSueldos,
  createSueldo,
  updateSueldo,
  deleteSueldo
} = require('../controllers/sueldosController');

router.use(auth);

router.get('/', listSueldos);
router.post('/', createSueldo);
router.put('/:id', updateSueldo);
router.delete('/:id', deleteSueldo);

module.exports = router;
