/**
 * Controlador de Catálogos - SuperCopias Backend
 * Gestiona todos los catálogos del sistema (estados, regímenes fiscales, sucursales, puestos, etc.)
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const { 
  createResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Obtener catálogo de estados de México
 * GET /api/catalogos/estados
 */
async function getEstados(req, res) {
  try {
    let estados = db.get('catalogos.estados').value();
    
    if (!estados || estados.length === 0) {
      estados = initEstados();
      db.set('catalogos.estados', estados).write();
    }

    res.json({
      success: true,
      data: estados,
      message: 'Estados obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estados:', error);
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

/**
 * Obtener catálogo de regímenes fiscales
 * GET /api/catalogos/regimenes-fiscales
 */
async function getRegimenesFiscales(req, res) {
  try {
    let regimenes = db.get('catalogos.regimenesFiscales').value();
    
    if (!regimenes || regimenes.length === 0) {
      regimenes = initRegimenesFiscales();
      db.set('catalogos.regimenesFiscales', regimenes).write();
    }

    res.json({
      success: true,
      data: regimenes,
      message: 'Regímenes fiscales obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo regímenes fiscales:', error);
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

/**
 * Obtener catálogo de usos CFDI
 * GET /api/catalogos/usos-cfdi
 */
async function getUsosCFDI(req, res) {
  try {
    let usosCFDI = db.get('catalogos.usosCFDI').value();
    
    if (!usosCFDI || usosCFDI.length === 0) {
      usosCFDI = initUsosCFDI();
      db.set('catalogos.usosCFDI', usosCFDI).write();
    }

    res.json({
      success: true,
      data: usosCFDI,
      message: 'Usos CFDI obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo usos CFDI:', error);
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

/**
 * Obtener catálogo de formas de pago
 * GET /api/catalogos/formas-pago
 */
async function getFormasPago(req, res) {
  try {
    let formasPago = db.get('catalogos.formasPago').value();
    
    if (!formasPago || formasPago.length === 0) {
      formasPago = initFormasPago();
      db.set('catalogos.formasPago', formasPago).write();
    }

    res.json({
      success: true,
      data: formasPago,
      message: 'Formas de pago obtenidas correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo formas de pago:', error);
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

/**
 * Obtener catálogo de métodos de pago
 * GET /api/catalogos/metodos-pago
 */
async function getMetodosPago(req, res) {
  try {
    let metodosPago = db.get('catalogos.metodosPago').value();
    
    if (!metodosPago || metodosPago.length === 0) {
      metodosPago = initMetodosPago();
      db.set('catalogos.metodosPago', metodosPago).write();
    }

    res.json({
      success: true,
      data: metodosPago,
      message: 'Métodos de pago obtenidos correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
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

// ============================================================================
// MÉTODOS DE INICIALIZACIÓN DE CATÁLOGOS
// ============================================================================

/**
 * Inicializar catálogo de estados de México
 */
function initEstados() {
    return [
      { codigo: 'AGU', nombre: 'Aguascalientes' },
      { codigo: 'BCN', nombre: 'Baja California' },
      { codigo: 'BCS', nombre: 'Baja California Sur' },
      { codigo: 'CAM', nombre: 'Campeche' },
      { codigo: 'CHP', nombre: 'Chiapas' },
      { codigo: 'CHH', nombre: 'Chihuahua' },
      { codigo: 'CMX', nombre: 'Ciudad de México' },
      { codigo: 'COA', nombre: 'Coahuila' },
      { codigo: 'COL', nombre: 'Colima' },
      { codigo: 'DUR', nombre: 'Durango' },
      { codigo: 'MEX', nombre: 'Estado de México' },
      { codigo: 'GUA', nombre: 'Guanajuato' },
      { codigo: 'GRO', nombre: 'Guerrero' },
      { codigo: 'HID', nombre: 'Hidalgo' },
      { codigo: 'JAL', nombre: 'Jalisco' },
      { codigo: 'MIC', nombre: 'Michoacán' },
      { codigo: 'MOR', nombre: 'Morelos' },
      { codigo: 'NAY', nombre: 'Nayarit' },
      { codigo: 'NLE', nombre: 'Nuevo León' },
      { codigo: 'OAX', nombre: 'Oaxaca' },
      { codigo: 'PUE', nombre: 'Puebla' },
      { codigo: 'QUE', nombre: 'Querétaro' },
      { codigo: 'ROO', nombre: 'Quintana Roo' },
      { codigo: 'SLP', nombre: 'San Luis Potosí' },
      { codigo: 'SIN', nombre: 'Sinaloa' },
      { codigo: 'SON', nombre: 'Sonora' },
      { codigo: 'TAB', nombre: 'Tabasco' },
      { codigo: 'TAM', nombre: 'Tamaulipas' },
      { codigo: 'TLA', nombre: 'Tlaxcala' },
      { codigo: 'VER', nombre: 'Veracruz' },
      { codigo: 'YUC', nombre: 'Yucatán' },
      { codigo: 'ZAC', nombre: 'Zacatecas' }
    ];
  }

/**
 * Inicializar catálogo de regímenes fiscales
 */
function initRegimenesFiscales() {
    return [
      { codigo: '601', nombre: 'General de Ley Personas Morales' },
      { codigo: '603', nombre: 'Personas Morales con Fines no Lucrativos' },
      { codigo: '605', nombre: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
      { codigo: '606', nombre: 'Arrendamiento' },
      { codigo: '607', nombre: 'Régimen de Enajenación o Adquisición de Bienes' },
      { codigo: '608', nombre: 'Demás ingresos' },
      { codigo: '610', nombre: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
      { codigo: '611', nombre: 'Ingresos por Dividendos (socios y accionistas)' },
      { codigo: '612', nombre: 'Personas Físicas con Actividades Empresariales y Profesionales' },
      { codigo: '614', nombre: 'Ingresos por intereses' },
      { codigo: '615', nombre: 'Régimen de los ingresos por obtención de premios' },
      { codigo: '616', nombre: 'Sin obligaciones fiscales' },
      { codigo: '620', nombre: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
      { codigo: '621', nombre: 'Incorporación Fiscal' },
      { codigo: '622', nombre: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
      { codigo: '623', nombre: 'Opcionales para Grupos de Sociedades' },
      { codigo: '624', nombre: 'Coordinados' },
      { codigo: '625', nombre: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
      { codigo: '626', nombre: 'Régimen Simplificado de Confianza' }
    ];
  }

/**
 * Inicializar catálogo de usos CFDI
 */
function initUsosCFDI() {
    return [
      { codigo: 'G01', descripcion: 'Adquisición de mercancías' },
      { codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
      { codigo: 'G03', descripcion: 'Gastos en general' },
      { codigo: 'I01', descripcion: 'Construcciones' },
      { codigo: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
      { codigo: 'I03', descripcion: 'Equipo de transporte' },
      { codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
      { codigo: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
      { codigo: 'I06', descripcion: 'Comunicaciones telefónicas' },
      { codigo: 'I07', descripcion: 'Comunicaciones satelitales' },
      { codigo: 'I08', descripcion: 'Otra maquinaria y equipo' },
      { codigo: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
      { codigo: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
      { codigo: 'D03', descripcion: 'Gastos funerales' },
      { codigo: 'D04', descripcion: 'Donativos' },
      { codigo: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios' },
      { codigo: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
      { codigo: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
      { codigo: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
      { codigo: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
      { codigo: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
      { codigo: 'S01', descripcion: 'Sin efectos fiscales' },
      { codigo: 'CP01', descripcion: 'Pagos' },
      { codigo: 'CN01', descripcion: 'Nómina' }
    ];
  }

/**
 * Inicializar catálogo de formas de pago
 */
function initFormasPago() {
    return [
      { codigo: '01', nombre: 'Efectivo' },
      { codigo: '02', nombre: 'Cheque nominativo' },
      { codigo: '03', nombre: 'Transferencia electrónica de fondos' },
      { codigo: '04', nombre: 'Tarjeta de crédito' },
      { codigo: '05', nombre: 'Monedero electrónico' },
      { codigo: '06', nombre: 'Dinero electrónico' },
      { codigo: '08', nombre: 'Vales de despensa' },
      { codigo: '12', nombre: 'Dación en pago' },
      { codigo: '13', nombre: 'Pago por subrogación' },
      { codigo: '14', nombre: 'Pago por consignación' },
      { codigo: '15', nombre: 'Condonación' },
      { codigo: '17', nombre: 'Compensación' },
      { codigo: '23', nombre: 'Novación' },
      { codigo: '24', nombre: 'Confusión' },
      { codigo: '25', nombre: 'Remisión de deuda' },
      { codigo: '26', nombre: 'Prescripción o caducidad' },
      { codigo: '27', nombre: 'A satisfacción del acreedor' },
      { codigo: '28', nombre: 'Tarjeta de débito' },
      { codigo: '29', nombre: 'Tarjeta de servicios' },
      { codigo: '30', nombre: 'Aplicación de anticipos' },
      { codigo: '31', nombre: 'Intermediario pagos' },
      { codigo: '99', nombre: 'Por definir' }
    ];
  }

/**
 * Inicializar catálogo de métodos de pago
 */
function initMetodosPago() {
    return [
      { codigo: 'PUE', nombre: 'Pago en una sola exhibición' },
      { codigo: 'PPD', nombre: 'Pago en parcialidades o diferido' }
    ];
}

/**
 * Obtener catálogo de sucursales
 * GET /api/catalogos/sucursales
 */
async function getSucursales(req, res) {
  try {
    init(); // Inicializar BD
    
    let sucursales = db.get('catalogos.sucursales').value();
    
    if (!sucursales || sucursales.length === 0) {
      sucursales = initSucursales();
      db.set('catalogos.sucursales', sucursales).write();
    }

    res.json(createResponse(true, sucursales, 'Sucursales obtenidas correctamente'));
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.INTERNAL_ERROR, 'Error interno del servidor')
    );
  }
}

/**
 * Crear nueva sucursal
 * POST /api/catalogos/sucursales
 */
async function createSucursal(req, res) {
  try {
    init(); // Inicializar BD
    
    const { nombre, direccion, telefono, gerente, activa = true } = req.body;
    
    if (!nombre) {
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.VALIDATION_ERROR, 'El nombre de la sucursal es requerido')
      );
    }

    const nuevaSucursal = {
      id: `SUC_${nanoid()}`,
      nombre: nombre.trim(),
      direccion: direccion?.trim() || '',
      telefono: telefono?.trim() || '',
      gerente: gerente?.trim() || '',
      activa,
      fechaCreacion: new Date().toISOString()
    };

    let sucursales = db.get('catalogos.sucursales').value() || [];
    sucursales.push(nuevaSucursal);
    db.set('catalogos.sucursales', sucursales).write();

    res.status(201).json(createResponse(nuevaSucursal, 'Sucursal creada correctamente'));
  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.INTERNAL_ERROR, 'Error interno del servidor')
    );
  }
}

/**
 * Obtener catálogo de puestos
 * GET /api/catalogos/puestos
 */
async function getPuestos(req, res) {
  try {
    init(); // Inicializar BD
    
    let puestos = db.get('catalogos.puestos').value();
    
    if (!puestos || puestos.length === 0) {
      puestos = initPuestos();
      db.set('catalogos.puestos', puestos).write();
    }

    res.json(createResponse(true, puestos, 'Puestos obtenidos correctamente'));
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
    res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.INTERNAL_ERROR, 'Error interno del servidor')
    );
  }
}

/**
 * Crear nuevo puesto
 * POST /api/catalogos/puestos
 */
async function createPuesto(req, res) {
  try {
    init(); // Inicializar BD
    
    const { nombre, descripcion, salarioMinimo, salarioMaximo, activo = true } = req.body;
    
    if (!nombre) {
      return res.status(400).json(
        createErrorResponse(CODIGOS_ERROR.VALIDATION_ERROR, 'El nombre del puesto es requerido')
      );
    }

    const nuevoPuesto = {
      id: `PUE_${nanoid()}`,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      salarioMinimo: salarioMinimo || 0,
      salarioMaximo: salarioMaximo || 0,
      activo,
      fechaCreacion: new Date().toISOString()
    };

    let puestos = db.get('catalogos.puestos').value() || [];
    puestos.push(nuevoPuesto);
    db.set('catalogos.puestos', puestos).write();

    res.status(201).json(createResponse(nuevoPuesto, 'Puesto creado correctamente'));
  } catch (error) {
    console.error('Error creando puesto:', error);
    res.status(500).json(
      createErrorResponse(CODIGOS_ERROR.INTERNAL_ERROR, 'Error interno del servidor')
    );
  }
}

/**
 * Inicializar catálogo de sucursales
 */
function initSucursales() {
  return [
    {
      id: 'SUC_001',
      nombre: 'Sucursal Centro',
      direccion: 'Av. Principal 123, Centro',
      telefono: '555-1001',
      gerente: 'Ana García',
      activa: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'SUC_002', 
      nombre: 'Sucursal Norte',
      direccion: 'Calle Norte 456, Zona Norte',
      telefono: '555-1002',
      gerente: 'Carlos López',
      activa: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'SUC_003',
      nombre: 'Sucursal Sur',
      direccion: 'Av. Sur 789, Zona Sur', 
      telefono: '555-1003',
      gerente: 'María Rodríguez',
      activa: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'SUC_004',
      nombre: 'Sucursal Este',
      direccion: 'Blvd. Este 321, Zona Este',
      telefono: '555-1004', 
      gerente: 'José Martínez',
      activa: true,
      fechaCreacion: new Date().toISOString()
    }
  ];
}

/**
 * Inicializar catálogo de puestos
 */
function initPuestos() {
  return [
    {
      id: 'PUE_001',
      nombre: 'Gerente General',
      descripcion: 'Responsable general de la sucursal y supervisión del personal',
      salarioMinimo: 25000,
      salarioMaximo: 35000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_002',
      nombre: 'Gerente de Ventas',
      descripcion: 'Encargado del área de ventas y atención al cliente',
      salarioMinimo: 20000,
      salarioMaximo: 28000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_003',
      nombre: 'Cajero',
      descripcion: 'Responsable del punto de venta y cobros',
      salarioMinimo: 12000,
      salarioMaximo: 15000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_004',
      nombre: 'Operador de Equipos',
      descripcion: 'Manejo de máquinas fotocopiadoras e impresoras',
      salarioMinimo: 14000,
      salarioMaximo: 18000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_005',
      nombre: 'Diseñador Gráfico',
      descripcion: 'Creación de diseños y material publicitario',
      salarioMinimo: 16000,
      salarioMaximo: 22000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_006',
      nombre: 'Gestora de Clientes',
      descripcion: 'Atención especializada y seguimiento de clientes',
      salarioMinimo: 15000,
      salarioMaximo: 20000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_007',
      nombre: 'Técnico de Mantenimiento',
      descripcion: 'Mantenimiento y reparación de equipos',
      salarioMinimo: 15000,
      salarioMaximo: 19000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    },
    {
      id: 'PUE_008',
      nombre: 'Asistente Administrativo',
      descripcion: 'Apoyo en tareas administrativas y documentación',
      salarioMinimo: 10000,
      salarioMaximo: 14000,
      activo: true,
      fechaCreacion: new Date().toISOString()
    }
  ];
}

module.exports = {
  getEstados,
  getRegimenesFiscales,
  getUsosCFDI,
  getFormasPago,
  getMetodosPago,
  getSucursales,
  createSucursal,
  getPuestos,
  createPuesto
};