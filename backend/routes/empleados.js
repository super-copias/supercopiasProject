/**
 * Rutas de Empleados
 * Todas las rutas requieren autenticación (middleware auth)
 * Base URL: /api/empleados
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { 
  listEmpleados, 
  getEmpleado, 
  createEmpleado, 
  updateEmpleado, 
  deleteEmpleado, 
  uploadExcelEmpleados,
  getRoles,
  assignRoles,
  getPuestos
} = require('../controllers/empleadosController');

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
    cb(null, 'empleados-' + uniqueSuffix + path.extname(file.originalname));
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
 * GET /api/empleados
 * Listar empleados con búsqueda y paginación
 * Query params: q (búsqueda), page (página), limit (límite)
 */
router.get('/', auth, listEmpleados);

/**
 * GET /api/empleados/puestos
 * Obtener catálogo de puestos disponibles
 */
router.get('/puestos', auth, getPuestos);

/**
 * GET /api/empleados/:id
 * Obtener un empleado específico por ID
 */
router.get('/:id', auth, getEmpleado);

/**
 * POST /api/empleados
 * Crear un nuevo empleado
 * Body: datos del empleado (nombre, telefono, email, puesto, etc.)
 */
router.post('/', auth, createEmpleado);

/**
 * PUT /api/empleados/:id
 * Actualizar un empleado existente
 * Body: datos a actualizar
 */
router.put('/:id', auth, updateEmpleado);

/**
 * DELETE /api/empleados/:id
 * Eliminar un empleado
 */
router.delete('/:id', auth, deleteEmpleado);

/**
 * POST /api/empleados/upload-excel
 * Carga masiva de empleados desde archivo Excel - Solo admin
 * Acepta: archivos .xlsx y .xls
 * Headers requeridos: nombre, apellidos, telefono, email, puesto, departamento, salario, fechaIngreso, roles
 */
router.post('/upload-excel', auth, roles(['admin']), upload.single('excel'), uploadExcelEmpleados);

/**
 * GET /api/empleados/roles
 * Obtener catálogo de roles disponibles
 */
router.get('/roles', auth, getRoles);

/**
 * POST /api/empleados/:id/assign-roles
 * Asignar roles a un empleado - Solo admin
 * Body: { roles: string[], crearUsuario?: boolean }
 */
router.post('/:id/assign-roles', auth, roles(['admin']), assignRoles);

module.exports = router;
