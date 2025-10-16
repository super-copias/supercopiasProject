/**
 * Rutas de Clientes
 * Todas las rutas requieren autenticación (middleware auth)
 * Base URL: /api/clientes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middlewares/auth');
const { 
  listClientes, 
  getCliente, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  getUsosCFDI,
  uploadExcelClientes,
  descargarPlantillaExcel
} = require('../controllers/clientesController');

/**
 * Configuración de multer para carga de archivos Excel
 * Solo acepta archivos .xlsx y .xls
 * Máximo 5MB de tamaño
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'clientes-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'));
    }
  }
});

/**
 * GET /api/clientes/usos-cfdi
 * Obtener catálogo de Usos CFDI de México
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.get('/usos-cfdi', auth, getUsosCFDI);

/**
 * GET /api/clientes/plantilla-excel
 * Descargar plantilla Excel para carga masiva de clientes
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.get('/plantilla-excel', auth, descargarPlantillaExcel);

/**
 * POST /api/clientes/upload-excel
 * Carga masiva de clientes desde archivo Excel
 * Acepta: archivos .xlsx y .xls
 * Headers requeridos: nombre, telefono, segundo telefono, correo, direccion, 
 *                    razon social, rfc, regimen fiscal, codigo postal, uso cfdi
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.post('/upload-excel', auth, upload.single('excel'), uploadExcelClientes);

/**
 * GET /api/clientes
 * Listar clientes con búsqueda y paginación
 * Query params: q (búsqueda), page (página), limit (límite)
 */
router.get('/', auth, listClientes);

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
