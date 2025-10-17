# Script para redeployar en Railway con las nuevas configuraciones
Write-Host "SuperCopias - Redeployar en Railway" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

Write-Host "Este script te ayuda a redeployar con las correcciones del error 404" -ForegroundColor Yellow
Write-Host ""

# Verificar si git esta disponible
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git no esta instalado o no esta en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar estado del repositorio
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Archivos modificados detectados:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    $confirm = Read-Host "Deseas commitear estos cambios y hacer push? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        Write-Host "Agregando archivos..." -ForegroundColor Yellow
        git add .
        
        $commitMessage = Read-Host "Ingresa el mensaje del commit (o presiona Enter para usar el default)"
        if ([string]::IsNullOrWhiteSpace($commitMessage)) {
            $commitMessage = "fix: Agregar configuracion SPA y logs para resolver error 404"
        }
        
        Write-Host "Haciendo commit..." -ForegroundColor Yellow
        git commit -m $commitMessage
        
        Write-Host "Haciendo push..." -ForegroundColor Yellow
        git push
        
        Write-Host "Cambios enviados al repositorio" -ForegroundColor Green
    } else {
        Write-Host "No se hicieron cambios al repositorio" -ForegroundColor Yellow
    }
} else {
    Write-Host "Repositorio limpio - no hay cambios pendientes" -ForegroundColor Green
}

Write-Host ""
Write-Host "Archivos de configuracion SPA agregados:" -ForegroundColor Yellow
Write-Host "  [OK] .htaccess (para Apache)"
Write-Host "  [OK] _redirects (para Netlify y otros)"
Write-Host "  [OK] Procfile actualizado con --spa --cors --verbose"
Write-Host "  [OK] nixpacks.toml actualizado con --spa --cors --verbose"
Write-Host "  ✅ railway.json actualizado con --spa --cors --verbose"

Write-Host ""
Write-Host "Railway detectara automaticamente los cambios y redeployara" -ForegroundColor Green
Write-Host "El proceso puede tomar 2-5 minutos" -ForegroundColor Yellow

Write-Host ""
Write-Host "Despues del deploy, prueba estas URLs:" -ForegroundColor Yellow
Write-Host "  - https://supercopias-frontend-production.up.railway.app/login"
Write-Host "  - https://supercopias-frontend-production.up.railway.app/admin/empleados"
Write-Host "  - Usa F5 en cada una para verificar que no da 404"

Write-Host ""
Write-Host "Para ver logs en tiempo real:" -ForegroundColor Yellow
Write-Host "  - Ve a railway.app"
Write-Host "  - Selecciona tu proyecto"
Write-Host "  - Ve a la pestana de Deployments"
Write-Host "  - Haz clic en el deployment activo para ver logs"

Write-Host ""
Write-Host "Listo! El redeploy deberia resolver el error 404" -ForegroundColor Green