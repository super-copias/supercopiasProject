/**
 * SuperCopias Backend Server
 * API REST para el sistema de gestión de SuperCopias
 * 
 * Endpoints disponibles:
 * - /api/auth/* - Autenticación y autorización
 * - /api/profile/* - Gestión de perfil de usuario
 * - /api/clientes/* - Gestión de clientes
 * - /api/empleados/* - Gestión de empleados
 */

// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar configuración de base de datos
const { initializeDatabase } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const clientesRoutes = require('./routes/clientes');
const empleadosRoutes = require('./routes/empleados');
const catalogosRoutes = require('./routes/catalogos');
const proveedoresRoutes = require('./routes/proveedores');

// Configuración del servidor Express
const app = express();

// Middlewares globales
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Permitir requests desde frontend
app.use(bodyParser.json()); // Parsear JSON en requests

// Servir archivos estáticos (imágenes de perfil, etc.)
app.use('/uploads', express.static('uploads'));

// Configuración de rutas
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/proveedores', proveedoresRoutes);

/**
 * Endpoint raíz - Información del API
 * GET /
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'SuperCopias API',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/profile', '/api/clientes', '/api/empleados', '/api/catalogos', '/api/proveedores']
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Inicializar conexión a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    await initializeDatabase();
    console.log('✅ Conexión a MySQL establecida');

    // Iniciar el servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 SuperCopias Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}`);
      console.log(`🗄️  Database: MySQL (${process.env.DB_NAME})`);
      
      // Nota: Los datos mock ya no son necesarios con MySQL
      console.log('\n✅ Sistema listo para usar\n');
    });

  } catch (error) {
    console.error('💥 Error iniciando el servidor:', error);
    console.error('📋 Posibles soluciones:');
    console.error('  1. Verificar que MySQL esté corriendo');
    console.error('  2. Verificar credenciales en .env');
    console.error('  3. Verificar que la base de datos existe');
    console.error('  4. Ejecutar: npm run setup-db');
    process.exit(1);
  }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

// Iniciar el servidor
startServer();
