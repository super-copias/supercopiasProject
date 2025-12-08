# Script para restaurar la base de datos PostgreSQL local desde BD_SUPERCOPIAS.sql
# Uso: .\restore-database.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Restauracion de Base de Datos Local" -ForegroundColor Cyan
Write-Host "  SuperCopias - PostgreSQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuración (ajusta según tu entorno local)
$DB_USER = "postgres"
$DB_NAME = "supercopias"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$SQL_FILE = "..\BD_SUPERCOPIAS.sql"

# Colores para mensajes
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-ErrorMsg { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Yellow }
function Write-Step { param($msg) Write-Host "[PASO] $msg" -ForegroundColor Cyan }

# Verificar que existe el archivo SQL
if (-not (Test-Path $SQL_FILE)) {
    Write-ErrorMsg "No se encuentra el archivo BD_SUPERCOPIAS.sql"
    $fullPath = Join-Path (Get-Location) $SQL_FILE
    Write-Info "Ruta esperada: $fullPath"
    exit 1
}

Write-Success "Archivo SQL encontrado: $SQL_FILE"
Write-Host ""

# Solicitar contraseña
$DB_PASSWORD = Read-Host "Ingrese la password de PostgreSQL para el usuario '$DB_USER'" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$DB_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Step "Configuracion:"
Write-Host "   Usuario: $DB_USER" -ForegroundColor White
Write-Host "   Base de datos: $DB_NAME" -ForegroundColor White
Write-Host "   Host: $DB_HOST" -ForegroundColor White
Write-Host "   Puerto: $DB_PORT" -ForegroundColor White
Write-Host ""

# Confirmar acción
Write-Host "[ADVERTENCIA] Esta accion eliminara TODOS los datos existentes en la base de datos '$DB_NAME'" -ForegroundColor Yellow
$confirmation = Read-Host "Esta seguro de continuar? (S/N)"

if ($confirmation -ne 'S' -and $confirmation -ne 's') {
    Write-Info "Operacion cancelada por el usuario"
    exit 0
}

Write-Host ""
Write-Step "Iniciando proceso de restauracion..."
Write-Host ""

# Configurar variable de entorno para la contraseña
$env:PGPASSWORD = $DB_PASSWORD_PLAIN

try {
    # Paso 1: Verificar conexión a PostgreSQL
    Write-Step "Paso 1/5: Verificando conexion a PostgreSQL..."
    $versionCmd = "SELECT version();"
    $testConnection = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $versionCmd 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "No se pudo conectar a PostgreSQL"
        Write-Info "Verifica que PostgreSQL este ejecutandose y las credenciales sean correctas"
        exit 1
    }
    Write-Success "Conexion exitosa a PostgreSQL"
    Write-Host ""

    # Paso 2: Cerrar conexiones activas a la base de datos
    Write-Step "Paso 2/5: Cerrando conexiones activas..."
    $closeConnections = "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $closeConnections 2>&1 | Out-Null
    Write-Success "Conexiones cerradas"
    Write-Host ""

    # Paso 3: Eliminar y recrear la base de datos
    Write-Step "Paso 3/5: Recreando base de datos '$DB_NAME'..."
    
    # Eliminar si existe
    $dropCmd = "DROP DATABASE IF EXISTS $DB_NAME;"
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $dropCmd 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Base de datos anterior eliminada"
    }
    
    # Crear nueva base de datos con encoding UTF-8
    $createCmd = "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8' LC_COLLATE='es_ES.UTF-8' LC_CTYPE='es_ES.UTF-8' TEMPLATE=template0;"
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $createCmd 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        # Si falla con locale español, intentar sin especificar locale
        $createCmd = "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8' TEMPLATE=template0;"
        & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c $createCmd 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Nueva base de datos creada"
    } else {
        Write-ErrorMsg "Error al crear la base de datos"
        exit 1
    }
    Write-Host ""

    # Paso 4: Restaurar desde el archivo SQL con encoding UTF-8
    Write-Step "Paso 4/5: Restaurando datos desde BD_SUPERCOPIAS.sql..."
    Write-Info "Esto puede tardar unos momentos..."
    
    # Configurar encoding UTF-8 para el cliente
    $env:PGCLIENTENCODING = "UTF8"
    
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f $SQL_FILE --set=client_encoding=UTF8 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Datos restaurados correctamente"
    } else {
        Write-ErrorMsg "Error durante la restauracion"
        Write-Info "Revisa el archivo SQL y los permisos"
        exit 1
    }
    Write-Host ""

    # Paso 5: Verificar restauración y encoding
    Write-Step "Paso 5/5: Verificando restauracion y encoding..."
    
    # Verificar encoding
    $encodingQuery = "SELECT pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = '$DB_NAME';"
    $encoding = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c $encodingQuery 2>&1
    
    Write-Success "Encoding de la base de datos: $($encoding.Trim())"
    
    # Verificar datos con acentos
    $accentQuery = "SELECT nombre FROM regimenes_fiscales WHERE nombre LIKE '%Físicas%' LIMIT 1;"
    $accentTest = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c $accentQuery 2>&1
    
    if ($accentTest -match "Físicas") {
        Write-Success "Caracteres especiales (acentos) verificados correctamente"
    } else {
        Write-ErrorMsg "Posible problema con caracteres especiales"
    }
    
    # Resumen de tablas
    $verifyQuery = "SELECT (SELECT COUNT(*) FROM clientes) as clientes, (SELECT COUNT(*) FROM empleados) as empleados, (SELECT COUNT(*) FROM proveedores) as proveedores, (SELECT COUNT(*) FROM equipos) as equipos, (SELECT COUNT(*) FROM inventarios) as inventarios, (SELECT COUNT(*) FROM modulos) as modulos;"
    
    $result = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c $verifyQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Resumen de datos restaurados:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Restauracion completada exitosamente" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "La base de datos '$DB_NAME' ha sido actualizada con exito"
    
} catch {
    Write-ErrorMsg "Error inesperado durante la restauracion"
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Limpiar contraseña de la variable de entorno
    $env:PGPASSWORD = $null
}

Write-Host ""
Write-Info "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
