const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Ruta al build de Angular - ajustada a nuestra estructura
const distPath = path.join(__dirname, 'dist', 'supercopias-frontend');

console.log('SuperCopias SPA Server - Express');
console.log('================================');
console.log(`Serving files from: ${distPath}`);
console.log(`Port: ${port}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Middleware para logging de requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Servir archivos estáticos
app.use(express.static(distPath));

// Fallback para SPA: cualquier ruta vuelve a index.html
// Esta es la clave para resolver el error 404 en rutas como /admin/empleados
app.get('*', (_req, res) => {
  console.log(`SPA Fallback: ${_req.url} -> index.html`);
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log('================================');
  console.log(`Server listening on port ${port}`);
  console.log(`Local: http://localhost:${port}`);
  console.log(`SPA Fallback: Active - All routes -> index.html`);
  console.log('================================');
});