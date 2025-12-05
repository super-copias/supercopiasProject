# Script para exportar la base de datos con encoding UTF-8 correcto
# Uso: .\export-utf8.ps1 (ejecutar desde backend\scripts)

$DB_NAME = "supercopias"
$DB_USER = "postgres"
$OUTPUT_FILE = "..\BD_SUPERCOPIAS_UTF8.sql"
$FINAL_FILE = "..\BD_SUPERCOPIAS.sql"
$BACKUP_FILE = "..\BD_SUPERCOPIAS_backup.sql"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  EXPORTAR BASE DE DATOS CON UTF-8" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Exportando base de datos con UTF-8..." -ForegroundColor Yellow

$env:PGCLIENTENCODING = "UTF8"

pg_dump -U $DB_USER --encoding=UTF8 --no-owner --no-acl --clean --if-exists -d $DB_NAME -f $OUTPUT_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Base de datos exportada a $OUTPUT_FILE" -ForegroundColor Green
    
    # Crear backup del anterior
    if (Test-Path $FINAL_FILE) {
        Copy-Item $FINAL_FILE $BACKUP_FILE -Force
        Write-Host "[OK] Backup creado: BD_SUPERCOPIAS_backup.sql" -ForegroundColor Yellow
    }
    
    # Reemplazar con el nuevo
    Copy-Item $OUTPUT_FILE $FINAL_FILE -Force
    Write-Host "[OK] Archivo BD_SUPERCOPIAS.sql actualizado con UTF-8" -ForegroundColor Green
    
    # Eliminar temporal
    Remove-Item $OUTPUT_FILE
    
    Write-Host ""
    Write-Host "[OK] Exportacion completada exitosamente" -ForegroundColor Green
    Write-Host "     Ubicacion: backend\BD_SUPERCOPIAS.sql" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[ERROR] Fallo al exportar" -ForegroundColor Red
    exit 1
}
