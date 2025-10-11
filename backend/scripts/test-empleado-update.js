/**
 * Script de prueba para actualización de empleados
 * Simula las llamadas del frontend para verificar la funcionalidad
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Función para hacer login y obtener token
async function login() {
  try {
    console.log('Intentando login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('Login exitoso, token recibido');
    return response.data.data.token;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    return null;
  }
}

// Función para actualizar empleado (convertir a administrador)
async function testUpdateEmpleado(token) {
  try {
    console.log('\n=== PRUEBA: Actualizar empleado a administrador ===');
    
    // Primero obtener lista de empleados
    const empleadosResponse = await axios.get(`${BASE_URL}/empleados`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const empleados = empleadosResponse.data.data;
    console.log('Empleados disponibles:', empleados.length);
    
    // Buscar un empleado que no sea administrador
    const empleadoParaActualizar = empleados.find(emp => 
      emp.tipoAcceso !== 'administrador' && emp.activo
    );
    
    if (!empleadoParaActualizar) {
      console.log('No hay empleados no-administradores para actualizar');
      return;
    }
    
    console.log('Actualizando empleado:', empleadoParaActualizar.nombre);
    console.log('Tipo de acceso actual:', empleadoParaActualizar.tipoAcceso);
    console.log('Tiene usuario:', !!empleadoParaActualizar.usuarioId);
    
    // Datos para actualizar (formato del frontend)
    const datosActualizacion = {
      tipoPermiso: 'administrador',
      modulosPermitidos: ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'equipos', 'reportes', 'configuracion']
    };
    
    const response = await axios.put(
      `${BASE_URL}/empleados/${empleadoParaActualizar.id}`,
      datosActualizacion,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n✅ Actualización exitosa!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    // Verificar si se devolvieron credenciales
    if (response.data.data.usuario) {
      console.log('\n🔐 Credenciales generadas:');
      console.log('Username:', response.data.data.usuario.username);
      console.log('Password:', response.data.data.usuario.password);
    }
    
  } catch (error) {
    console.error('\n❌ Error en actualización:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Función para actualizar empleado a personalizado
async function testUpdateEmpleadoPersonalizado(token) {
  try {
    console.log('\n=== PRUEBA: Actualizar empleado a personalizado ===');
    
    // Obtener empleados
    const empleadosResponse = await axios.get(`${BASE_URL}/empleados`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const empleados = empleadosResponse.data.data;
    
    // Buscar un empleado inactivo
    const empleadoParaActualizar = empleados.find(emp => 
      emp.tipoAcceso === 'inactivo' && emp.activo
    );
    
    if (!empleadoParaActualizar) {
      console.log('No hay empleados inactivos para actualizar');
      return;
    }
    
    console.log('Actualizando empleado:', empleadoParaActualizar.nombre);
    
    // Datos para actualizar a personalizado
    const datosActualizacion = {
      tipoPermiso: 'personalizado',
      modulosPermitidos: ['dashboard', 'clientes', 'reportes']
    };
    
    const response = await axios.put(
      `${BASE_URL}/empleados/${empleadoParaActualizar.id}`,
      datosActualizacion,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n✅ Actualización a personalizado exitosa!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    // Verificar credenciales
    if (response.data.data.usuario) {
      console.log('\n🔐 Credenciales generadas:');
      console.log('Username:', response.data.data.usuario.username);
      console.log('Password:', response.data.data.usuario.password);
    }
    
  } catch (error) {
    console.error('\n❌ Error en actualización personalizada:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de actualización de empleados...');
  
  const token = await login();
  if (!token) {
    console.error('No se pudo obtener token de autenticación');
    return;
  }
  
  console.log('✅ Login exitoso');
  
  // Ejecutar pruebas
  await testUpdateEmpleado(token);
  await testUpdateEmpleadoPersonalizado(token);
  
  console.log('\n🏁 Pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };