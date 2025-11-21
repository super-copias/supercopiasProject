#!/bin/bash

# Script de inicio rápido para SuperCopias (macOS/Linux)
# Este script levanta el backend y frontend en desarrollo

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de mensajes
info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Mostrar ayuda
show_help() {
    cat << EOF
=== Script de Inicio Rápido SuperCopias ===

Uso:
    ./start-dev.sh              - Inicia backend y frontend
    ./start-dev.sh restart      - Reinicia servicios existentes
    ./start-dev.sh backend      - Solo inicia backend
    ./start-dev.sh frontend     - Solo inicia frontend
    ./start-dev.sh stop         - Detiene los servicios
    ./start-dev.sh help         - Muestra esta ayuda

Backend estará en: http://localhost:3000
Frontend estará en: http://localhost:4200

Para detener: ./start-dev.sh stop o Ctrl+C
EOF
    exit 0
}

# Obtener directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"

# Verificar que existan los directorios
if [ ! -d "$BACKEND_PATH" ]; then
    error "No se encontró el directorio backend en: $BACKEND_PATH"
    exit 1
fi

if [ ! -d "$FRONTEND_PATH" ]; then
    error "No se encontró el directorio frontend en: $FRONTEND_PATH"
    exit 1
fi

# Función para detener procesos existentes
stop_dev_servers() {
    info "Buscando procesos de desarrollo activos..."
    
    # Detener backend (puerto 3000)
    BACKEND_PID=$(lsof -ti:3000)
    if [ ! -z "$BACKEND_PID" ]; then
        warning "Deteniendo proceso backend (PID: $BACKEND_PID)..."
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    
    # Detener frontend (puerto 4200)
    FRONTEND_PID=$(lsof -ti:4200)
    if [ ! -z "$FRONTEND_PID" ]; then
        warning "Deteniendo proceso frontend (PID: $FRONTEND_PID)..."
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    
    # Detener todos los procesos node/ng relacionados (alternativo)
    pkill -f "nodemon" 2>/dev/null
    pkill -f "ng serve" 2>/dev/null
    
    sleep 2
    success "Procesos detenidos"
}

# Función para iniciar el backend
start_backend() {
    info "Iniciando Backend..."
    
    # Verificar node_modules
    if [ ! -d "$BACKEND_PATH/node_modules" ]; then
        warning "No se encontró node_modules en backend. Instalando dependencias..."
        cd "$BACKEND_PATH" && npm install
    fi
    
    # Iniciar en nueva pestaña de Terminal
    osascript <<EOF > /dev/null 2>&1
tell application "Terminal"
    do script "cd '$BACKEND_PATH' && clear && echo '=== Backend SuperCopias ===' && echo 'Puerto: 3000' && echo 'Presiona Ctrl+C para detener' && echo '' && export PATH=\"/opt/homebrew/opt/node@18/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH\" && npm run dev"
    activate
end tell
EOF
    
    success "Backend iniciado en nueva pestaña (puerto 3000)"
}

# Función para iniciar el frontend
start_frontend() {
    info "Iniciando Frontend..."
    
    # Verificar node_modules
    if [ ! -d "$FRONTEND_PATH/node_modules" ]; then
        warning "No se encontró node_modules en frontend. Instalando dependencias..."
        cd "$FRONTEND_PATH" && npm install
    fi
    
    # Iniciar en nueva pestaña de Terminal
    osascript <<EOF > /dev/null 2>&1
tell application "Terminal"
    do script "cd '$FRONTEND_PATH' && clear && echo '=== Frontend SuperCopias ===' && echo 'Puerto: 4200' && echo 'URL: http://localhost:4200' && echo 'Presiona Ctrl+C para detener' && echo '' && export PATH=\"/opt/homebrew/opt/node@18/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH\" && npm start"
    activate
end tell
EOF
    
    success "Frontend iniciado en nueva pestaña (puerto 4200)"
}

# Procesar argumentos
case "${1:-}" in
    help|-h|--help)
        show_help
        ;;
    stop)
        stop_dev_servers
        exit 0
        ;;
    restart)
        stop_dev_servers
        start_backend
        sleep 2
        start_frontend
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    *)
        info "=== Inicio de SuperCopias - Ambiente de Desarrollo ==="
        info "Directorio raíz: $SCRIPT_DIR"
        start_backend
        sleep 2
        start_frontend
        ;;
esac

echo ""
success "=== Servicios iniciados correctamente ==="
info "Backend: http://localhost:3000"
info "Frontend: http://localhost:4200"
echo ""
warning "Para detener los servicios: ./start-dev.sh stop"
info "Para reiniciar: ./start-dev.sh restart"
