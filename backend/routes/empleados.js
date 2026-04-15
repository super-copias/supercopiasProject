/**
 * Rutas de Empleados
 * Todas las rutas requieren autenticación (middleware auth)
 * Base URL: /api/empleados
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { query } = require('../config/database');

// La función createEmpleadoTemp fue eliminada - ahora usamos la del controller
// que incluye la lógica completa de creación de usuario y credenciales

const { 
  listEmpleados, 
  getEmpleado, 
  createEmpleado,
  updateEmpleado, 
  deleteEmpleado,
  getPuestos,
  getModulos,
  toggleEstadoEmpleado,
  resetPassword
} = require('../controllers/empleadosController');

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
 * GET /api/empleados/modulos
 * Obtener catálogo de módulos del sistema
 */
router.get('/modulos', auth, getModulos);

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
 * Eliminar un empleado (desactivar)
 */
router.delete('/:id', auth, deleteEmpleado);

/**
 * PATCH /api/empleados/:id/toggle-estado
 * Activar o desactivar un empleado
 */
router.patch('/:id/toggle-estado', auth, toggleEstadoEmpleado);

/**
 * PATCH /api/empleados/:id/reset-password
 * Asignar contraseña temporal (solo administradores)
 */
router.patch('/:id/reset-password', auth, roles(['admin']), resetPassword);

/**
 * Rutas anidadas de eventos de personal
 * Base: /api/empleados/:empleadoId/eventos
 */
const eventosPersonalRoutes = require('./eventosPersonal');
router.use('/:empleadoId/eventos', eventosPersonalRoutes);

module.exports = router;
