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

// Scheduler de horarios de acceso
const { iniciarScheduler, detenerScheduler } = require('./utils/horariosScheduler');

// Importar rutas
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const clientesRoutes = require('./routes/clientes');
const empleadosRoutes = require('./routes/empleados');
const catalogosRoutes = require('./routes/catalogos');
const proveedoresRoutes = require('./routes/proveedores');
const equiposRoutes = require('./routes/equipos');
const catalogosEquiposRoutes = require('./routes/catalogos-equipos');
const inventariosRoutes = require('./routes/inventarios');
const posRoutes = require('./routes/pos');
const pedidosRoutes = require('./routes/pedidos');
const facturasRoutes = require('./routes/facturas');
const reportesRoutes = require('./routes/reportes');

// Configuración del servidor Express
const app = express();

// Middlewares globales
// CORS: configurar orígenes permitidos
const isDevelopment = process.env.NODE_ENV === 'development';

const allowedOrigins = isDevelopment 
  ? ['http://localhost:4200', 'http://127.0.0.1:4200']
  : [
      process.env.FRONTEND_URL || 'https://supercopias-frontend-production.up.railway.app',
      'https://supercopias.com'
    ];

console.log('🌐 Entorno:', isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN');
console.log('🔐 CORS orígenes permitidos:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin encabezado Origin (e.g., curl/healthchecks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions)); // Permitir requests desde frontend
// Responder explícitamente preflight para cualquier ruta
app.options('*', cors(corsOptions));

// ── Middleware de logging HTTP ────────────────────────────────────────────────
// Registra cada petición con el mismo formato que tenía el interceptor del front:
//   URL / REQUEST / RESPONSE / STATUS
const SENSITIVE_FIELDS = ['password', 'contrasena', 'contrasenia', 'token', 'secret'];

function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      clone[key] = '***';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizeBody(clone[key]);
    }
  }
  return clone;
}

function tryParseJSON(str) {
  if (str === null || str === undefined) return null;
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return str; }
}

function formatJSON(obj) {
  if (obj === null || obj === undefined) return 'null';
  try {
    return typeof obj === 'object' ? JSON.stringify(obj) : String(obj);
  } catch { return String(obj); }
}

app.use((req, res, next) => {
  const startTime = Date.now();

  // Interceptar res.send para capturar el body de respuesta
  const originalSend = res.send.bind(res);
  let responseBody;
  res.send = function (body) {
    responseBody = body;
    return originalSend(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const reqBody  = sanitizeBody(req.body && Object.keys(req.body).length ? req.body : null);
    const resBody  = tryParseJSON(responseBody);

    console.log('================================================================================');
    console.log(`URL: ${req.method} ${req.originalUrl}`);
    console.log(`REQUEST: ${formatJSON(reqBody)}`);
    console.log(`RESPONSE: ${formatJSON(resBody)}`);
    console.log(`STATUS: ${res.statusCode} (${duration}ms)`);
  });

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
app.use('/api/equipos', equiposRoutes);
app.use('/api/catalogos-equipos', catalogosEquiposRoutes);
app.use('/api/inventarios', inventariosRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/pos/pedidos', pedidosRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/reportes', reportesRoutes);

/**
 * Endpoint raíz - Información del API
 * GET /
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'SuperCopias API',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/profile', '/api/clientes', '/api/empleados', '/api/catalogos', '/api/proveedores', '/api/equipos', '/api/catalogos-equipos', '/api/inventarios', '/api/pos'],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🚫 [${timestamp}] 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  console.log(`📍 Origin: ${req.get('Origin') || 'No Origin'}`);
  console.log(`🔍 Referrer: ${req.get('Referrer') || 'No Referrer'}`);
  
  res.status(404).json({
    error: 'Ruta no encontrada',
    method: req.method,
    url: req.originalUrl,
    timestamp: timestamp,
    availableEndpoints: ['/api/auth', '/api/profile', '/api/clientes', '/api/empleados', '/api/catalogos', '/api/proveedores', '/api/equipos'],
    message: 'Esta es una API REST. Para la aplicación web, visita el frontend desplegado.'
  });
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 [${timestamp}] Error en ${req.method} ${req.originalUrl}:`);
  console.error(`📋 Error: ${err.message}`);
  console.error(`📚 Stack: ${err.stack}`);
  
  // No revelar información sensible en producción
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    timestamp: timestamp,
    path: req.originalUrl,
    method: req.method,
    ...(isDevelopment && { 
      message: err.message,
      stack: err.stack 
    })
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

    // Iniciar scheduler de horarios de acceso
    await iniciarScheduler();

    // Iniciar el servidor Express
    app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log(`🚀 SuperCopias Backend Server STARTED`);
      console.log('='.repeat(60));
      console.log(`📡 API available at: http://localhost:${PORT}`);
      console.log(`🌐 External URL: ${process.env.RAILWAY_STATIC_URL || 'Not set'}`);
      console.log(`🗄️  Database: PostgreSQL (${process.env.DB_NAME || 'Not set'})`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Port: ${PORT}`);
      console.log(`📋 CORS Origins:`, allowedOrigins);
      console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
      console.log('─'.repeat(60));
      console.log('📌 Available Endpoints:');
      console.log('  • GET  /           - API Info');
      console.log('  • GET  /health     - Health Check');
      console.log('  • POST /api/auth/* - Authentication');
      console.log('  • GET  /api/profile/* - User Profile');
      console.log('  • GET  /api/clientes/* - Clients Management');
      console.log('  • GET  /api/empleados/* - Employees Management');
      console.log('  • GET  /api/catalogos/* - Catalogs');
      console.log('  • GET  /api/proveedores/* - Suppliers');
      console.log('  • GET  /api/equipos/* - Equipment Management');
      console.log('='.repeat(60));
      console.log('✅ Sistema listo para recibir peticiones');
      console.log('='.repeat(60));
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
  detenerScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  detenerScheduler();
  process.exit(0);
});

// Iniciar el servidor
startServer();

