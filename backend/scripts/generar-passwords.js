/**
 * Script para generar contraseñas hasheadas para los usuarios de ejemplo
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function generarContrasenasHash() {
  try {
    // Generar hashes para contraseñas de ejemplo
    const passwordAdmin = 'admin123';
    const passwordEmpleado = 'empleado123';
    
    const hashAdmin = await bcrypt.hash(passwordAdmin, 10);
    const hashEmpleado = await bcrypt.hash(passwordEmpleado, 10);
    
    console.log('🔐 Contraseñas generadas:');
    console.log(`📋 Administrador (mgarciar): ${passwordAdmin}`);
    console.log(`📋 Empleado (chernandez): ${passwordEmpleado}`);
    console.log('');
    console.log('🔑 Hashes generados:');
    console.log(`Admin: ${hashAdmin}`);
    console.log(`Empleado: ${hashEmpleado}`);
    
    // Leer y actualizar db.json
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Actualizar contraseñas en usuarios
    const usuarioAdmin = db.usuarios.find(u => u.id === 'USR_ADMIN_001');
    const usuarioEmpleado = db.usuarios.find(u => u.id === 'USR_EMPLEADO_001');
    
    if (usuarioAdmin) {
      usuarioAdmin.password = hashAdmin;
    }
    
    if (usuarioEmpleado) {
      usuarioEmpleado.password = hashEmpleado;
    }
    
    // Guardar archivo actualizado
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    
    console.log('');
    console.log('✅ Contraseñas actualizadas en la base de datos');
    console.log('');
    console.log('🚀 Credenciales para pruebas:');
    console.log('👤 Administrador:');
    console.log('   Usuario: mgarciar');
    console.log('   Contraseña: admin123');
    console.log('');
    console.log('👤 Empleado:');
    console.log('   Usuario: chernandez');
    console.log('   Contraseña: empleado123');
    
  } catch (error) {
    console.error('❌ Error generando contraseñas:', error);
  }
}

generarContrasenasHash();