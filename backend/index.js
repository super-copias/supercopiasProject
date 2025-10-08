/**
 * SuperCopias Backend Server
 * API REST para el sistema de gestión de SuperCopias
 * 
 * Endpoints disponibles:
 * - /api/auth/* - Autenticación y autorización
 * - /api/clientes/* - Gestión de clientes
 * - /api/empleados/* - Gestión de empleados
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar rutas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const empleadosRoutes = require('./routes/empleados');

// Configuración del servidor Express
const app = express();

// Middlewares globales
app.use(cors()); // Permitir requests desde frontend
app.use(bodyParser.json()); // Parsear JSON en requests

// Configuración de rutas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/empleados', empleadosRoutes);

/**
 * Endpoint raíz - Información del API
 * GET /
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'SuperCopias API',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/clientes', '/api/empleados']
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SuperCopias Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
});
