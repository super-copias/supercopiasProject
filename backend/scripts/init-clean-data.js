/**
 * Script de Inicialización - SuperCopias
 * Restablece la base de datos a un estado limpio con datos mínimos necesarios
 * 
 * Ejecutar con: npm run init
 * o: node scripts/init-clean-data.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'db.json');

async function initCleanData() {
  console.log('🚀 SuperCopias - Inicializando datos limpios...\n');

  try {
    // Generar hash para contraseñas
    const adminPasswordHash = await bcrypt.hash('Admin123!$', 10);
    const empleadoPasswordHash = await bcrypt.hash('empleado123', 10);

    // Estructura de datos limpia
    const cleanData = {
      "usuarios": [
        {
          "id": "USR_ADMIN_001",
          "username": "admin",
          "password": adminPasswordHash,
          "nombre": "Administrador SuperCopias",
          "email": "admin@supercopias.com",
          "role": "admin",
          "roles": ["admin"],
          "empleadoId": null,
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": new Date().toISOString(),
          "ultimoAcceso": null,
          "fullName": "Administrador SuperCopias",
          "phone": "+52 961 100 0000",
          "bio": "Administrador principal del sistema SuperCopias",
          "profileImage": ""
        },
        {
          "id": "USR_EMP_001",
          "username": "mgomez",
          "password": empleadoPasswordHash,
          "nombre": "María Gómez Hernández",
          "email": "maria.gomez@supercopias.com",
          "role": "empleado",
          "roles": ["empleado"],
          "empleadoId": "EMP_001",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null,
          "ultimoAcceso": null,
          "fullName": "María Gómez Hernández",
          "phone": "961-100-0001",
          "bio": "Gerente de Sucursal",
          "profileImage": ""
        },
        {
          "id": "USR_EMP_002", 
          "username": "jperez",
          "password": empleadoPasswordHash,
          "nombre": "Juan Pérez Martínez",
          "email": "juan.perez@supercopias.com",
          "role": "empleado",
          "roles": ["empleado"],
          "empleadoId": "EMP_002",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null,
          "ultimoAcceso": null,
          "fullName": "Juan Pérez Martínez",
          "phone": "961-100-0002",
          "bio": "Asistente de Ventas",
          "profileImage": ""
        }
      ],
      "empleados": [
        {
          "id": "EMP_001",
          "nombre": "María Gómez Hernández",
          "email": "maria.gomez@supercopias.com",
          "telefono": "961-100-0001",
          "puesto": "Gerente de Sucursal",
          "sucursal": "Sucursal Centro",
          "salario": 25000,
          "fechaIngreso": "2024-01-15",
          "activo": true,
          "usuarioId": "USR_EMP_001",
          "tipoAcceso": "administrador",
          "modulos": {
            "dashboard": { "acceso": true },
            "empleados": { "acceso": true },
            "clientes": { "acceso": true },
            "proveedores": { "acceso": true },
            "inventarios": { "acceso": true },
            "equipos": { "acceso": true },
            "reportes": { "acceso": true },
            "configuracion": { "acceso": true }
          },
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "EMP_002",
          "nombre": "Juan Pérez Martínez", 
          "email": "juan.perez@supercopias.com",
          "telefono": "961-100-0002",
          "puesto": "Asistente de Ventas",
          "sucursal": "Sucursal Norte",
          "salario": 15000,
          "fechaIngreso": "2024-01-20",
          "activo": true,
          "usuarioId": "USR_EMP_002",
          "tipoAcceso": "personalizado",
          "modulos": {
            "dashboard": { "acceso": true },
            "empleados": { "acceso": false },
            "clientes": { "acceso": true },
            "proveedores": { "acceso": false },
            "inventarios": { "acceso": false },
            "equipos": { "acceso": false },
            "reportes": { "acceso": false },
            "configuracion": { "acceso": false }
          },
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "EMP_003",
          "nombre": "Ana López Silva",
          "email": "ana.lopez@supercopias.com",
          "telefono": "961-100-0003",
          "puesto": "Auxiliar Administrativo",
          "sucursal": "Sucursal Sur",
          "salario": 12000,
          "fechaIngreso": "2024-02-01",
          "activo": false,
          "usuarioId": null,
          "tipoAcceso": "inactivo",
          "modulos": {},
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": new Date().toISOString()
        }
      ],
      "clientes": [
        {
          "id": "CLI_001",
          "rfc": "XAXX010101000",
          "razonSocial": "Servicios Empresariales del Sureste S.A. de C.V.",
          "nombreComercial": "Servicios SES",
          "email": "contacto@serviciosses.com",
          "telefono": "961-200-0001",
          "direccion": {
            "calle": "Av. Central",
            "numero": "123",
            "colonia": "Centro",
            "codigoPostal": "29000",
            "ciudad": "Tuxtla Gutiérrez",
            "estado": "Chiapas"
          },
          "regimenFiscal": "601",
          "usoCfdi": "G03",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "CLI_002", 
          "rfc": "XBXX010101001",
          "razonSocial": "Comercializadora de Papelería La Mundial S.A.",
          "nombreComercial": "Papelería La Mundial",
          "email": "ventas@papeleriamundial.com",
          "telefono": "961-200-0002",
          "direccion": {
            "calle": "Calle 5 de Mayo",
            "numero": "456",
            "colonia": "Las Flores",
            "codigoPostal": "29040",
            "ciudad": "Tuxtla Gutiérrez",
            "estado": "Chiapas"
          },
          "regimenFiscal": "601",
          "usoCfdi": "G03",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "CLI_003",
          "rfc": "XCXX010101002", 
          "razonSocial": "Distribuidora de Oficinas Chiapas S.C.",
          "nombreComercial": "Oficinas Chiapas",
          "email": "info@oficinaschiapas.com",
          "telefono": "961-200-0003",
          "direccion": {
            "calle": "Blvd. Belisario Domínguez",
            "numero": "789",
            "colonia": "Xamaipak",
            "codigoPostal": "29060",
            "ciudad": "Tuxtla Gutiérrez", 
            "estado": "Chiapas"
          },
          "regimenFiscal": "601",
          "usoCfdi": "G01",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "CLI_004",
          "rfc": "XDXX010101003",
          "razonSocial": "Impresiones y Copias del Istmo S.A. de C.V.",
          "nombreComercial": "Copias del Istmo",
          "email": "gerencia@copiasistmo.com",
          "telefono": "961-200-0004",
          "direccion": {
            "calle": "Av. Universidad",
            "numero": "321",
            "colonia": "Universitaria",
            "codigoPostal": "29050",
            "ciudad": "Tuxtla Gutiérrez",
            "estado": "Chiapas"
          },
          "regimenFiscal": "601",
          "usoCfdi": "G03",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        },
        {
          "id": "CLI_005",
          "rfc": "XEXX010101004",
          "razonSocial": "Consultoría y Servicios Profesionales Maya S.C.",
          "nombreComercial": "Consultores Maya",
          "email": "contacto@consultoresmaya.com",
          "telefono": "961-200-0005",
          "direccion": {
            "calle": "Calle Primera Norte",
            "numero": "654",
            "colonia": "San Roque",
            "codigoPostal": "29070",
            "ciudad": "Tuxtla Gutiérrez",
            "estado": "Chiapas"
          },
          "regimenFiscal": "612",
          "usoCfdi": "G01",
          "activo": true,
          "fechaRegistro": new Date().toISOString(),
          "fechaModificacion": null
        }
      ],
      "proveedores": [],
      "catalogos": {
        "estados": [
          { "codigo": "CHP", "nombre": "Chiapas" },
          { "codigo": "CDMX", "nombre": "Ciudad de México" },
          { "codigo": "GTO", "nombre": "Guanajuato" }
        ],
        "regimenesFiscales": [
          { "codigo": "601", "descripcion": "General de Ley Personas Morales" },
          { "codigo": "612", "descripcion": "Personas Físicas con Actividades Empresariales" },
          { "codigo": "605", "descripcion": "Sueldos y Salarios e Ingresos Asimilados a Salarios" }
        ],
        "usosCfdi": [
          { "codigo": "G01", "descripcion": "Adquisición de mercancías" },
          { "codigo": "G03", "descripcion": "Gastos en general" },
          { "codigo": "D01", "descripcion": "Honorarios médicos, dentales y gastos hospitalarios" }
        ],
        "formasPago": [
          { "codigo": "01", "descripcion": "Efectivo" },
          { "codigo": "02", "descripcion": "Cheque nominativo" },
          { "codigo": "03", "descripcion": "Transferencia electrónica de fondos" },
          { "codigo": "04", "descripcion": "Tarjeta de crédito" }
        ],
        "metodosPago": [
          { "codigo": "PUE", "descripcion": "Pago en una sola exhibición" },
          { "codigo": "PPD", "descripcion": "Pago en parcialidades o diferido" }
        ],
        "sucursales": [
          {
            "id": "SUC_001",
            "nombre": "Sucursal Centro",
            "direccion": "Centro de Tuxtla Gutiérrez",
            "telefono": "961-100-1001",
            "gerente": "María Gómez Hernández",
            "activa": true,
            "fechaCreacion": new Date().toISOString()
          },
          {
            "id": "SUC_002",
            "nombre": "Sucursal Norte",
            "direccion": "Norte de Tuxtla Gutiérrez",
            "telefono": "961-100-1002",
            "gerente": "Juan Pérez Martínez",
            "activa": true,
            "fechaCreacion": new Date().toISOString()
          },
          {
            "id": "SUC_003",
            "nombre": "Sucursal Sur",
            "direccion": "Sur de Tuxtla Gutiérrez",
            "telefono": "961-100-1003",
            "gerente": "Ana López Silva",
            "activa": true,
            "fechaCreacion": new Date().toISOString()
          }
        ],
        "puestos": [
          {
            "id": "PUESTO_001",
            "nombre": "Gerente de Sucursal",
            "descripcion": "Responsable de la administración general de la sucursal",
            "salarioMinimo": 20000,
            "salarioMaximo": 35000,
            "activo": true,
            "fechaCreacion": new Date().toISOString()
          },
          {
            "id": "PUESTO_002",
            "nombre": "Asistente de Ventas",
            "descripcion": "Apoyo en atención al cliente y ventas",
            "salarioMinimo": 12000,
            "salarioMaximo": 18000,
            "activo": true,
            "fechaCreacion": new Date().toISOString()
          },
          {
            "id": "PUESTO_003",
            "nombre": "Auxiliar Administrativo",
            "descripcion": "Apoyo en tareas administrativas y de oficina",
            "salarioMinimo": 10000,
            "salarioMaximo": 15000,
            "activo": true,
            "fechaCreacion": new Date().toISOString()
          },
          {
            "id": "PUESTO_004",
            "nombre": "Operador de Equipos",
            "descripcion": "Manejo y mantenimiento de equipos de copiado e impresión",
            "salarioMinimo": 11000,
            "salarioMaximo": 16000,
            "activo": true,
            "fechaCreacion": new Date().toISOString()
          }
        ]
      }
    };

    // Escribir archivo
    fs.writeFileSync(DB_PATH, JSON.stringify(cleanData, null, 2), 'utf8');

    console.log('✅ Base de datos inicializada exitosamente\n');
    
    console.log('📊 Datos creados:');
    console.log(`👤 Usuarios: ${cleanData.usuarios.length}`);
    console.log(`👷 Empleados: ${cleanData.empleados.length}`);
    console.log(`🏢 Clientes: ${cleanData.clientes.length}`);
    console.log(`📋 Catálogos: ${Object.keys(cleanData.catalogos).length}\n`);
    
    console.log('🔐 Credenciales de acceso:');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ ADMINISTRADOR                          │');
    console.log('│ Usuario: admin                         │');
    console.log('│ Contraseña: Admin123!$                │');
    console.log('└────────────────────────────────────────┘');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ EMPLEADO CON ACCESO COMPLETO           │');
    console.log('│ Usuario: mgomez                        │');
    console.log('│ Contraseña: empleado123               │');
    console.log('│ Tipo: Administrador (todos módulos)   │');
    console.log('└────────────────────────────────────────┘');
    console.log('┌────────────────────────────────────────┐');
    console.log('│ EMPLEADO CON ACCESO LIMITADO           │');
    console.log('│ Usuario: jperez                        │');
    console.log('│ Contraseña: empleado123               │');
    console.log('│ Tipo: Personalizado (dashboard+clientes)│');
    console.log('└────────────────────────────────────────┘\n');
    
    console.log('🎯 Empleados configurados:');
    console.log('• María Gómez - Acceso: ADMINISTRADOR (todos los módulos)');
    console.log('• Juan Pérez - Acceso: PERSONALIZADO (dashboard y clientes)');
    console.log('• Ana López - Acceso: INACTIVO (sin usuario)\n');
    
    console.log('🏢 Clientes de ejemplo creados:');
    cleanData.clientes.forEach((cliente, index) => {
      console.log(`• ${cliente.nombreComercial} (${cliente.rfc})`);
    });
    
    console.log('\n🚀 Sistema listo para usar!');
    console.log('💡 Para restablecer estos datos, ejecuta: npm run init');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    process.exit(1);
  }
}

// Verificar si se ejecuta directamente
if (require.main === module) {
  initCleanData();
}

module.exports = { initCleanData };