# Verificacion avanzada del problema SPA en Railway
Write-Host "=== DIAGNOSTICO AVANZADO DEL ERROR 404 ===" -ForegroundColor Red
Write-Host ""

# 1. Verificar contenido actual de los archivos de configuracion de Railway
Write-Host "1. VERIFICANDO ARCHIVOS DE CONFIGURACION:" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "Procfile") {
    Write-Host "Contenido de Procfile:" -ForegroundColor Cyan
    Get-Content "Procfile"
    Write-Host ""
}

if (Test-Path "nixpacks.toml") {
    Write-Host "Contenido de nixpacks.toml:" -ForegroundColor Cyan
    Get-Content "nixpacks.toml"
    Write-Host ""
}

if (Test-Path "railway.json") {
    Write-Host "Contenido de railway.json:" -ForegroundColor Cyan
    Get-Content "railway.json"
    Write-Host ""
}

# 2. Verificar que el build incluye los archivos SPA
Write-Host "2. VERIFICANDO BUILD ACTUAL:" -ForegroundColor Yellow
if (Test-Path "dist/supercopias-frontend") {
    $distFiles = Get-ChildItem "dist/supercopias-frontend" -Name
    Write-Host "Archivos en dist/supercopias-frontend:"
    foreach ($file in $distFiles) {
        if ($file -eq "index.html") {
            Write-Host "  [OK] $file" -ForegroundColor Green
        } elseif ($file -eq "_redirects") {
            Write-Host "  [OK] $file" -ForegroundColor Green
        } elseif ($file -eq ".htaccess") {
            Write-Host "  [OK] $file" -ForegroundColor Green
        } else {
            Write-Host "  - $file" -ForegroundColor White
        }
    }
} else {
    Write-Host "  [ERROR] No existe dist/supercopias-frontend" -ForegroundColor Red
}

Write-Host ""

# 3. Probar simulacion local con diferentes comandos
Write-Host "3. SIMULANDO COMANDOS DE RAILWAY:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Comando que deberia ejecutar Railway:" -ForegroundColor Cyan
Write-Host "npx http-server dist/supercopias-frontend --spa --cors --verbose -p 8080" -ForegroundColor White

Write-Host ""
Write-Host "=== POSIBLES CAUSAS DEL PROBLEMA ===" -ForegroundColor Red
Write-Host "1. Railway podria estar ignorando el flag --spa"
Write-Host "2. El build en Railway podria no incluir los archivos SPA"
Write-Host "3. Railway podria estar usando una version antigua de http-server"
Write-Host "4. Podria haber un problema con la configuracion de rutas de Angular"

Write-Host ""
Write-Host "=== SOLUCION ALTERNATIVA ===" -ForegroundColor Green
Write-Host "Vamos a crear un servidor personalizado con Express que maneje SPA correctamente"