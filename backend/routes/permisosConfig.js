/**
 * Rutas de Configuración de Permisos
 * Base: /api/empleados/permisos-config
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getConfig, updateConfig } = require('../controllers/permisosConfigController');

router.get('/', auth, getConfig);
router.put('/', auth, roles(['admin']), updateConfig);

module.exports = router;
