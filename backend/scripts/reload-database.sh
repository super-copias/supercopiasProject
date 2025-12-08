#!/bin/bash

###############################################################################
# Script para restaurar la base de datos PostgreSQL local desde BD_SUPERCOPIAS.sql
# Uso: ./reload-database.sh
###############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Funciones para mensajes
write_success() { echo -e "${GREEN}[OK]${NC} $1"; }
write_error() { echo -e "${RED}[ERROR]${NC} $1"; }
write_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
write_step() { echo -e "${CYAN}[PASO]${NC} $1"; }

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Restauración de Base de Datos Local${NC}"
echo -e "${CYAN}  SuperCopias - PostgreSQL${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Configuración (ajusta según tu entorno local)
DB_USER="postgres"
DB_NAME="supercopias"
DB_HOST="localhost"
DB_PORT="5432"
SQL_FILE="../BD_SUPERCOPIAS.sql"

# Cargar variables de entorno del .env si existe
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | grep -E '^(DB_|PGPASSWORD)' | xargs)
    DB_USER=${DB_USER:-postgres}
    DB_NAME=${DB_NAME:-supercopias}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
fi

# Verificar que existe el archivo SQL
if [ ! -f "$SQL_FILE" ]; then
    write_error "No se encuentra el archivo BD_SUPERCOPIAS.sql"
    write_info "Ruta esperada: $(pwd)/$SQL_FILE"
    exit 1
fi

write_success "Archivo SQL encontrado: $SQL_FILE"
echo ""

# Solicitar contraseña si no está en variable de entorno
if [ -z "$DB_PASSWORD" ]; then
    read -s -p "Ingrese la password de PostgreSQL para el usuario '$DB_USER': " DB_PASSWORD
    echo ""
fi

export PGPASSWORD=$DB_PASSWORD

echo ""
write_step "Configuración:"
echo -e "   Usuario: ${WHITE}$DB_USER${NC}"
echo -e "   Base de datos: ${WHITE}$DB_NAME${NC}"
echo -e "   Host: ${WHITE}$DB_HOST${NC}"
echo -e "   Puerto: ${WHITE}$DB_PORT${NC}"
echo ""

# Confirmar acción
echo -e "${YELLOW}[ADVERTENCIA] Esta acción eliminará TODOS los datos existentes en la base de datos '$DB_NAME'${NC}"
read -p "¿Está seguro de continuar? (S/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    write_info "Operación cancelada por el usuario"
    exit 0
fi

echo ""
write_step "Iniciando proceso de restauración..."
echo ""

# Verificar que psql está disponible
if ! command -v psql &> /dev/null; then
    write_error "psql no está instalado o no está en el PATH"
    write_info "Instala PostgreSQL: brew install postgresql"
    exit 1
fi

# Paso 1: Verificar conexión a PostgreSQL
write_step "Paso 1/5: Verificando conexión a PostgreSQL..."
if psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "SELECT version();" &> /dev/null; then
    write_success "Conexión exitosa a PostgreSQL"
else
    write_error "No se pudo conectar a PostgreSQL"
    write_info "Verifica que PostgreSQL esté ejecutándose y las credenciales sean correctas"
    exit 1
fi
echo ""

# Paso 2: Cerrar conexiones activas a la base de datos
write_step "Paso 2/5: Cerrando conexiones activas..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid) 
FROM pg_stat_activity 
WHERE pg_stat_activity.datname = '$DB_NAME' 
AND pid <> pg_backend_pid();" &> /dev/null
write_success "Conexiones cerradas"
echo ""

# Paso 3: Eliminar y recrear la base de datos
write_step "Paso 3/5: Recreando base de datos '$DB_NAME'..."

# Eliminar si existe
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" &> /dev/null
if [ $? -eq 0 ]; then
    write_success "Base de datos anterior eliminada"
fi

# Crear nueva base de datos con encoding UTF-8
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "
CREATE DATABASE $DB_NAME 
WITH ENCODING 'UTF8' 
LC_COLLATE='es_ES.UTF-8' 
LC_CTYPE='es_ES.UTF-8' 
TEMPLATE=template0;" &> /dev/null

if [ $? -ne 0 ]; then
    # Si falla con locale español, intentar sin especificar locale
    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "
    CREATE DATABASE $DB_NAME 
    WITH ENCODING 'UTF8' 
    TEMPLATE=template0;" &> /dev/null
fi

if [ $? -eq 0 ]; then
    write_success "Nueva base de datos creada"
else
    write_error "Error al crear la base de datos"
    exit 1
fi
echo ""

# Paso 4: Restaurar desde el archivo SQL con encoding UTF-8
write_step "Paso 4/5: Restaurando datos desde BD_SUPERCOPIAS.sql..."
write_info "Esto puede tardar unos momentos..."

# Configurar encoding UTF-8 para el cliente
export PGCLIENTENCODING="UTF8"

psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f $SQL_FILE --set=client_encoding=UTF8 &> /dev/null

if [ $? -eq 0 ]; then
    write_success "Datos restaurados correctamente"
else
    write_error "Error durante la restauración"
    write_info "Revisa el archivo SQL y los permisos"
    exit 1
fi
echo ""

# Paso 5: Verificar restauración y encoding
write_step "Paso 5/5: Verificando restauración y encoding..."

# Verificar encoding
ENCODING=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c "
SELECT pg_encoding_to_char(encoding) as encoding 
FROM pg_database 
WHERE datname = '$DB_NAME';" 2>&1 | xargs)

write_success "Encoding de la base de datos: $ENCODING"

# Verificar datos con acentos
ACCENT_TEST=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT nombre 
FROM regimenes_fiscales 
WHERE nombre LIKE '%Físicas%' 
LIMIT 1;" 2>&1 | xargs)

if [[ "$ACCENT_TEST" == *"Físicas"* ]]; then
    write_success "Caracteres especiales (acentos) verificados correctamente"
else
    write_error "Posible problema con caracteres especiales"
fi

# Resumen de tablas
echo ""
echo -e "${CYAN}Resumen de datos restaurados:${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT 
    'Puestos: ' || (SELECT COUNT(*) FROM puestos)::text || 
    ' | Sucursales: ' || (SELECT COUNT(*) FROM sucursales)::text ||
    ' | Módulos: ' || (SELECT COUNT(*) FROM modulos)::text ||
    ' | Clientes: ' || (SELECT COUNT(*) FROM clientes)::text || 
    ' | Empleados: ' || (SELECT COUNT(*) FROM empleados)::text || 
    ' | Proveedores: ' || (SELECT COUNT(*) FROM proveedores)::text;" 2>&1 | xargs

echo ""
echo -e "${CYAN}Verificando catálogos de empleados:${NC}"
echo ""
echo -e "${YELLOW}📊 Puestos (8 esperados):${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT id, nombre, salario_minimo, salario_maximo FROM puestos ORDER BY id;" 2>&1

echo ""
echo -e "${YELLOW}🏢 Sucursales (3 esperadas):${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT id, nombre, direccion, gerente FROM sucursales ORDER BY id;" 2>&1

echo ""
echo -e "${YELLOW}📦 Módulos (9 esperados):${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT id, clave, nombre, activo FROM modulos ORDER BY orden;" 2>&1

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Restauración completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
write_info "La base de datos '$DB_NAME' ha sido actualizada con éxito"
echo ""
write_info "Próximos pasos:"
echo "  1. Reinicia el servidor backend si está corriendo"
echo "  2. Verifica que los catálogos se carguen en el frontend"
echo "  3. Prueba crear un nuevo empleado"
echo ""

# Limpiar contraseña de la variable de entorno
unset PGPASSWORD
unset PGCLIENTENCODING

