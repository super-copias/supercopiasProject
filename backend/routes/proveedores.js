/**
 * Rutas de Proveedores - SuperCopias Backend
 * Endpoints para gestión completa de proveedores
 */

const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');

// CRUD de proveedores
router.get('/', proveedoresController.getList);
router.get('/:id', proveedoresController.getById);
router.post('/', proveedoresController.create);
router.put('/:id', proveedoresController.update);
router.delete('/:id', proveedoresController.delete);

// Catálogos relacionados
router.get('/tipos', proveedoresController.getTipos);
router.get('/condiciones-pago', proveedoresController.getCondicionesPago);

module.exports = router;