#!/bin/bash

###############################################################################
# Script de gestión de BD Railway — SuperCopias
# Usa Railway CLI con DATABASE_PUBLIC_URL (el método que funciona desde fuera)
# Uso: ./update-railway-db-env.sh
###############################################################################

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BLUE='\033[0;34m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
step() { echo -e "${CYAN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚂 Railway DB Manager — SuperCopias${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""

# ── 1. Verificar Railway CLI ──────────────────────────────────────────────────
step "1. Verificando Railway CLI..."
if ! command -v railway &>/dev/null; then
    err "Railway CLI no instalado. Instálalo con:"
    info "  brew install railway   (macOS)"
    info "  npm i -g @railway/cli  (cualquier SO)"
    exit 1
fi
ok "Railway CLI $(railway --version 2>/dev/null | head -1)"

# ── 2. Verificar psql ────────────────────────────────────────────────────────
step "2. Verificando PostgreSQL client..."
if ! command -v psql &>/dev/null; then
    err "psql no instalado."
    info "macOS: brew install libpq && brew link --force libpq"
    exit 1
fi
ok "$(psql --version)"
echo ""

# ── 3. Autenticación Railway ─────────────────────────────────────────────────
step "3. Verificando autenticación Railway..."
if ! railway status &>/dev/null; then
    warn "No autenticado. Iniciando login browserless..."
    railway login --browserless
    if [ $? -ne 0 ]; then err "Login fallido"; exit 1; fi
fi

RAILWAY_STATUS=$(railway status 2>&1)
PROJECT=$(echo "$RAILWAY_STATUS" | grep 'Project:' | awk -F': ' '{print $2}')
ENVIRONMENT=$(echo "$RAILWAY_STATUS" | grep 'Environment:' | awk -F': ' '{print $2}')
SERVICE=$(echo "$RAILWAY_STATUS" | grep 'Service:' | awk -F': ' '{print $2}')

if [ -z "$PROJECT" ]; then
    warn "Sin proyecto vinculado. Ejecutando railway link..."
    railway link
    if [ $? -ne 0 ]; then err "No se pudo vincular el proyecto"; exit 1; fi
    RAILWAY_STATUS=$(railway status 2>&1)
    PROJECT=$(echo "$RAILWAY_STATUS" | grep 'Project:' | awk -F': ' '{print $2}')
    ENVIRONMENT=$(echo "$RAILWAY_STATUS" | grep 'Environment:' | awk -F': ' '{print $2}')
fi

echo -e "  Proyecto   : ${CYAN}${PROJECT}${NC}"
echo -e "  Entorno    : ${CYAN}${ENVIRONMENT}${NC}"
echo -e "  Servicio   : ${CYAN}${SERVICE:-Postgres}${NC}"
echo ""

# Función helper: ejecuta psql contra Railway inyectando DATABASE_PUBLIC_URL
railway_psql() {
    railway run bash -c "psql \"\$DATABASE_PUBLIC_URL\" $*"
}

# ── 4. Menú ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  Selecciona una opción:${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo "  1. 🎯 Aplicar migración específica (migrate-*.sql)"
echo "  2. 🔄 Aplicar TODAS las migraciones (en orden)"
echo "  3. 📄 Aplicar esquema completo (BD_SUPERCOPIAS.sql) ⚠️  destructivo"
echo "  4. 🔌 Shell interactivo PostgreSQL"
echo "  5. 🔍 Ver tablas y conteo de registros"
echo "  6. 📊 Crear backup"
echo ""
read -rp "Opción [1-6]: " opcion

case $opcion in

# ── Migración específica ───────────────────────────────────────────────────────
1)
    echo ""
    step "Archivos de migración disponibles:"
    echo ""
    MIGRATE_DIR="backend/scripts"
    mapfile -t FILES < <(ls "$MIGRATE_DIR"/migrate-*.sql 2>/dev/null | sort)

    if [ ${#FILES[@]} -eq 0 ]; then
        err "No hay archivos migrate-*.sql en $MIGRATE_DIR"
        exit 1
    fi

    for i in "${!FILES[@]}"; do
        echo "  $((i+1)). $(basename "${FILES[$i]}")"
    done
    echo ""
    read -rp "Número de migración a aplicar: " sel
    idx=$((sel-1))

    if [ $idx -lt 0 ] || [ $idx -ge ${#FILES[@]} ]; then
        err "Selección inválida"; exit 1
    fi

    MIGRATION_FILE="${FILES[$idx]}"
    echo ""
    step "Aplicando: $(basename "$MIGRATION_FILE")"
    railway_psql "-f $MIGRATION_FILE"
    [ $? -eq 0 ] && ok "Migración aplicada" || { err "Error en la migración"; exit 1; }
    ;;

# ── Todas las migraciones ─────────────────────────────────────────────────────
2)
    echo ""
    MIGRATE_DIR="backend/scripts"
    mapfile -t FILES < <(ls "$MIGRATE_DIR"/migrate-*.sql 2>/dev/null | sort)

    if [ ${#FILES[@]} -eq 0 ]; then
        err "No hay archivos migrate-*.sql en $MIGRATE_DIR"
        exit 1
    fi

    step "Se aplicarán ${#FILES[@]} migraciones en orden:"
    for f in "${FILES[@]}"; do echo "  • $(basename "$f")"; done
    echo ""
    read -rp "¿Continuar? (S/N): " conf
    [[ ! $conf =~ ^[Ss]$ ]] && { info "Cancelado"; exit 0; }

    ERRORS=0
    for f in "${FILES[@]}"; do
        step "→ $(basename "$f")"
        railway_psql "-f $f"
        if [ $? -ne 0 ]; then
            err "Falló: $(basename "$f")"
            ERRORS=$((ERRORS+1))
        else
            ok "OK: $(basename "$f")"
        fi
        echo ""
    done

    if [ $ERRORS -eq 0 ]; then
        ok "Todas las migraciones completadas"
    else
        warn "$ERRORS migración(es) fallaron"
        exit 1
    fi
    ;;

# ── Esquema completo ──────────────────────────────────────────────────────────
3)
    echo ""
    warn "PELIGRO: Esto eliminará y recreará todas las tablas en ${ENVIRONMENT}."
    read -rp "Escribe 'SI ENTIENDO' para continuar: " conf
    if [ "$conf" != "SI ENTIENDO" ]; then info "Cancelado"; exit 0; fi

    if [ ! -f "backend/BD_SUPERCOPIAS.sql" ]; then
        err "No se encontró backend/BD_SUPERCOPIAS.sql"; exit 1
    fi

    step "Aplicando BD_SUPERCOPIAS.sql..."
    railway_psql "-f backend/BD_SUPERCOPIAS.sql"
    [ $? -eq 0 ] && ok "Esquema aplicado" || { err "Error al aplicar esquema"; exit 1; }
    ;;

# ── Shell interactivo ─────────────────────────────────────────────────────────
4)
    echo ""
    info "Abriendo shell PostgreSQL en Railway. Usa \\q para salir."
    railway run bash -c 'psql "$DATABASE_PUBLIC_URL"'
    ;;

# ── Ver tablas ────────────────────────────────────────────────────────────────
5)
    echo ""
    step "Consultando estado de la BD..."
    railway_psql "-c \"
    SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name;\""
    ;;

# ── Backup ───────────────────────────────────────────────────────────────────
6)
    echo ""
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="backend/backups"
    BACKUP_FILE="$BACKUP_DIR/backup_railway_${ENVIRONMENT}_${TIMESTAMP}.sql"
    mkdir -p "$BACKUP_DIR"

    step "Creando backup → $BACKUP_FILE"
    railway run bash -c "pg_dump \"\$DATABASE_PUBLIC_URL\"" > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        ok "Backup creado: $BACKUP_FILE ($SIZE)"
    else
        err "Error al crear backup"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
    ;;

*)
    err "Opción no válida"
    exit 1
    ;;
esac

echo ""
ok "¡Listo!"


# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Funciones para mensajes
write_success() { echo -e "${GREEN}✅ $1${NC}"; }
write_error() { echo -e "${RED}❌ $1${NC}"; }
write_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
write_step() { echo -e "${CYAN}▶ $1${NC}"; }
write_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  🚂 Actualización BD Railway${NC}"
echo -e "${CYAN}  SuperCopias - PostgreSQL${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

# Verificar que psql está instalado
write_step "1. Verificando PostgreSQL client..."
if ! command -v psql &> /dev/null; then
    write_error "psql no está instalado. Instala PostgreSQL client primero."
    write_info "macOS: brew install postgresql"
    exit 1
fi
PSQL_VERSION=$(psql --version)
write_success "$PSQL_VERSION"
echo ""

# Cargar variables de entorno
write_step "2. Cargando variables de entorno..."
if [ -f "backend/.env" ]; then
    # Exportar solo DATABASE_URL si existe
    export $(cat backend/.env | grep "^DATABASE_URL=" | xargs)
    write_success "Variables cargadas desde backend/.env"
elif [ -f ".env" ]; then
    export $(cat .env | grep "^DATABASE_URL=" | xargs)
    write_success "Variables cargadas desde .env"
else
    write_warning "No se encontró archivo .env"
fi
echo ""

# Solicitar URL si no está en .env
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Por favor, ingresa la URL de conexión a Railway:${NC}"
    echo -e "${CYAN}(Formato: postgresql://user:password@host:port/database)${NC}"
    read -p "DATABASE_URL: " DATABASE_URL
    
    if [ -z "$DATABASE_URL" ]; then
        write_error "DATABASE_URL es requerida"
        exit 1
    fi
fi

write_success "Conexión configurada"
echo ""

# Menú de opciones
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Selecciona qué actualizar:${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo "1. 📄 Aplicar esquema completo (BD_SUPERCOPIAS.sql)"
echo "2. 🎯 Aplicar esquema + datos de prueba (RECOMENDADO)"
echo "3. 📦 Solo datos de prueba (datos-prueba.sql)"
echo "4. 🔌 Conectar a la base de datos (shell interactivo)"
echo "5. 🔍 Ver tablas y registros"
echo "6. 📊 Crear backup de la base de datos"
echo ""

read -p "Ingresa el número de opción: " opcion

case $opcion in
    1)
        echo ""
        write_step "📄 Aplicando BD_SUPERCOPIAS.sql..."
        write_warning "ADVERTENCIA: Esto eliminará y recreará todas las tablas."
        read -p "¿Estás seguro? (escribe 'SI' para continuar): " confirmacion
        
        if [ "$confirmacion" == "SI" ]; then
            if [ ! -f "backend/BD_SUPERCOPIAS.sql" ]; then
                write_error "No se encontró el archivo backend/BD_SUPERCOPIAS.sql"
                exit 1
            fi
            
            write_info "Ejecutando script..."
            psql "$DATABASE_URL" < backend/BD_SUPERCOPIAS.sql
            
            if [ $? -eq 0 ]; then
                write_success "Esquema aplicado exitosamente"
            else
                write_error "Error al aplicar el esquema"
                exit 1
            fi
        else
            write_info "Operación cancelada"
            exit 0
        fi
        ;;
        
    2)
        echo ""
        write_step "🎯 Aplicando esquema completo + datos de prueba..."
        write_warning "ADVERTENCIA: Esto eliminará y recreará todas las tablas con datos de prueba."
        read -p "¿Estás seguro? (escribe 'SI' para continuar): " confirmacion
        
        if [ "$confirmacion" == "SI" ]; then
            if [ ! -f "backend/BD_SUPERCOPIAS.sql" ]; then
                write_error "No se encontró el archivo backend/BD_SUPERCOPIAS.sql"
                exit 1
            fi
            
            if [ ! -f "backend/scripts/datos-prueba.sql" ]; then
                write_error "No se encontró el archivo backend/scripts/datos-prueba.sql"
                exit 1
            fi
            
            write_info "Paso 1/2: Aplicando esquema..."
            psql "$DATABASE_URL" < backend/BD_SUPERCOPIAS.sql 2>&1
            
            if [ $? -eq 0 ]; then
                write_success "Esquema aplicado"
                echo ""
                
                write_info "Paso 2/2: Insertando datos de prueba..."
                psql "$DATABASE_URL" < backend/scripts/datos-prueba.sql 2>&1
                
                if [ $? -eq 0 ]; then
                    echo ""
                    write_success "¡Base de datos actualizada exitosamente!"
                    echo ""
                    echo -e "${CYAN}═══════════════════════════════════════${NC}"
                    echo -e "${GREEN}Datos de prueba insertados:${NC}"
                    echo "  • 5 Clientes"
                    echo "  • 5 Proveedores"
                    echo "  • 5 Artículos de inventario"
                    echo "  • 5 Equipos"
                    echo "  • 10 Empleados (4 con acceso al sistema)"
                    echo "  • 4 Usuarios creados"
                    echo ""
                    echo -e "${CYAN}Credenciales de prueba (password: password123):${NC}"
                    echo "  • Admin: 001.robertomar"
                    echo "  • Gerente Principal: 002.lauragomez"
                    echo "  • Gerente Norte: 003.carloshern"
                    echo "  • Supervisor: 004.anamariarui"
                    echo -e "${CYAN}═══════════════════════════════════════${NC}"
                else
                    write_error "Error al insertar datos de prueba"
                    exit 1
                fi
            else
                write_error "Error al aplicar el esquema"
                exit 1
            fi
        else
            write_info "Operación cancelada"
            exit 0
        fi
        ;;
        
    3)
        echo ""
        write_step "📦 Aplicando solo datos-prueba.sql..."
        write_warning "Esto insertará datos de prueba en la base de datos existente."
        read -p "¿Continuar? (S/N): " confirmacion
        
        if [[ $confirmacion =~ ^[Ss]$ ]]; then
            if [ ! -f "backend/scripts/datos-prueba.sql" ]; then
                write_error "No se encontró el archivo backend/scripts/datos-prueba.sql"
                exit 1
            fi
            
            psql "$DATABASE_URL" < backend/scripts/datos-prueba.sql
            
            if [ $? -eq 0 ]; then
                write_success "Datos de prueba insertados exitosamente"
            else
                write_error "Error al insertar datos de prueba"
                exit 1
            fi
        else
            write_info "Operación cancelada"
            exit 0
        fi
        ;;
        
    4)
        echo ""
        write_step "🔌 Conectando a la base de datos..."
        write_info "Usa \\q para salir"
        echo ""
        psql "$DATABASE_URL"
        ;;
        
    5)
        echo ""
        write_step "🔍 Consultando tablas y registros..."
        
        VERIFY_SCRIPT="
-- Tablas existentes
\\echo '=== TABLAS EXISTENTES ==='
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;

\\echo ''
\\echo '=== CONTEO DE REGISTROS ==='
SELECT 'clientes' as tabla, COUNT(*) as registros FROM clientes
UNION ALL SELECT 'empleados', COUNT(*) FROM empleados
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'inventarios', COUNT(*) FROM inventarios
UNION ALL SELECT 'equipos', COUNT(*) FROM equipos
UNION ALL SELECT 'eventos_personal', COUNT(*) FROM eventos_personal
UNION ALL SELECT 'puestos', COUNT(*) FROM puestos
UNION ALL SELECT 'sucursales', COUNT(*) FROM sucursales
UNION ALL SELECT 'modulos', COUNT(*) FROM modulos
ORDER BY tabla;

\\echo ''
\\echo '=== USUARIOS DEL SISTEMA ==='
SELECT id, username, nombre, email, role, activo FROM usuarios ORDER BY id;
"
        
        echo "$VERIFY_SCRIPT" | psql "$DATABASE_URL"
        ;;
        
    6)
        echo ""
        write_step "📊 Creando backup de la base de datos..."
        
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_DIR="backend/backups"
        BACKUP_FILE="$BACKUP_DIR/backup_railway_$TIMESTAMP.sql"
        
        # Crear directorio de backups si no existe
        mkdir -p "$BACKUP_DIR"
        
        write_info "Guardando en: $BACKUP_FILE"
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            write_success "Backup creado exitosamente ($SIZE)"
        else
            write_error "Error al crear backup"
            exit 1
        fi
        ;;
        
    *)
        write_error "Opción no válida"
        exit 1
        ;;
esac

echo ""
write_success "¡Operación completada!"
