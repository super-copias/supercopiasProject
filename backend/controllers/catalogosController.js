/**
 * Controlador de Catálogos - SuperCopias Backend
 * Gestiona todos los catálogos del sistema (estados, regímenes fiscales, sucursales, puestos, etc.)
 * MIGRADO A POSTGRESQL - IDs numéricas
 */

const { query, transaction } = require('../config/database');
const { 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

// Función simplificada para respuestas exitosas
function createSuccessResponse(data, message) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// CATÁLOGOS SAT (Sistema de Administración Tributaria)
// ============================================================================

/**
 * Obtener catálogo de estados de México
 * GET /api/catalogos/estados
 */
async function getEstados(req, res) {
  try {
    const result = await query('SELECT * FROM estados WHERE activo = true ORDER BY nombre');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Estados obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estados:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo estados'));
  }
}

/**
 * Obtener catálogo de regímenes fiscales
 * GET /api/catalogos/regimenes-fiscales
 */
async function getRegimenesFiscales(req, res) {
  try {
    const result = await query('SELECT * FROM regimenes_fiscales WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Regímenes fiscales obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo regímenes fiscales:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo regímenes fiscales'));
  }
}

/**
 * Obtener catálogo de usos CFDI
 * GET /api/catalogos/usos-cfdi
 */
async function getUsosCFDI(req, res) {
  try {
    const result = await query('SELECT * FROM usos_cfdi WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Usos CFDI obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo usos CFDI:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo usos CFDI'));
  }
}

/**
 * Obtener catálogo de formas de pago
 * GET /api/catalogos/formas-pago
 */
async function getFormasPago(req, res) {
  try {
    const result = await query('SELECT * FROM formas_pago WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Formas de pago obtenidas correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo formas de pago:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo formas de pago'));
  }
}

/**
 * Obtener catálogo de métodos de pago
 * GET /api/catalogos/metodos-pago
 */
async function getMetodosPago(req, res) {
  try {
    const result = await query('SELECT * FROM metodos_pago WHERE activo = true ORDER BY codigo');
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Métodos de pago obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo métodos de pago'));
  }
}

// ============================================================================
// CATÁLOGOS DEL SISTEMA
// ============================================================================

/**
 * Obtener catálogo de módulos del sistema
 * GET /api/catalogos/modulos
 */
async function getModulos(req, res) {
  try {
    // Primero verificar si hay módulos, si no, insertarlos
    let result = await query('SELECT * FROM modulos WHERE activo = true ORDER BY orden, nombre');
    
    if (result.rows.length === 0) {
      console.log('📦 No hay módulos, insertando datos iniciales...');
      
      const modulos = [
        { clave: 'dashboard', nombre: 'Dashboard', icono: 'fas fa-tachometer-alt', orden: 1 },
        { clave: 'empleados', nombre: 'Empleados', icono: 'fas fa-users', orden: 2 },
        { clave: 'clientes', nombre: 'Clientes', icono: 'fas fa-user-tie', orden: 3 },
        { clave: 'proveedores', nombre: 'Proveedores', icono: 'fas fa-truck', orden: 4 },
        { clave: 'inventarios', nombre: 'Inventarios', icono: 'fas fa-boxes', orden: 5 },
        { clave: 'punto_venta', nombre: 'Punto de Venta', icono: 'fas fa-cash-register', orden: 6 },
        { clave: 'equipos', nombre: 'Equipos', icono: 'fas fa-desktop', orden: 7 },
        { clave: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar', orden: 8 },
        { clave: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs', orden: 9 }
      ];
      
      for (const modulo of modulos) {
        await query(`
          INSERT INTO modulos (clave, nombre, icono, activo, orden) 
          VALUES ($1, $2, $3, true, $4)
          ON CONFLICT (clave) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              icono = EXCLUDED.icono,
              activo = EXCLUDED.activo,
              orden = EXCLUDED.orden
        `, [modulo.clave, modulo.nombre, modulo.icono, modulo.orden]);
      }
      
      // Volver a consultar después de insertar
      result = await query('SELECT * FROM modulos WHERE activo = true ORDER BY orden, nombre');
      console.log(`✅ Insertados ${result.rows.length} módulos`);
    }
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Módulos del sistema obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo módulos:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo módulos'));
  }
}

/**
 * Obtener sucursales
 * GET /api/catalogos/sucursales
 */
async function getSucursales(req, res) {
  try {
    const result = await query(`
      SELECT id, nombre, direccion, telefono, gerente, activa, fecha_creacion
      FROM sucursales 
      WHERE activa = true 
      ORDER BY nombre
    `);
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Sucursales obtenidas correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo sucursales'));
  }
}

/**
 * Crear nueva sucursal
 * POST /api/catalogos/sucursales
 */
async function createSucursal(req, res) {
  try {
    const { nombre, direccion, telefono, gerente } = req.body;

    // Validaciones
    if (!nombre || !direccion) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'Nombre y dirección son obligatorios'
      ));
    }

    const result = await query(`
      INSERT INTO sucursales (nombre, direccion, telefono, gerente, activa, fecha_creacion)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nombre, direccion, telefono, gerente]);

    res.status(201).json(createResponse({
      data: result.rows[0],
      message: 'Sucursal creada exitosamente'
    }));
  } catch (error) {
    console.error('Error creando sucursal:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_DUPLICADOS,
        'Ya existe una sucursal con ese nombre'
      ));
    } else {
      res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error creando sucursal'));
    }
  }
}

/**
 * Obtener puestos
 * GET /api/catalogos/puestos
 */
async function getPuestos(req, res) {
  try {
    const result = await query(`
      SELECT id, nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion
      FROM puestos 
      WHERE activo = true 
      ORDER BY nombre
    `);
    
    // Respuesta directa sin funciones helper
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Puestos obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
    res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error obteniendo puestos'));
  }
}

/**
 * Crear nuevo puesto
 * POST /api/catalogos/puestos
 */
async function createPuesto(req, res) {
  try {
    const { nombre, descripcion, salario_minimo, salario_maximo } = req.body;

    // Validaciones
    if (!nombre || !descripcion) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'Nombre y descripción son obligatorios'
      ));
    }

    if (salario_minimo && salario_maximo && salario_minimo > salario_maximo) {
      return res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_INVALIDOS, 
        'El salario mínimo no puede ser mayor al máximo'
      ));
    }

    const result = await query(`
      INSERT INTO puestos (nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nombre, descripcion, salario_minimo, salario_maximo]);

    res.status(201).json(createResponse({
      data: result.rows[0],
      message: 'Puesto creado exitosamente'
    }));
  } catch (error) {
    console.error('Error creando puesto:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json(createErrorResponse(
        CODIGOS_ERROR.DATOS_DUPLICADOS,
        'Ya existe un puesto con ese nombre'
      ));
    } else {
      res.status(500).json(createErrorResponse(CODIGOS_ERROR.ERROR_INTERNO, 'Error creando puesto'));
    }
  }
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

/**
 * ENDPOINT TEMPORAL - Insertar datos de módulos para empleados
 * GET /api/catalogos/setup-modulos-empleados
 */
async function setupModulosEmpleados(req, res) {
  try {
    console.log('🔧 Configurando módulos para empleados...');
    
    // Datos de módulos por empleado
    const datosEmpleados = {
      1: ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'punto_venta', 'equipos', 'reportes', 'configuracion'], // Admin
      6: ['empleados'], // Erick
      7: ['dashboard', 'clientes'], // María
      8: ['dashboard', 'clientes', 'inventarios'], // Juan
      9: ['clientes', 'reportes'] // Ana
    };
    
    // Obtener módulos disponibles
    const modulosResult = await query('SELECT clave FROM modulos WHERE activo = true');
    const modulosDisponibles = modulosResult.rows.map(m => m.clave);
    
    console.log('📦 Módulos disponibles:', modulosDisponibles);
    
    // Limpiar datos anteriores
    await query('DELETE FROM empleados_modulos');
    console.log('🧹 Datos anteriores eliminados');
    
    let insertados = 0;
    
    // Insertar datos para cada empleado
    for (const [empleadoId, modulosAsignados] of Object.entries(datosEmpleados)) {
      console.log(`👤 Configurando empleado ${empleadoId}...`);
      
      for (const modulo of modulosDisponibles) {
        const tieneAcceso = modulosAsignados.includes(modulo);
        
        await query(`
          INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
          VALUES ($1, $2, $3)
        `, [parseInt(empleadoId), modulo, tieneAcceso]);
        
        insertados++;
      }
    }
    
    console.log(`✅ ${insertados} registros insertados`);
    
    // Verificar datos insertados
    const verificacion = await query(`
      SELECT e.nombre, em.modulo, em.acceso 
      FROM empleados_modulos em
      JOIN empleados e ON em.empleado_id = e.id
      WHERE em.acceso = true
      ORDER BY e.id, em.modulo
    `);
    
    const resumen = {};
    verificacion.rows.forEach(row => {
      if (!resumen[row.nombre]) {
        resumen[row.nombre] = [];
      }
      resumen[row.nombre].push(row.modulo);
    });
    
    res.status(200).json({
      success: true,
      message: 'Módulos configurados exitosamente',
      insertados: insertados,
      resumen: resumen,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error configurando módulos:', error);
    res.status(500).json({
      success: false,
      error: 'Error configurando módulos para empleados',
      details: error.message
    });
  }
}

module.exports = {
  // Catálogos SAT
  getEstados,
  getRegimenesFiscales,
  getUsosCFDI,
  getFormasPago,
  getMetodosPago,
  
  // Catálogos del Sistema
  getModulos,
  getSucursales,
  createSucursal,
  getPuestos,
  createPuesto,
  setupModulosEmpleados
};