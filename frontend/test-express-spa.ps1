# Test completo del servidor Express SPA
Write-Host "=== TEST SERVIDOR EXPRESS SPA ===" -ForegroundColor Green
Write-Host ""

# Verificar que el servidor este corriendo
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    $serverRunning = $true
    Write-Host "[OK] Servidor Express corriendo en puerto 3000" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Servidor no accesible en puerto 3000" -ForegroundColor Red
    Write-Host "Asegurate de ejecutar 'npm run serve:spa' primero" -ForegroundColor Yellow
    exit 1
}

if ($serverRunning) {
    Write-Host ""
    Write-Host "Probando rutas SPA..." -ForegroundColor Yellow
    
    # Lista de rutas a probar
    $routes = @(
        "/",
        "/login", 
        "/admin",
        "/admin/empleados",
        "/admin/clientes",
        "/ruta-inexistente-123"
    )
    
    foreach ($route in $routes) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000$route" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "[OK] $route -> 200 OK" -ForegroundColor Green
                
                # Verificar que regresa HTML con Angular
                if ($response.Content -match "ng-version" -or $response.Content -match "supercopias" -or $response.Content -match "<title>") {
                    Write-Host "     Contenido Angular detectado" -ForegroundColor Cyan
                } else {
                    Write-Host "     Advertencia: No se detecto contenido Angular" -ForegroundColor Yellow
                }
            } else {
                Write-Host "[WARN] $route -> $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] $route -> Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "=== RESULTADO ===" -ForegroundColor Green
    Write-Host "Si todas las rutas devuelven 200 OK, el servidor SPA funciona correctamente" -ForegroundColor White
    Write-Host "Esto significa que el error 404 se solucionara en Railway" -ForegroundColor Green
    Write-Host ""
    Write-Host "Siguiente paso: Subir cambios a Railway" -ForegroundColor Cyan
    Write-Host "Ejecuta: npm run redeploy" -ForegroundColor Cyan
}