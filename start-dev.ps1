# Script de inicio rápido para SuperCopias
# Este script levanta el backend y frontend en desarrollo

param(
    [switch]$Restart,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Help
)

# Colores para mensajes
function Write-Info { 
    param($message)
    Write-Host "[INFO] $message" -ForegroundColor Cyan 
}

function Write-Success { 
    param($message)
    Write-Host "[OK] $message" -ForegroundColor Green 
}

function Write-Error { 
    param($message)
    Write-Host "[ERROR] $message" -ForegroundColor Red 
}

function Write-Warning { 
    param($message)
    Write-Host "[WARN] $message" -ForegroundColor Yellow 
}

# Mostrar ayuda
if ($Help) {
    Write-Host @"
=== Script de Inicio Rápido SuperCopias ===

Uso:
    .\start-dev.ps1              - Inicia backend y frontend
    .\start-dev.ps1 -Restart     - Reinicia servicios existentes
    .\start-dev.ps1 -BackendOnly - Solo inicia backend
    .\start-dev.ps1 -FrontendOnly - Solo inicia frontend
    .\start-dev.ps1 -Help        - Muestra esta ayuda

Backend estará en: http://localhost:3000
Frontend estará en: http://localhost:4200

Para detener: Presiona Ctrl+C en cada ventana de terminal
"@
    exit 0
}

$rootPath = $PSScriptRoot
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"

# Verificar que existan los directorios
if (-not (Test-Path $backendPath)) {
    Write-Error "No se encontró el directorio backend en: $backendPath"
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Error "No se encontró el directorio frontend en: $frontendPath"
    exit 1
}

Write-Info "=== Inicio de SuperCopias - Ambiente de Desarrollo ==="
Write-Info "Directorio raíz: $rootPath"

# Función para detener procesos existentes
function Stop-DevServers {
    Write-Info "Buscando procesos de desarrollo activos..."
    
    # Detener nodemon/node del backend (puerto 3000)
    $backendProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($backendProcesses) {
        foreach ($processId in $backendProcesses) {
            Write-Warning "Deteniendo proceso backend (PID: $processId)..."
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Detener ng serve del frontend (puerto 4200)
    $frontendProcesses = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($frontendProcesses) {
        foreach ($processId in $frontendProcesses) {
            Write-Warning "Deteniendo proceso frontend (PID: $processId)..."
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    
    Start-Sleep -Seconds 2
    Write-Success "Procesos detenidos"
}

# Si se solicita reinicio, detener primero
if ($Restart) {
    Stop-DevServers
}

# Función para iniciar el backend
function Start-Backend {
    Write-Info "Iniciando Backend..."
    
    # Verificar node_modules
    if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
        Write-Warning "No se encontró node_modules en backend. Instalando dependencias..."
        Push-Location $backendPath
        npm install
        Pop-Location
    }
    
    # Iniciar en nueva ventana de PowerShell
    $backendScript = @"
Set-Location '$backendPath'
Write-Host '=== Backend SuperCopias ===' -ForegroundColor Green
Write-Host 'Puerto: 3000' -ForegroundColor Cyan
Write-Host 'Presiona Ctrl+C para detener' -ForegroundColor Yellow
Write-Host ''
npm run dev
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
    Write-Success "Backend iniciado en nueva ventana (puerto 3000)"
}

# Función para iniciar el frontend
function Start-Frontend {
    Write-Info "Iniciando Frontend..."
    
    # Verificar node_modules
    if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
        Write-Warning "No se encontró node_modules en frontend. Instalando dependencias..."
        Push-Location $frontendPath
        npm install
        Pop-Location
    }
    
    # Iniciar en nueva ventana de PowerShell
    $frontendScript = @"
Set-Location '$frontendPath'
Write-Host '=== Frontend SuperCopias ===' -ForegroundColor Green
Write-Host 'Puerto: 4200' -ForegroundColor Cyan
Write-Host 'URL: http://localhost:4200' -ForegroundColor Cyan
Write-Host 'Presiona Ctrl+C para detener' -ForegroundColor Yellow
Write-Host ''
npm start
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
    Write-Success "Frontend iniciado en nueva ventana (puerto 4200)"
}

# Ejecutar según los parámetros
if ($BackendOnly) {
    Start-Backend
} elseif ($FrontendOnly) {
    Start-Frontend
} else {
    Start-Backend
    Start-Sleep -Seconds 2
    Start-Frontend
}

Write-Host ""
Write-Success "=== Servicios iniciados correctamente ==="
Write-Info "Backend: http://localhost:3000"
Write-Info "Frontend: http://localhost:4200"
Write-Host ""
Write-Warning "Para detener los servicios, cierra las ventanas de terminal o presiona Ctrl+C"
Write-Info "Para reiniciar: .\start-dev.ps1 -Restart"
