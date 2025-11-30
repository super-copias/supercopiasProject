/**
 * Script para crear o actualizar el usuario administrador
 * Ejecutar con: node create-admin-user.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'supercopias'
});

const ADMIN_USER = {
  username: 'admin',
  password: 'Admin123!$',
  nombre: 'Administrador Sistema',
  email: 'admin@supercopias.com',
  role: 'admin'
};

async function createOrUpdateAdmin() {
  try {
    console.log('🔧 Iniciando proceso de creación/actualización de usuario admin...\n');

    // Verificar si existe el usuario admin
    const existingUser = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1',
      [ADMIN_USER.username]
    );

    // Hashear la contraseña
    const hashedPassword = bcrypt.hashSync(ADMIN_USER.password, 10);

    if (existingUser.rows.length > 0) {
      // Actualizar usuario existente
      console.log('👤 Usuario admin encontrado, actualizando contraseña...');
      
      await pool.query(
        `UPDATE usuarios 
         SET password = $1, 
             activo = true, 
             fecha_modificacion = NOW()
         WHERE username = $2`,
        [hashedPassword, ADMIN_USER.username]
      );
      
      console.log('✅ Contraseña de admin actualizada correctamente');
      
    } else {
      // Crear nuevo usuario
      console.log('👤 Usuario admin no existe, creando nuevo usuario...');
      
      await pool.query(
        `INSERT INTO usuarios (username, password, nombre, email, role, activo, fecha_registro, fecha_modificacion)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [
          ADMIN_USER.username,
          hashedPassword,
          ADMIN_USER.nombre,
          ADMIN_USER.email,
          ADMIN_USER.role
        ]
      );
      
      console.log('✅ Usuario admin creado correctamente');
    }

    // Verificar el usuario
    const verifyUser = await pool.query(
      'SELECT id, username, nombre, email, role, activo FROM usuarios WHERE username = $1',
      [ADMIN_USER.username]
    );

    console.log('\n📊 Información del usuario admin:');
    console.log('   ID:', verifyUser.rows[0].id);
    console.log('   Username:', verifyUser.rows[0].username);
    console.log('   Nombre:', verifyUser.rows[0].nombre);
    console.log('   Email:', verifyUser.rows[0].email);
    console.log('   Role:', verifyUser.rows[0].role);
    console.log('   Activo:', verifyUser.rows[0].activo);

    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Usuario:', ADMIN_USER.username);
    console.log('   Contraseña:', ADMIN_USER.password);
    console.log('\n✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
createOrUpdateAdmin();
