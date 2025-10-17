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
// CORS: configurar orígenes permitidos y manejo explícito de preflight
const defaultProdOrigins = [
  process.env.FRONTEND_URL || 'https://supercopias-frontend-production.up.railway.app',
  'https://supercopias.com',
  'https://supercopias-frontend-production.up.railway.app',
  'https://supercopiasproject-production.up.railway.app' // URL que aparece en logs de error
];
const defaultDevOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200'];
const envOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
// Unir todos para evitar bloqueos si NODE_ENV no está bien configurado
const allowedOrigins = Array.from(new Set([
  ...defaultProdOrigins,
  ...defaultDevOrigins,
  ...envOrigins
]));
console.log('🚀 CORS allowed origins (startup):', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    console.log('🔍 CORS Request from origin:', origin);
    console.log('🔍 Allowed origins:', allowedOrigins);
    
    // Permitir solicitudes sin encabezado Origin (e.g., curl/healthchecks)
    if (!origin) {
      console.log('✅ CORS: Allowing request without origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS: Origin not allowed:', origin);
    console.log('❌ CORS: Available origins:', allowedOrigins);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions)); // Permitir requests desde frontend
// Responder explícitamente preflight para cualquier ruta
app.options('*', cors(corsOptions));

// Middleware de logging para debuggear requests
app.use((req, res, next) => {
  console.log(`\n🌐 ${req.method} ${req.path}`);
  console.log('🔍 Headers:', {
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
    authorization: req.headers.authorization ? 'Present' : 'Not present'
  });
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyLog = { ...req.body };
    if (bodyLog.password) bodyLog.password = '***hidden***';
    console.log('📦 Body:', bodyLog);
  }
  next();
});

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
    console.log('✅ Conexión a PostgreSQL establecida');

    // Iniciar el servidor Express
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SuperCopias Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}`);
      console.log(`🗄️  Database: PostgreSQL (${process.env.DB_NAME})`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Nota: Los datos mock ya no son necesarios con PostgreSQL
      console.log('\n✅ Sistema listo para usar\n');
    });

  } catch (error) {
    console.error('💥 Error iniciando el servidor:', error);
    console.error('📋 Posibles soluciones:');
    console.error('  1. Verificar que PostgreSQL esté corriendo');
    console.error('  2. Verificar credenciales en variables de entorno');
    console.error('  3. Verificar que la base de datos existe');
    console.error('  4. Verificar configuración DATABASE_URL en Railway');
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
