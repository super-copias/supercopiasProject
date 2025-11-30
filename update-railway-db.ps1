# Script para actualizar la base de datos en Railway
# Uso: .\update-railway-db.ps1

Write-Host "🚂 Actualizando base de datos en Railway..." -ForegroundColor Cyan

# Verificar que psql está instalado
Write-Host "`n1. Verificando PostgreSQL client..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "✅ $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: psql no está instalado. Instala PostgreSQL client primero." -ForegroundColor Red
    exit 1
}

# Verificar que estamos vinculados a Railway
Write-Host "`n2. Verificando vínculo con Railway..." -ForegroundColor Yellow
railway status | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás vinculado a Railway. Intentando vincular..." -ForegroundColor Yellow
    railway link
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: No se pudo vincular a Railway." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Vinculado exitosamente`n" -ForegroundColor Green

# Obtener URL de conexión de Railway
Write-Host "3. Obteniendo credenciales de Railway..." -ForegroundColor Yellow
$railwayVars = railway variables --json | ConvertFrom-Json
$DB_URL = $railwayVars.DATABASE_PUBLIC_URL

if (-not $DB_URL) {
    Write-Host "❌ Error: No se pudo obtener DATABASE_PUBLIC_URL" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conexión configurada`n" -ForegroundColor Green

# Mostrar menú de opciones
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Selecciona qué actualizar:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1. 📄 Aplicar script completo (BD_SUPERCOPIAS.sql)"
Write-Host "2. 🔧 Aplicar solo script de turnos (add-turno-empleados.sql)"
Write-Host "3. 📦 Aplicar script de módulos (insertar-modulos.sql)"
Write-Host "4. 🔌 Conectar a la base de datos (shell interactivo)"
Write-Host "5. 🔍 Ver tablas y registros"
Write-Host "6. 📊 Crear backup de la base de datos"
Write-Host "7. ℹ️  Mostrar información de conexión"
Write-Host ""

$opcion = Read-Host "Ingresa el número de opción"

switch ($opcion) {
    "1" {
        Write-Host "`n📄 Aplicando BD_SUPERCOPIAS.sql..." -ForegroundColor Yellow
        Write-Host "⚠️  ADVERTENCIA: Esto eliminará y recreará todas las tablas." -ForegroundColor Red
        $confirmacion = Read-Host "¿Estás seguro? (escribe 'SI' para continuar)"
        if ($confirmacion -eq "SI") {
            Get-Content "backend\BD_SUPERCOPIAS.sql" | psql $DB_URL
        } else {
            Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
            exit 0
        }
    }
    "2" {
        Write-Host "`n🔧 Aplicando add-turno-empleados.sql..." -ForegroundColor Yellow
        if (Test-Path "backend\scripts\add-turno-empleados.sql") {
            Get-Content "backend\scripts\add-turno-empleados.sql" | psql $DB_URL
        } else {
            Write-Host "❌ Error: No se encontró el archivo" -ForegroundColor Red
            exit 1
        }
    }
    "3" {
        Write-Host "`n📦 Aplicando insertar-modulos.sql..." -ForegroundColor Yellow
        if (Test-Path "backend\scripts\insertar-modulos.sql") {
            Get-Content "backend\scripts\insertar-modulos.sql" | psql $DB_URL
        } else {
            Write-Host "❌ Error: No se encontró el archivo" -ForegroundColor Red
            exit 1
        }
    }
    "4" {
        Write-Host "`n🔌 Conectando a la base de datos..." -ForegroundColor Yellow
        Write-Host "Usa \q para salir`n" -ForegroundColor Gray
        psql $DB_URL
    }
    "5" {
        Write-Host "`n🔍 Consultando tablas y registros..." -ForegroundColor Yellow
        $verifyScript = @"
-- Tablas existentes
\echo '=== TABLAS EXISTENTES ==='
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;

\echo ''
\echo '=== CONTEO DE REGISTROS ==='
SELECT 'clientes' as tabla, COUNT(*) as registros FROM clientes
UNION ALL SELECT 'empleados', COUNT(*) FROM empleados
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'eventos_personal', COUNT(*) FROM eventos_personal
UNION ALL SELECT 'puestos', COUNT(*) FROM puestos
UNION ALL SELECT 'sucursales', COUNT(*) FROM sucursales;
"@
        $verifyScript | psql $DB_URL
    }
    "6" {
        Write-Host "`n📊 Creando backup de la base de datos..." -ForegroundColor Yellow
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "backend\backups\backup_railway_$timestamp.sql"
        
        # Crear directorio de backups si no existe
        if (-not (Test-Path "backend\backups")) {
            New-Item -ItemType Directory -Path "backend\backups" -Force | Out-Null
        }
        
        Write-Host "Guardando en: $backupFile" -ForegroundColor Gray
        pg_dump $DB_URL > $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            $size = (Get-Item $backupFile).Length / 1KB
            Write-Host "✅ Backup creado exitosamente ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        }
    }
    "7" {
        Write-Host "`n📋 Información de conexión:" -ForegroundColor Yellow
        Write-Host "════════════════════════════════════" -ForegroundColor Gray
        Write-Host "Proyecto: $($railwayVars.RAILWAY_PROJECT_NAME)" -ForegroundColor Cyan
        Write-Host "Ambiente: $($railwayVars.RAILWAY_ENVIRONMENT_NAME)" -ForegroundColor Cyan
        Write-Host "Servicio: $($railwayVars.RAILWAY_SERVICE_NAME)" -ForegroundColor Cyan
        Write-Host "Host: $($railwayVars.RAILWAY_TCP_PROXY_DOMAIN)" -ForegroundColor Cyan
        Write-Host "Puerto: $($railwayVars.RAILWAY_TCP_PROXY_PORT)" -ForegroundColor Cyan
        Write-Host "Base de datos: $($railwayVars.PGDATABASE)" -ForegroundColor Cyan
        Write-Host "Usuario: $($railwayVars.PGUSER)" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════" -ForegroundColor Gray
        Write-Host "`nURL de conexión pública:" -ForegroundColor Yellow
        Write-Host $DB_URL -ForegroundColor Green
    }
    default {
        Write-Host "❌ Opción no válida" -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ ¡Operación completada exitosamente!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Hubo un error. Código de salida: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
