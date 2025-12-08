# ================================================================================
# Script de Gestion de Base de Datos - SuperCopias
# ================================================================================
# 
# Uso: .\db-manager.ps1 [comando]
#
# Comandos:
#   restore   - Restaurar BD desde BD_SUPERCOPIAS.sql
#   export    - Exportar BD actual a BD_SUPERCOPIAS.sql
#   help      - Mostrar ayuda
#
# Ejemplos:
#   .\db-manager.ps1 restore
#   .\db-manager.ps1 export
# ================================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('restore', 'export', 'help')]
    [string]$Command = 'help'
)

# Configuracion
$DB_NAME = "supercopias"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$SQL_FILE = "..\BD_SUPERCOPIAS.sql"

# ================================================================================
# Funcion: Mostrar Ayuda
# ================================================================================
function Show-Help {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DB Manager - SuperCopias" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\db-manager.ps1 [comando]" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host "  restore    Restaurar base de datos desde BD_SUPERCOPIAS.sql" -ForegroundColor White
    Write-Host "  export     Exportar base de datos actual a BD_SUPERCOPIAS.sql" -ForegroundColor White
    Write-Host "  help       Mostrar esta ayuda" -ForegroundColor White
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Yellow
    Write-Host "  .\db-manager.ps1 restore" -ForegroundColor Gray
    Write-Host "  .\db-manager.ps1 export" -ForegroundColor Gray
    Write-Host ""
}

# ================================================================================
# Funcion: Restaurar Base de Datos
# ================================================================================
function Restore-Database {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "  RESTAURAR BASE DE DATOS - SUPERCOPIAS" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""

    # Verificar PostgreSQL
    try {
        $pgVersion = psql --version
        Write-Host "[OK] PostgreSQL detectado: $pgVersion" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] PostgreSQL no encontrado en PATH" -ForegroundColor Red
        exit 1
    }

    # Verificar archivo SQL
    if (-not (Test-Path $SQL_FILE)) {
        Write-Host "[ERROR] Archivo BD_SUPERCOPIAS.sql no encontrado" -ForegroundColor Red
        Write-Host "        Ruta esperada: $SQL_FILE" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "[OK] Archivo BD_SUPERCOPIAS.sql encontrado" -ForegroundColor Green
    Write-Host ""

    # Confirmar
    Write-Host "[ADVERTENCIA] Esta accion eliminara y recreara la base de datos '$DB_NAME'" -ForegroundColor Yellow
    $confirmation = Read-Host "Continuar? (s/n)"

    if ($confirmation -ne 's' -and $confirmation -ne 'S') {
        Write-Host "Operacion cancelada" -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PASO 1: Terminando conexiones activas" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    $terminateQuery = "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();"

    $env:PGCLIENTENCODING = "UTF8"
    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $terminateQuery 2>$null
    Write-Host "[OK] Conexiones terminadas" -ForegroundColor Green

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PASO 2: Eliminando base de datos existente" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    dropdb -U $DB_USER -h $DB_HOST -p $DB_PORT --if-exists $DB_NAME 2>$null
    Write-Host "[OK] Base de datos eliminada" -ForegroundColor Green

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PASO 3: Creando nueva base de datos UTF-8" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    createdb -U $DB_USER -h $DB_HOST -p $DB_PORT -E UTF8 -T template0 $DB_NAME 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Base de datos creada con encoding UTF-8" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Fallo al crear la base de datos" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PASO 4: Restaurando estructura y datos" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    Write-Host "[INFO] Ejecutando BD_SUPERCOPIAS.sql..." -ForegroundColor Yellow

    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f $SQL_FILE --set=client_encoding=UTF8 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Estructura y datos restaurados" -ForegroundColor Green
    } else {
        Write-Host "[ADVERTENCIA] Restauracion completada con advertencias" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PASO 5: Verificando restauracion" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    # Verificar encoding
    $encodingQuery = "SELECT pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = '$DB_NAME';"
    $encoding = psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c $encodingQuery 2>$null

    Write-Host "[OK] Encoding: $($encoding.Trim())" -ForegroundColor Green

    # Verificar tablas
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    $tableCount = psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c $tableCountQuery 2>$null

    Write-Host "[OK] Tablas creadas: $($tableCount.Trim())" -ForegroundColor Green

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Resumen de datos" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    $summaryQuery = "SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM usuarios UNION ALL SELECT 'Empleados', COUNT(*) FROM empleados UNION ALL SELECT 'Clientes', COUNT(*) FROM clientes UNION ALL SELECT 'Proveedores', COUNT(*) FROM proveedores UNION ALL SELECT 'Equipos', COUNT(*) FROM equipos UNION ALL SELECT 'Inventarios', COUNT(*) FROM inventarios UNION ALL SELECT 'Modulos', COUNT(*) FROM modulos;"

    Write-Host ""
    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c $summaryQuery 2>$null

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  RESTAURACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
}

# ================================================================================
# Funcion: Exportar Base de Datos
# ================================================================================
function Export-Database {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  EXPORTAR BASE DE DATOS - SUPERCOPIAS" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    $OUTPUT_FILE = "..\BD_SUPERCOPIAS_temp.sql"
    $FINAL_FILE = "..\BD_SUPERCOPIAS.sql"
    $BACKUP_FILE = "..\BD_SUPERCOPIAS_backup.sql"

    # Confirmar
    Write-Host "[ADVERTENCIA] Esta accion sobrescribira el archivo BD_SUPERCOPIAS.sql actual" -ForegroundColor Yellow
    if (Test-Path $FINAL_FILE) {
        Write-Host "              Se creara un backup en BD_SUPERCOPIAS_backup.sql" -ForegroundColor Yellow
    }
    Write-Host ""
    $confirmation = Read-Host "Continuar? (s/n)"

    if ($confirmation -ne 's' -and $confirmation -ne 'S') {
        Write-Host "Operacion cancelada" -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    Write-Host "[INFO] Exportando base de datos con UTF-8..." -ForegroundColor Yellow

    $env:PGCLIENTENCODING = "UTF8"

    pg_dump -U $DB_USER --encoding=UTF8 --no-owner --no-acl --clean --if-exists -d $DB_NAME -f $OUTPUT_FILE

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Base de datos exportada" -ForegroundColor Green
        
        # Crear backup del anterior
        if (Test-Path $FINAL_FILE) {
            Copy-Item $FINAL_FILE $BACKUP_FILE -Force
            Write-Host "[OK] Backup creado: BD_SUPERCOPIAS_backup.sql" -ForegroundColor Yellow
        }
        
        # Reemplazar con el nuevo
        Copy-Item $OUTPUT_FILE $FINAL_FILE -Force
        Write-Host "[OK] Archivo BD_SUPERCOPIAS.sql actualizado" -ForegroundColor Green
        
        # Eliminar temporal
        Remove-Item $OUTPUT_FILE
        
        $size = (Get-Item $FINAL_FILE).Length
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "  EXPORTACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Archivo: backend\BD_SUPERCOPIAS.sql" -ForegroundColor White
        Write-Host "Tamano: $([math]::Round($size/1KB, 2)) KB" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "[ERROR] Fallo al exportar" -ForegroundColor Red
        exit 1
    }
}

# ================================================================================
# Main - Ejecutar comando
# ================================================================================

switch ($Command) {
    'restore' {
        Restore-Database
    }
    'export' {
        Export-Database
    }
    'help' {
        Show-Help
    }
    default {
        Show-Help
    }
}
