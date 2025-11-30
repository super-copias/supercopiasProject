/**
 * Rutas de Proveedores - SuperCopias Backend
 * Endpoints para gestión completa de proveedores
 */

const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');

// Catálogos relacionados (deben ir antes de las rutas con :id)
router.get('/catalogo/tipos', proveedoresController.getTipos);
router.get('/catalogo/metodos-pago', proveedoresController.getMetodosPago);

// CRUD de proveedores
router.get('/', proveedoresController.getList);
router.get('/:id', proveedoresController.getById);
router.post('/', proveedoresController.create);
router.put('/:id', proveedoresController.update);
router.delete('/:id', proveedoresController.delete);

module.exports = router;