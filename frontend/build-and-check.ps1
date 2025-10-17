# Script para hacer build y verificar archivos SPA
Write-Host "SuperCopias - Build y Verificacion SPA" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

Write-Host "Ejecutando build de produccion..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Build exitoso" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Build fallido" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Verificando archivos SPA..." -ForegroundColor Yellow

# Verificar archivos principales
$files = @(
    "dist/supercopias-frontend/index.html",
    "dist/supercopias-frontend/_redirects", 
    "dist/supercopias-frontend/.htaccess"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "[OK] $file existe" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $file no existe" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Contenido del archivo _redirects:" -ForegroundColor Yellow
if (Test-Path "dist/supercopias-frontend/_redirects") {
    Get-Content "dist/supercopias-frontend/_redirects"
} else {
    Write-Host "[ERROR] Archivo _redirects no encontrado"
}

Write-Host ""
Write-Host "Build completado y verificado!" -ForegroundColor Green
Write-Host "Ahora puedes usar: npm run serve:static" -ForegroundColor Cyan