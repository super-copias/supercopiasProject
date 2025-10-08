const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listClientes, getCliente, createCliente, updateCliente, deleteCliente, getUsosCFDI } = require('../controllers/clientesController');

router.get('/', auth, listClientes);
router.get('/usos-cfdi', auth, getUsosCFDI);
router.get('/:id', auth, getCliente);
router.post('/', auth, createCliente);
router.put('/:id', auth, updateCliente);
router.delete('/:id', auth, deleteCliente);

module.exports = router;
