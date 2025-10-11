/**
 * Script para verificar y actualizar la contraseña del usuario admin
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function verificarPasswordAdmin() {
  try {
    // Leer base de datos
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Buscar usuario admin
    const adminUser = db.usuarios.find(u => u.username === 'admin');
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('👤 Usuario admin encontrado:');
    console.log(`ID: ${adminUser.id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Activo: ${adminUser.activo}`);
    console.log('');
    
    // Contraseñas a probar
    const passwordsToTest = [
      'admin',
      'admin123',
      'Admin123',
      'Admin123!',
      'Admin123!$',
      'supercopias',
      'supercopias123'
    ];
    
    console.log('🔍 Verificando contraseñas...');
    
    for (const password of passwordsToTest) {
      const isValid = await bcrypt.compare(password, adminUser.password);
      console.log(`${password}: ${isValid ? '✅ VÁLIDA' : '❌ Inválida'}`);
      
      if (isValid) {
        console.log('');
        console.log('🎉 ¡Contraseña encontrada!');
        console.log(`Usuario: ${adminUser.username}`);
        console.log(`Contraseña: ${password}`);
        return;
      }
    }
    
    console.log('');
    console.log('❌ Ninguna contraseña coincide. Generando nueva contraseña...');
    
    // Generar nueva contraseña: Admin123!$
    const newPassword = 'Admin123!$';
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Actualizar en la base de datos
    adminUser.password = newHash;
    adminUser.fechaModificacion = new Date().toISOString();
    
    // Guardar cambios
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    
    console.log('✅ Nueva contraseña establecida:');
    console.log(`Usuario: ${adminUser.username}`);
    console.log(`Contraseña: ${newPassword}`);
    console.log('');
    console.log('🚀 Credenciales actualizadas para login:');
    console.log('👤 Usuario: admin');
    console.log('🔑 Contraseña: Admin123!$');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarPasswordAdmin();