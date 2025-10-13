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

// Función temporal para crear empleados - solo PostgreSQL
async function createEmpleadoTemp(req, res) {
  try {
    const {
      nombre,
      email,
      telefono,
      puesto,
      sucursal,
      salario,
      fechaIngreso,
      activo = true,
      fechaBaja = null,
      tipoPermiso = 'sin_permisos',
      modulosPermitidos = []
    } = req.body;
    
    // Validaciones requeridas
    if (!nombre || !puesto || !sucursal) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REQUIRED_FIELD',
          message: 'Nombre, puesto y sucursal son requeridos'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validar email único si se proporciona
    if (email) {
      const emailExistente = await query(
        'SELECT id FROM empleados WHERE email = $1 AND activo = true',
        [email.toLowerCase()]
      );
      
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: 'Ya existe un empleado con este email'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Convertir tipoPermiso del frontend a tipo_acceso de la DB
    let tipoAcceso = 'sin_permisos';
    if (tipoPermiso === 'administrador') {
      tipoAcceso = 'administrador';
    } else if (tipoPermiso === 'personalizado') {
      tipoAcceso = 'personalizado';
    }

    // Insertar empleado en PostgreSQL
    const empleadoResult = await query(`
      INSERT INTO empleados (
        nombre, email, telefono, puesto_id, sucursal_id, salario, 
        fecha_ingreso, activo, fecha_baja, tipo_acceso, fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      nombre.trim(),
      email ? email.toLowerCase() : null,
      telefono || null,
      puesto,
      sucursal,
      salario ? parseFloat(salario) : null,
      fechaIngreso || new Date().toISOString().split('T')[0],
      activo,
      (!activo && fechaBaja) ? fechaBaja : null,
      tipoAcceso
    ]);

    const empleadoCreado = empleadoResult.rows[0];

    // Configurar módulos del empleado
    if (tipoPermiso === 'administrador') {
      // Obtener todos los módulos para administrador
      const modulosResult = await query('SELECT clave FROM modulos WHERE activo = true');
      for (const modulo of modulosResult.rows) {
        await query(`
          INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
          VALUES ($1, $2, true)
        `, [empleadoCreado.id, modulo.clave]);
      }
    } else if (tipoPermiso === 'personalizado' && modulosPermitidos.length > 0) {
      // Insertar solo los módulos seleccionados
      const modulosResult = await query('SELECT clave FROM modulos WHERE activo = true');
      for (const modulo of modulosResult.rows) {
        const tieneAcceso = modulosPermitidos.includes(modulo.clave);
        await query(`
          INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
          VALUES ($1, $2, $3)
        `, [empleadoCreado.id, modulo.clave, tieneAcceso]);
      }
    } else {
      // Sin permisos - insertar todos los módulos con acceso false
      const modulosResult = await query('SELECT clave FROM modulos WHERE activo = true');
      for (const modulo of modulosResult.rows) {
        await query(`
          INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
          VALUES ($1, $2, false)
        `, [empleadoCreado.id, modulo.clave]);
      }
    }

    // Obtener empleado completo con relaciones
    const empleadoCompleto = await query(`
      SELECT e.*, s.nombre as sucursal_nombre, p.nombre as puesto_nombre 
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.id
      LEFT JOIN puestos p ON e.puesto_id = p.id
      WHERE e.id = $1
    `, [empleadoCreado.id]);

    res.status(201).json({
      success: true,
      data: empleadoCompleto.rows[0],
      message: 'Empleado creado exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      },
      timestamp: new Date().toISOString()
    });
  }
}

const { 
  listEmpleados, 
  getEmpleado, 
  // createEmpleado,  // Comentamos la función problemática
  updateEmpleado, 
  deleteEmpleado,
  getPuestos,
  getModulos
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
router.post('/', auth, createEmpleadoTemp);

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

module.exports = router;
