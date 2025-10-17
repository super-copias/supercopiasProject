#!/bin/bash

# Script de diagnóstico para SuperCopias
echo "🔍 SuperCopias - Diagnóstico del Sistema"
echo "=========================================="

# Verificar estructura de archivos
echo "📁 Verificando estructura de archivos..."
if [ -f "dist/supercopias-frontend/index.html" ]; then
    echo "✅ index.html encontrado"
else
    echo "❌ index.html NO encontrado - ejecuta 'npm run build' primero"
fi

if [ -f "dist/supercopias-frontend/_redirects" ]; then
    echo "✅ _redirects encontrado"
else
    echo "⚠️  _redirects no encontrado"
fi

if [ -f "dist/supercopias-frontend/.htaccess" ]; then
    echo "✅ .htaccess encontrado"
else
    echo "⚠️  .htaccess no encontrado"
fi

# Verificar variables de entorno
echo ""
echo "🌍 Variables de entorno:"
echo "PORT: ${PORT:-'No definido'}"
echo "NODE_ENV: ${NODE_ENV:-'No definido'}"

# Verificar conectividad del backend
echo ""
echo "🔗 Verificando backend..."
if command -v curl &> /dev/null; then
    BACKEND_URL="${BACKEND_URL:-https://supercopias-backend-production.up.railway.app}"
    echo "Probando conexión a: $BACKEND_URL"
    
    if curl -s "$BACKEND_URL/health" > /dev/null; then
        echo "✅ Backend accesible"
        curl -s "$BACKEND_URL/health" | head -3
    else
        echo "❌ Backend NO accesible"
    fi
else
    echo "⚠️  curl no disponible para probar backend"
fi

# Mostrar comando de inicio
echo ""
echo "🚀 Comando de inicio recomendado:"
echo "npx http-server dist/supercopias-frontend --spa --cors --verbose -p \$PORT"

echo ""
echo "📋 Rutas importantes a probar:"
echo "• /login"
echo "• /admin"
echo "• /admin/empleados"
echo "• /admin/clientes"

echo ""
echo "🔧 Si persisten problemas 404:"
echo "1. Verifica que el flag --spa esté en el comando de inicio"
echo "2. Verifica que los archivos _redirects y .htaccess estén en dist/"
echo "3. Checa los logs del servidor con --verbose"
echo "4. Asegúrate de que la build de producción sea exitosa"

echo ""
echo "==========================================="