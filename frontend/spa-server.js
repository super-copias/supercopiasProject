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

// ── Cabeceras de caché ──────────────────────────────────────
// index.html y runtime: NUNCA cachear → el browser siempre pide la versión más reciente
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  const isIndexOrRuntime = url === '/' || url === '/index.html' || /\/runtime\.[^.]+\.js$/.test(url);
  if (isIndexOrRuntime) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (/\.[0-9a-f]{16,}\.[^.]+$/.test(url)) {
    // Archivos con hash en el nombre → inmutables, caché agresivo
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

// Servir archivos estáticos
app.use(express.static(distPath));

// Fallback para SPA: cualquier ruta vuelve a index.html
// Esta es la clave para resolver el error 404 en rutas como /admin/empleados
app.get('*', (_req, res) => {
  console.log(`SPA Fallback: ${_req.url} -> index.html`);
  // Asegurar no-cache también en el fallback
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log('================================');
  console.log(`Server listening on port ${port}`);
  console.log(`Local: http://localhost:${port}`);
  console.log(`SPA Fallback: Active - All routes -> index.html`);
  console.log('================================');
});