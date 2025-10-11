/**
 * Script de prueba para creación de empleados
 * Verifica que la función createEmpleado funcione correctamente
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Función para hacer login y obtener token
async function login() {
  try {
    console.log('🔐 Intentando login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login exitoso');
    return response.data.data.token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return null;
  }
}

// Función para crear empleado con permisos de administrador
async function testCreateEmpleadoAdmin(token) {
  try {
    console.log('\n=== PRUEBA: Crear empleado administrador ===');
    
    const nuevoEmpleado = {
      nombre: 'Juan Carlos Pérez',
      email: 'juan.perez@supercopias.com',
      telefono: '555-0123',
      puesto: 'Supervisor',
      sucursal: 'SUC_001',
      salario: 25000,
      fechaIngreso: '2024-01-15',
      activo: true,
      tipoPermiso: 'administrador',
      modulosPermitidos: ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'configuracion']
    };
    
    console.log('Enviando datos:', JSON.stringify(nuevoEmpleado, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/empleados`,
      nuevoEmpleado,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n✅ Empleado administrador creado exitosamente!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    // Verificar credenciales generadas
    if (response.data.data.usuario) {
      console.log('\n🔐 Credenciales de usuario generadas:');
      console.log('Username:', response.data.data.usuario.username);
      console.log('Password:', response.data.data.usuario.password);
      console.log('Tipo:', response.data.data.usuario.tipoPermiso);
    }
    
    return response.data.data.empleado.id;
    
  } catch (error) {
    console.error('\n❌ Error creando empleado administrador:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

// Función para crear empleado con permisos personalizados
async function testCreateEmpleadoPersonalizado(token) {
  try {
    console.log('\n=== PRUEBA: Crear empleado personalizado ===');
    
    const nuevoEmpleado = {
      nombre: 'María Elena González',
      email: 'maria.gonzalez@supercopias.com',
      telefono: '555-0456',
      puesto: 'Operadora',
      sucursal: 'SUC_002',
      salario: 18000,
      fechaIngreso: '2024-02-01',
      activo: true,
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'reportes']
    };
    
    const response = await axios.post(
      `${BASE_URL}/empleados`,
      nuevoEmpleado,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n✅ Empleado personalizado creado exitosamente!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data.usuario) {
      console.log('\n🔐 Credenciales generadas:');
      console.log('Username:', response.data.data.usuario.username);
      console.log('Password:', response.data.data.usuario.password);
    }
    
    return response.data.data.empleado.id;
    
  } catch (error) {
    console.error('\n❌ Error creando empleado personalizado:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

// Función para crear empleado sin permisos
async function testCreateEmpleadoSinPermisos(token) {
  try {
    console.log('\n=== PRUEBA: Crear empleado sin permisos ===');
    
    const nuevoEmpleado = {
      nombre: 'Roberto Silva',
      email: 'roberto.silva@supercopias.com',
      telefono: '555-0789',
      puesto: 'Auxiliar',
      sucursal: 'SUC_001',
      salario: 15000,
      fechaIngreso: '2024-03-01',
      activo: true,
      tipoPermiso: 'sin_permisos',
      modulosPermitidos: []
    };
    
    const response = await axios.post(
      `${BASE_URL}/empleados`,
      nuevoEmpleado,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n✅ Empleado sin permisos creado exitosamente!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    // No debería tener credenciales
    if (!response.data.data.usuario) {
      console.log('✅ Correcto: No se generaron credenciales (sin permisos)');
    } else {
      console.log('⚠️ Inesperado: Se generaron credenciales para empleado sin permisos');
    }
    
    return response.data.data.empleado.id;
    
  } catch (error) {
    console.error('\n❌ Error creando empleado sin permisos:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de creación de empleados...');
  
  const token = await login();
  if (!token) {
    console.error('❌ No se pudo obtener token de autenticación');
    return;
  }
  
  // Ejecutar todas las pruebas
  const adminId = await testCreateEmpleadoAdmin(token);
  const personalizadoId = await testCreateEmpleadoPersonalizado(token);
  const sinPermisosId = await testCreateEmpleadoSinPermisos(token);
  
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log('- Empleado Admin:', adminId ? '✅ Creado' : '❌ Falló');
  console.log('- Empleado Personalizado:', personalizadoId ? '✅ Creado' : '❌ Falló');
  console.log('- Empleado Sin Permisos:', sinPermisosId ? '✅ Creado' : '❌ Falló');
  
  console.log('\n🏁 Pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };