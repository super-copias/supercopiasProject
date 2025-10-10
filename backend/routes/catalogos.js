/**
 * Rutas de Catálogos - SuperCopias Backend
 * Endpoints para todos los catálogos del sistema
 */

const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');

// Estados de México
router.get('/estados', catalogosController.getEstados);

// Regímenes fiscales SAT
router.get('/regimenes-fiscales', catalogosController.getRegimenesFiscales);

// Usos CFDI SAT
router.get('/usos-cfdi', catalogosController.getUsosCFDI);

// Formas de pago SAT
router.get('/formas-pago', catalogosController.getFormasPago);

// Métodos de pago SAT
router.get('/metodos-pago', catalogosController.getMetodosPago);

module.exports = router;