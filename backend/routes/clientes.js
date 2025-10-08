/**
 * Rutas de Clientes
 * Todas las rutas requieren autenticación (middleware auth)
 * Base URL: /api/clientes
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { 
  listClientes, 
  getCliente, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  getUsosCFDI 
} = require('../controllers/clientesController');

/**
 * GET /api/clientes
 * Listar clientes con búsqueda y paginación
 * Query params: q (búsqueda), page (página), limit (límite)
 */
router.get('/', auth, listClientes);

/**
 * GET /api/clientes/usos-cfdi
 * Obtener catálogo de Usos CFDI de México
 */
router.get('/usos-cfdi', auth, getUsosCFDI);

/**
 * GET /api/clientes/:id
 * Obtener un cliente específico por ID
 */
router.get('/:id', auth, getCliente);

/**
 * POST /api/clientes
 * Crear un nuevo cliente
 * Body: datos del cliente (nombre, telefono, email, etc.)
 */
router.post('/', auth, createCliente);

/**
 * PUT /api/clientes/:id
 * Actualizar un cliente existente
 * Body: datos a actualizar
 */
router.put('/:id', auth, updateCliente);

/**
 * DELETE /api/clientes/:id
 * Eliminar un cliente
 */
router.delete('/:id', auth, deleteCliente);

module.exports = router;
