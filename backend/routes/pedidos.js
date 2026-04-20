/**
 * Rutas de Pedidos POS - SuperCopias
 * Base URL: /api/pos/pedidos
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const {
  createPedido,
  listPedidos,
  getPedidoById,
  tomarPedido,
  terminarPedido,
  entregarPedido,
  cancelarPedido,
  getStatsPedidos,
} = require('../controllers/pedidosController');

// Stats generales (badge UI) — antes del :id para no colisionar
router.get('/stats',               auth, getStatsPedidos);

// CRUD principal
router.get('/',                    auth, listPedidos);
router.post('/',                   auth, createPedido);
router.get('/:id',                 auth, getPedidoById);

// Transiciones de estado
router.patch('/:id/tomar',         auth, tomarPedido);
router.patch('/:id/terminar',      auth, terminarPedido);
router.patch('/:id/entregar',      auth, entregarPedido);
router.patch('/:id/cancelar',      auth, cancelarPedido);

module.exports = router;
