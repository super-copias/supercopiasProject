/**
 * Script para generar empleados de prueba con datos completos
 * Ejecutar en el backend: node scripts/generar-empleados-prueba.js
 */

const { db, init } = require('../db');
const { nanoid } = require('nanoid');

function generarEmpleadosPrueba() {
  init(); // Inicializar BD

  console.log('🧪 Generando empleados de prueba...\n');

  const empleadosPrueba = [
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Ana Patricia García López',
      telefono: '961-101-0001',
      email: 'ana.garcia@supercopias.com',
      puesto: 'Gerente General',
      sucursal: 'Sucursal Centro',
      salario: 35000,
      fechaIngreso: '2023-01-15',
      activo: true,
      tipoPermiso: 'admin',
      modulosPermitidos: ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'puntoventa'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Carlos Enrique Martínez Ruiz',
      telefono: '961-102-0002',
      email: 'carlos.martinez@supercopias.com',
      puesto: 'Gerente de Ventas',
      sucursal: 'Sucursal Norte',
      salario: 25000,
      fechaIngreso: '2023-03-20',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'puntoventa', 'reportes'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'María Elena Sánchez Morales',
      telefono: '961-103-0003',
      email: 'maria.sanchez@supercopias.com',
      puesto: 'Cajero',
      sucursal: 'Sucursal Centro',
      salario: 14000,
      fechaIngreso: '2023-05-10',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'puntoventa'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'José Antonio Rivera Vázquez',
      telefono: '961-104-0004',
      email: 'jose.rivera@supercopias.com',
      puesto: 'Técnico de Mantenimiento',
      sucursal: 'Sucursal Este',
      salario: 18000,
      fechaIngreso: '2023-07-05',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'equipos'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Laura Patricia Morales Jiménez',
      telefono: '961-105-0005',
      email: 'laura.morales@supercopias.com',
      puesto: 'Gestora de Clientes',
      sucursal: 'Sucursal Sur',
      salario: 18000,
      fechaIngreso: '2023-08-15',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'reportes'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Roberto Hernández Vega',
      telefono: '961-106-0006',
      email: 'roberto.hernandez@supercopias.com',
      puesto: 'Operador de Equipos',
      sucursal: 'Sucursal Norte',
      salario: 16000,
      fechaIngreso: '2023-09-20',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'equipos', 'puntoventa'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Sofía Alejandra Castro Pérez',
      telefono: '961-107-0007',
      email: 'sofia.castro@supercopias.com',
      puesto: 'Asistente Administrativo',
      sucursal: 'Sucursal Centro',
      salario: 12000,
      fechaIngreso: '2023-10-01',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Miguel Ángel Torres Gómez',
      telefono: '961-108-0008',
      email: 'miguel.torres@supercopias.com',
      puesto: 'Diseñador Gráfico',
      sucursal: 'Sucursal Este',
      salario: 20000,
      fechaIngreso: '2023-11-15',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'inventarios'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Carmen Leticia Jiménez Cruz',
      telefono: '961-109-0009',
      email: 'carmen.jimenez@supercopias.com',
      puesto: 'Operador de Equipos',
      sucursal: 'Sucursal Sur',
      salario: 15000,
      fechaIngreso: '2023-12-01',
      activo: true,
      tipoPermiso: 'sin_permisos',
      modulosPermitidos: ['dashboard'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    },
    {
      id: `EMP_${nanoid(8)}`,
      nombre: 'Fernando Alejandro Ruiz Mendoza',
      telefono: '961-110-0010',
      email: 'fernando.ruiz@supercopias.com',
      puesto: 'Cajero',
      sucursal: 'Sucursal Norte',
      salario: 14500,
      fechaIngreso: '2024-01-10',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'puntoventa'],
      fechaRegistro: new Date().toISOString(),
      fechaModificacion: null
    }
  ];

  // Obtener empleados existentes
  const empleadosExistentes = db.get('empleados').value() || [];
  
  // Eliminar empleados de prueba anteriores (IDs que empiecen con EMP_)
  const empleadosSinPrueba = empleadosExistentes.filter(emp => 
    !emp.id.startsWith('EMP_') || emp.id === 'EMP_001' // Mantener el admin original
  );

  // Agregar nuevos empleados de prueba
  const empleadosActualizados = [...empleadosSinPrueba, ...empleadosPrueba];

  // Guardar en base de datos
  db.set('empleados', empleadosActualizados).write();

  console.log(`✅ ${empleadosPrueba.length} empleados de prueba generados exitosamente!`);
  console.log('\n📋 Empleados creados:');
  
  empleadosPrueba.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.nombre}`);
    console.log(`   📧 ${emp.email}`);
    console.log(`   🏢 ${emp.puesto} - ${emp.sucursal}`);
    console.log(`   💰 $${emp.salario.toLocaleString()} MXN`);
    console.log(`   🔐 Permisos: ${emp.tipoPermiso} (${emp.modulosPermitidos.length} módulos)`);
    console.log(`   🆔 ID: ${emp.id}\n`);
  });

  console.log('🚀 ¡Datos listos para pruebas!');
  console.log('\n📝 Tipos de permisos incluidos:');
  console.log('   - 1 Administrador (acceso completo)');
  console.log('   - 8 Personalizados (módulos específicos)');
  console.log('   - 1 Sin Permisos (solo dashboard)');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmpleadosPrueba();
}

module.exports = { generarEmpleadosPrueba };