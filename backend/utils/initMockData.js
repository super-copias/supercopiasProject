/**
 * Script de Inicialización de Datos Mock - SuperCopias Backend
 * Crea datos de ejemplo para empleados, clientes y otros módulos
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');

/**
 * Inicializar datos mock de empleados
 */
function initEmpleadosMock() {
  console.log('Inicializando datos mock de empleados...');
  
  const empleadosExistentes = db.get('empleados').value() || [];
  
  if (empleadosExistentes.length === 0) {
    const empleados = [
      {
        id: `EMP_${nanoid()}`,
        nombre: 'Juan Carlos',
        apellidos: 'Pérez González',
        email: 'juan.perez@supercopias.com',
        telefono: '555-0101',
        puesto: 'Gerente de Ventas',
        departamento: 'Ventas',
        salario: 25000,
        fechaIngreso: '2023-01-15',
        numeroEmpleado: 'EMP001',
        roles: ['supervisor', 'gestor_ventas'],
        rolesInfo: [],
        tieneUsuario: true,
        usuarioId: `USR_${nanoid()}`,
        activo: true,
        fechaRegistro: '2023-01-15T08:00:00Z',
        fechaModificacion: null
      },
      {
        id: `EMP_${nanoid()}`,
        nombre: 'María Elena',
        apellidos: 'López Hernández',
        email: 'maria.lopez@supercopias.com',
        telefono: '555-0102',
        puesto: 'Cajera',
        departamento: 'Ventas',
        salario: 12000,
        fechaIngreso: '2023-03-20',
        numeroEmpleado: 'EMP002',
        roles: ['cajero'],
        rolesInfo: [],
        tieneUsuario: true,
        usuarioId: `USR_${nanoid()}`,
        activo: true,
        fechaRegistro: '2023-03-20T08:00:00Z',
        fechaModificacion: null
      },
      {
        id: `EMP_${nanoid()}`,
        nombre: 'Roberto',
        apellidos: 'García Martínez',
        email: 'roberto.garcia@supercopias.com',
        telefono: '555-0103',
        puesto: 'Operador de Equipos',
        departamento: 'Producción',
        salario: 15000,
        fechaIngreso: '2023-02-10',
        numeroEmpleado: 'EMP003',
        roles: ['operador'],
        rolesInfo: [],
        tieneUsuario: true,
        usuarioId: `USR_${nanoid()}`,
        activo: true,
        fechaRegistro: '2023-02-10T08:00:00Z',
        fechaModificacion: null
      },
      {
        id: `EMP_${nanoid()}`,
        nombre: 'Ana Sofía',
        apellidos: 'Rodríguez Torres',
        email: 'ana.rodriguez@supercopias.com',
        telefono: '555-0104',
        puesto: 'Gestora de Clientes',
        departamento: 'Atención al Cliente',
        salario: 18000,
        fechaIngreso: '2023-04-05',
        numeroEmpleado: 'EMP004',
        roles: ['gestor_clientes'],
        rolesInfo: [],
        tieneUsuario: true,
        usuarioId: `USR_${nanoid()}`,
        activo: true,
        fechaRegistro: '2023-04-05T08:00:00Z',
        fechaModificacion: null
      },
      {
        id: `EMP_${nanoid()}`,
        nombre: 'Carlos Eduardo',
        apellidos: 'Mendoza Silva',
        email: 'carlos.mendoza@supercopias.com',
        telefono: '555-0105',
        puesto: 'Técnico de Mantenimiento',
        departamento: 'Mantenimiento',
        salario: 16000,
        fechaIngreso: '2023-01-30',
        numeroEmpleado: 'EMP005',
        roles: ['operador', 'gestor_inventarios'],
        rolesInfo: [],
        tieneUsuario: false,
        activo: true,
        fechaRegistro: '2023-01-30T08:00:00Z',
        fechaModificacion: null
      }
    ];

    db.get('empleados').push(...empleados).write();
    console.log(`✅ ${empleados.length} empleados inicializados`);
  } else {
    console.log(`ℹ️ Ya existen ${empleadosExistentes.length} empleados`);
  }
}

/**
 * Inicializar datos mock de clientes
 */
function initClientesMock() {
  console.log('Inicializando datos mock de clientes...');
  
  const clientesExistentes = db.get('clientes').value() || [];
  
  if (clientesExistentes.length === 0) {
    const clientes = [
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Juan Carlos',
        apellidos: 'Pérez García',
        email: 'juan.perez@email.com',
        telefono: '555-0101',
        tipoPersona: 'fisica',
        rfc: 'PEGJ850315ABC',
        direccion: 'Av. Reforma 123, Col. Centro',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        codigoPostal: '06000',
        usoCFDI: 'G01',
        activo: true,
        fechaRegistro: '2023-01-15T10:30:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'María Elena',
        apellidos: 'López Hernández',
        email: 'maria.lopez@email.com',
        telefono: '555-0102',
        tipoPersona: 'fisica',
        rfc: 'LOHM920408DEF',
        direccion: 'Calle Hidalgo 456, Col. Centro',
        ciudad: 'Guadalajara',
        estado: 'Jalisco',
        codigoPostal: '44100',
        usoCFDI: 'G03',
        activo: true,
        fechaRegistro: '2023-02-20T14:15:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Tecnologías Avanzadas',
        apellidos: 'S.A. de C.V.',
        email: 'contacto@tecavanzadas.com',
        telefono: '555-0103',
        tipoPersona: 'moral',
        rfc: 'TAV030515GHI',
        direccion: 'Blvd. Tecnológico 789, Col. Industrial',
        ciudad: 'Monterrey',
        estado: 'Nuevo León',
        codigoPostal: '64700',
        usoCFDI: 'G01',
        activo: true,
        fechaRegistro: '2023-03-10T09:45:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Ana Sofía',
        apellidos: 'Rodríguez Torres',
        email: 'ana.rodriguez@email.com',
        telefono: '555-0104',
        tipoPersona: 'fisica',
        rfc: 'ROTA880712JKL',
        direccion: 'Av. Universidad 321, Col. Del Valle',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        codigoPostal: '03100',
        usoCFDI: 'D10',
        activo: true,
        fechaRegistro: '2023-04-05T16:20:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Servicios Integrales',
        apellidos: 'del Norte S.C.',
        email: 'info@serviciosnorte.com',
        telefono: '555-0105',
        tipoPersona: 'moral',
        rfc: 'SIN951201MNO',
        direccion: 'Calle Industria 654, Col. Norte',
        ciudad: 'Tijuana',
        estado: 'Baja California',
        codigoPostal: '22000',
        usoCFDI: 'G01',
        activo: true,
        fechaRegistro: '2023-05-12T11:30:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Carlos Eduardo',
        apellidos: 'Mendoza Silva',
        email: 'carlos.mendoza@email.com',
        telefono: '555-0106',
        tipoPersona: 'fisica',
        rfc: 'MESC750920PQR',
        direccion: 'Av. Juárez 987, Col. Centro',
        ciudad: 'Puebla',
        estado: 'Puebla',
        codigoPostal: '72000',
        usoCFDI: 'G03',
        activo: true,
        fechaRegistro: '2023-06-18T13:45:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Comercializadora',
        apellidos: 'Global S.A.',
        email: 'ventas@comercializadoraglobal.com',
        telefono: '555-0107',
        tipoPersona: 'moral',
        rfc: 'CGS860804STU',
        direccion: 'Paseo de la Reforma 1234, Col. Polanco',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        codigoPostal: '11560',
        usoCFDI: 'G01',
        activo: true,
        fechaRegistro: '2023-07-22T10:15:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Laura Patricia',
        apellidos: 'Jiménez Morales',
        email: 'laura.jimenez@email.com',
        telefono: '555-0108',
        tipoPersona: 'fisica',
        rfc: 'JIML930515VWX',
        direccion: 'Calle Morelos 555, Col. Centro',
        ciudad: 'Mérida',
        estado: 'Yucatán',
        codigoPostal: '97000',
        usoCFDI: 'D01',
        activo: true,
        fechaRegistro: '2023-08-14T15:30:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Distribuidora',
        apellidos: 'del Pacífico S.R.L.',
        email: 'contacto@distripacifico.com',
        telefono: '555-0109',
        tipoPersona: 'moral',
        rfc: 'DPA770301YZA',
        direccion: 'Av. Costero 888, Col. Playas',
        ciudad: 'Acapulco',
        estado: 'Guerrero',
        codigoPostal: '39390',
        usoCFDI: 'G01',
        activo: true,
        fechaRegistro: '2023-09-08T12:00:00Z',
        fechaModificacion: null
      },
      {
        id: `CLI_${nanoid()}`,
        nombre: 'Roberto',
        apellidos: 'García Martínez',
        email: 'roberto.garcia@email.com',
        telefono: '555-0110',
        tipoPersona: 'fisica',
        rfc: 'GAMR811125BCD',
        direccion: 'Blvd. Manuel Ávila Camacho 777, Col. Lomas',
        ciudad: 'Cuernavaca',
        estado: 'Morelos',
        codigoPostal: '62000',
        usoCFDI: 'G03',
        activo: true,
        fechaRegistro: '2023-10-01T09:20:00Z',
        fechaModificacion: null
      }
    ];

    db.get('clientes').push(...clientes).write();
    console.log(`✅ ${clientes.length} clientes inicializados`);
  } else {
    console.log(`ℹ️ Ya existen ${clientesExistentes.length} clientes`);
  }
}

/**
 * Inicializar usuarios del sistema (con credenciales hash)
 */
function initUsuariosMock() {
  console.log('Inicializando usuarios del sistema...');
  
  const usuariosExistentes = db.get('usuarios').value() || [];
  const adminExists = usuariosExistentes.find(u => u.username === 'admin');
  
  if (!adminExists) {
    const adminPassword = bcrypt.hashSync('Admin123!', 8);
    const adminUser = {
      id: `USR_${nanoid()}`,
      username: 'admin',
      password: adminPassword,
      nombre: 'Administrador',
      email: 'admin@supercopias.com',
      roles: ['admin'],
      activo: true,
      fechaRegistro: new Date().toISOString(),
      ultimoAcceso: null
    };
    
    db.get('usuarios').push(adminUser).write();
    console.log('✅ Usuario admin creado');
  } else {
    console.log('ℹ️ Usuario admin ya existe');
  }
}

/**
 * Inicializar datos mock de proveedores
 */
function initProveedoresMock() {
  console.log('Inicializando datos mock de proveedores...');
  
  const proveedoresExistentes = db.get('proveedores').value() || [];
  
  if (proveedoresExistentes.length === 0) {
    const proveedores = [
      {
        id: nanoid(),
        nombre: 'Papelería El Estudiante',
        rfc: 'PES910315ABC',
        email: 'ventas@estudiantepapeleria.com',
        telefono: '555-1001',
        direccion: 'Av. Universidad 123, Col. Centro',
        codigoPostal: '06000',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto: 'María González',
        tipoProveedor: 'Suministros',
        condicionesPago: '30 días',
        notas: 'Proveedor principal de papelería y suministros de oficina',
        activo: true,
        fechaRegistro: new Date('2023-01-10').toISOString(),
        fechaModificacion: null
      },
      {
        id: nanoid(),
        nombre: 'Tecnología y Sistemas SA',
        rfc: 'TYS850420DEF',
        email: 'soporte@tecnologiasistemas.com',
        telefono: '555-1002',
        direccion: 'Calle Tecnología 456, Col. Moderna',
        codigoPostal: '03100',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto: 'Ing. Carlos Ramírez',
        tipoProveedor: 'Tecnología',
        condicionesPago: '15 días',
        notas: 'Mantenimiento de equipos de cómputo y redes',
        activo: true,
        fechaRegistro: new Date('2023-02-05').toISOString(),
        fechaModificacion: null
      },
      {
        id: nanoid(),
        nombre: 'Servicios de Limpieza Integral',
        rfc: 'SLI780630GHI',
        email: 'admin@limpiezaintegral.com',
        telefono: '555-1003',
        direccion: 'Av. Servicios 789, Col. Industrial',
        codigoPostal: '07300',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto: 'Sra. Patricia Herrera',
        tipoProveedor: 'Servicios',
        condicionesPago: 'Contado',
        notas: 'Servicio de limpieza diario para oficinas',
        activo: true,
        fechaRegistro: new Date('2023-03-12').toISOString(),
        fechaModificacion: null
      },
      {
        id: nanoid(),
        nombre: 'Insumos y Toners Express',
        rfc: 'ITE920815JKL',
        email: 'pedidos@tonersexpress.com',
        telefono: '555-1004',
        direccion: 'Blvd. Insumos 321, Col. Comercial',
        codigoPostal: '06500',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto: 'Lic. Roberto Silva',
        tipoProveedor: 'Productos',
        condicionesPago: '45 días',
        notas: 'Cartuchos, toners y consumibles para impresoras',
        activo: true,
        fechaRegistro: new Date('2023-04-18').toISOString(),
        fechaModificacion: null
      },
      {
        id: nanoid(),
        nombre: 'Capacitación Empresarial Pro',
        rfc: 'CEP870925MNO',
        email: 'cursos@capacitacionpro.com',
        telefono: '555-1005',
        direccion: 'Av. Capacitación 654, Col. Educativa',
        codigoPostal: '03900',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto: 'Mtra. Ana López',
        tipoProveedor: 'Capacitación',
        condicionesPago: 'Anticipado',
        notas: 'Cursos de desarrollo profesional y técnico',
        activo: true,
        fechaRegistro: new Date('2023-05-22').toISOString(),
        fechaModificacion: null
      }
    ];

    db.set('proveedores', proveedores).write();
    console.log(`✅ Creados ${proveedores.length} proveedores mock`);
  } else {
    console.log(`ℹ️ Ya existen ${proveedoresExistentes.length} proveedores`);
  }
}

/**
 * Inicializar catálogos en la base de datos
 */
function initCatalogos() {
  console.log('Inicializando catálogos del sistema...');
  
  // Los catálogos se inicializan automáticamente cuando se consultan
  // desde los controladores correspondientes
  console.log('ℹ️ Catálogos configurados para inicialización automática');
}

/**
 * Función principal de inicialización
 */
function initAllMockData() {
  console.log('🚀 Iniciando datos mock para SuperCopias Backend...\n');
  
  // Inicializar estructura de base de datos
  init();
  
  // Inicializar datos por módulo
  initUsuariosMock();
  initEmpleadosMock();
  initClientesMock();
  initProveedoresMock();
  initCatalogos();
  
  console.log('\n✅ Inicialización de datos mock completada');
  console.log('📊 Estadísticas:');
  console.log(`   - Usuarios: ${db.get('usuarios').value().length}`);
  console.log(`   - Empleados: ${db.get('empleados').value().length}`);
  console.log(`   - Clientes: ${db.get('clientes').value().length}`);
  console.log(`   - Proveedores: ${(db.get('proveedores').value() || []).length}`);
}

/**
 * Limpiar todos los datos (solo para desarrollo)
 */
function clearAllData() {
  console.log('🗑️ Limpiando todos los datos...');
  db.set('usuarios', []).write();
  db.set('empleados', []).write();
  db.set('clientes', []).write();
  db.set('proveedores', []).write();
  console.log('✅ Datos limpiados');
}

/**
 * Reinicializar datos (limpiar + inicializar)
 */
function resetAllData() {
  console.log('🔄 Reinicializando datos...');
  clearAllData();
  initAllMockData();
}

module.exports = {
  initAllMockData,
  initEmpleadosMock,
  initClientesMock,
  initUsuariosMock,
  initProveedoresMock,
  initCatalogos,
  clearAllData,
  resetAllData
};

// Si se ejecuta directamente (node initMockData.js)
if (require.main === module) {
  initAllMockData();
}