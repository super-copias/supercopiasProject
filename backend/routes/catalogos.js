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

// Módulos del sistema
router.get('/modulos', catalogosController.getModulos);

// Sucursales
router.get('/sucursales', catalogosController.getSucursales);
router.post('/sucursales', catalogosController.createSucursal);

// Puestos de trabajo
router.get('/puestos', catalogosController.getPuestos);
router.post('/puestos', catalogosController.createPuesto);

// Horarios de acceso
router.get('/horarios', catalogosController.getHorarios);
router.post('/horarios', catalogosController.createHorario);
router.put('/horarios/:id', catalogosController.updateHorario);
router.delete('/horarios/:id', catalogosController.deleteHorario);

module.exports = router;