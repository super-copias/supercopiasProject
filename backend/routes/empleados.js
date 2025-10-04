const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { listEmpleados, getEmpleado, createEmpleado, updateEmpleado, deleteEmpleado, importEmpleados, assignRole } = require('../controllers/empleadosController');

router.get('/', auth, listEmpleados);
router.get('/:id', auth, getEmpleado);
router.post('/', auth, createEmpleado);
router.put('/:id', auth, updateEmpleado);
router.delete('/:id', auth, deleteEmpleado);

// import Excel -> solo admin
router.post('/import', auth, roles(['admin']), upload.single('file'), importEmpleados);
// asignar rol -> solo admin
router.post('/:id/role', auth, roles(['admin']), assignRole);

module.exports = router;
