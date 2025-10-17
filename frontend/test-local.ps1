# Test local para simular el comportamiento de produccion
Write-Host "Test Local de Produccion - SuperCopias" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Verificar si existe la build
if (-not (Test-Path "dist/supercopias-frontend")) {
    Write-Host "No se encuentra la carpeta dist/supercopias-frontend" -ForegroundColor Red
    Write-Host "Ejecutando build de produccion..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error en el build. Abortando test." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Carpeta dist encontrada" -ForegroundColor Green

# Mostrar informacion del test
Write-Host ""
Write-Host "Iniciando servidor local de prueba..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Rutas a probar:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/login" -ForegroundColor Cyan
Write-Host "  http://localhost:8080/admin" -ForegroundColor Cyan
Write-Host "  http://localhost:8080/admin/empleados" -ForegroundColor Cyan
Write-Host "  http://localhost:8080/admin/clientes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Abre las URLs en tu navegador"
Write-Host "2. Usa F5 (refresh) en cada ruta para verificar que no da 404"
Write-Host "3. Presiona Ctrl+C para detener el servidor"
Write-Host ""
Write-Host "Logs del servidor:" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Green

# Ejecutar el servidor
npm run serve:static