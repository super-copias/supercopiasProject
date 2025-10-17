# Script de diagnostico para SuperCopias
Write-Host "SuperCopias - Diagnostico del Sistema" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Verificar estructura de archivos
Write-Host "Verificando estructura de archivos..." -ForegroundColor Yellow
if (Test-Path "dist/supercopias-frontend/index.html") {
    Write-Host "[OK] index.html encontrado" -ForegroundColor Green
} else {
    Write-Host "[ERROR] index.html NO encontrado - ejecuta 'npm run build' primero" -ForegroundColor Red
}

if (Test-Path "dist/supercopias-frontend/_redirects") {
    Write-Host "[OK] _redirects encontrado" -ForegroundColor Green
} else {
    Write-Host "[WARN] _redirects no encontrado" -ForegroundColor Yellow
}

if (Test-Path "dist/supercopias-frontend/.htaccess") {
    Write-Host "[OK] .htaccess encontrado" -ForegroundColor Green
} else {
    Write-Host "[WARN] .htaccess no encontrado" -ForegroundColor Yellow
}

# Verificar variables de entorno
Write-Host ""
Write-Host "Variables de entorno:" -ForegroundColor Yellow
if ($env:PORT) {
    Write-Host "PORT: $env:PORT"
} else {
    Write-Host "PORT: No definido"
}
if ($env:NODE_ENV) {
    Write-Host "NODE_ENV: $env:NODE_ENV"
} else {
    Write-Host "NODE_ENV: No definido"
}

# Verificar conectividad del backend
Write-Host ""
Write-Host "Verificando backend..." -ForegroundColor Yellow
if ($env:BACKEND_URL) {
    $backendUrl = $env:BACKEND_URL
} else {
    $backendUrl = "https://supercopias-backend-production.up.railway.app"
}
Write-Host "Probando conexion a: $backendUrl"

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/health" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "Backend accesible" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Backend NO accesible" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Mostrar comando de inicio
Write-Host ""
Write-Host "Comando de inicio recomendado:" -ForegroundColor Yellow
Write-Host "npx http-server dist/supercopias-frontend --spa --cors --verbose -p 8080" -ForegroundColor Cyan

Write-Host ""
Write-Host "Rutas importantes a probar:" -ForegroundColor Yellow
Write-Host "- /login"
Write-Host "- /admin"
Write-Host "- /admin/empleados"
Write-Host "- /admin/clientes"

Write-Host ""
Write-Host "Si persisten problemas 404:" -ForegroundColor Yellow
Write-Host "1. Verifica que el flag --spa este en el comando de inicio"
Write-Host "2. Verifica que los archivos _redirects y .htaccess esten en dist/"
Write-Host "3. Checa los logs del servidor con --verbose"
Write-Host "4. Asegurate de que la build de produccion sea exitosa"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green