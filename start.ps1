# ===================================
# SuperCopias - Script de Inicio Rápido
# ===================================

Write-Host "🚀 Iniciando SuperCopias..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path ".\backend") -or -not (Test-Path ".\frontend")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar que Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar que PostgreSQL está corriendo
Write-Host "🔍 Verificando PostgreSQL..." -ForegroundColor Yellow
try {
    $pgStatus = pg_isready
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL está corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  PostgreSQL podría no estar corriendo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Iniciando Backend y Frontend..." -ForegroundColor Cyan
Write-Host ""

# Iniciar Backend en una ventana nueva
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend iniciando en http://localhost:3000' -ForegroundColor Green; npm run dev"

# Esperar 3 segundos
Start-Sleep -Seconds 3

# Iniciar Frontend en otra ventana nueva
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🎨 Frontend iniciando en http://localhost:4200' -ForegroundColor Blue; npm start"

Write-Host ""
Write-Host "✅ SuperCopias iniciado exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Para detener: Cierra las ventanas de PowerShell que se abrieron" -ForegroundColor Yellow
Write-Host ""
