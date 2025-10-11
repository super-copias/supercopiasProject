/**
 * Rutas de Empleados
 * Todas las rutas requieren autenticación (middleware auth)
 * Base URL: /api/empleados
 */

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { 
  listEmpleados, 
  getEmpleado, 
  createEmpleado, 
  updateEmpleado, 
  deleteEmpleado, 
  getRoles,
  assignRoles,
  getPuestos,
  getModulos,
  updatePermisos
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
 * GET /api/empleados/roles
 * Obtener catálogo de roles disponibles
 */
router.get('/roles', getRoles);

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
 * POST /api/empleados/:id/assign-roles
 * Asignar roles a un empleado - Solo admin
 * Body: { roles: string[], crearUsuario?: boolean }
 */
router.post('/:id/assign-roles', auth, roles(['admin']), assignRoles);

/**
 * PUT /api/empleados/:id/permisos
 * Actualizar permisos de módulos de un empleado - Solo admin
 * Body: { tipoPermiso: string, modulosPermitidos: string[], permisos?: object[] }
 */
router.put('/:id/permisos', auth, roles(['admin']), updatePermisos);

module.exports = router;
