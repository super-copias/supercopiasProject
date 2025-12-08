# 🖨️ SuperCopias - Sistema de Gestión Integral

> Sistema modular para la gestión completa de negocios de impresión y papelería

[![Angular](https://img.shields.io/badge/Angular-16-red)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)

---

## 📋 Descripción

SuperCopias es un sistema de gestión empresarial desarrollado con tecnologías modernas que permite administrar:

- 👥 **Empleados**: Gestión completa con turnos, puestos y eventos de personal
- 🏢 **Clientes**: CRUD con datos fiscales y direcciones múltiples
- 🏭 **Proveedores**: Catálogo con integración Google Maps
- 📅 **Eventos de Personal**: Vacaciones, faltas, permisos y más
- 🔐 **Autenticación**: Sistema de roles y permisos
- ⚙️ **Administración**: Configuración de módulos y catálogos

---

## 🚀 Inicio Rápido

### Opción 1: Script Automatizado (Recomendado)

**Windows (PowerShell):**
```powershell
# Clonar el repositorio
git clone <url-repositorio>
cd supercopiasProject

# Configurar base de datos
createdb -U postgres supercopias
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
psql -U postgres -d supercopias -f scripts/datos-prueba.sql

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar desarrollo
cd ..
.\start-dev.ps1
```

**macOS/Linux (Bash):**
```bash
# Configurar base de datos
createdb -U postgres supercopias
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
psql -U postgres -d supercopias -f scripts/datos-prueba.sql

# Iniciar desarrollo
cd ..
./start-dev.sh
```

Esto iniciará:
- 🔧 Backend en `http://localhost:3000`
- 🎨 Frontend en `http://localhost:4200`

### Opción 2: Manual

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```

### 🔑 Credenciales de Acceso (Datos de Prueba)

Con el script `datos-prueba.sql` se crean usuarios de prueba:

| Usuario | Contraseña | Role |
|---------|-----------|------|
| `001.robertomar` | `password123` | Admin |
| `002.lauragomez` | `password123` | Empleado |
| `003.carloshern` | `password123` | Empleado |
| `004.anamariarui` | `password123` | Empleado |

---

## 📁 Estructura del Proyecto

```
supercopiasProject/
├── backend/                      # API REST (Node.js + Express)
│   ├── controllers/              # Lógica de negocio
│   ├── routes/                   # Rutas de la API
│   ├── middlewares/              # Auth, roles, etc.
│   ├── utils/                    # Utilidades
│   ├── scripts/                  # Scripts de BD
│   │   ├── datos-prueba.sql      # Datos de prueba
│   │   ├── CHANGELOG.md          # Historial de cambios BD
│   │   └── reload-database.sh    # Script de restauración local
│   ├── BD_SUPERCOPIAS.sql        # Dump completo de BD (UTF-8)
│   └── index.js                  # Punto de entrada
│
├── frontend/                     # Aplicación Angular
│   └── src/app/
│       ├── modules/              # Módulos funcionales
│       │   ├── empleados/
│       │   ├── clientes/
│       │   ├── proveedores/
│       │   └── admin/
│       └── services/             # Servicios HTTP
│
├── start-dev.ps1                 # Script de inicio (Windows)
├── start-dev.sh                  # Script de inicio (macOS/Linux)
├── update-railway-db-env.sh      # Actualizar BD en Railway (macOS/Linux)
├── update-railway-db.ps1         # Actualizar BD en Railway (Windows)
├── docs/                         # Documentación técnica
│   ├── GUIA_ACTUALIZACION_RAILWAY.md
│   ├── REPORTE_SINCRONIZACION_BD.md
│   └── SOLUCION_MODULO_EMPLEADOS.md
└── README.md                     # Este archivo
```

---

## 💻 Stack Tecnológico

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL 15
- **Autenticación**: JWT (jsonwebtoken)
- **Seguridad**: bcryptjs, helmet, cors

### Frontend
- **Framework**: Angular 16
- **UI**: Bootstrap 5
- **Iconos**: FontAwesome
- **Estilos**: SCSS
- **Formularios**: Reactive Forms

---

## 📦 Módulos Implementados

### ✅ Empleados
- CRUD completo
- Asignación de turnos (Matutino/Vespertino)
- Gestión de puestos y sucursales
- Sub-módulo de eventos de personal
- Impresión de fichas

### ✅ Clientes
- CRUD completo
- Importación masiva desde Excel
- Datos fiscales (SAT)
- Direcciones de entrega y facturación
- Validación de RFC

### ✅ Proveedores
- CRUD completo
- Integración Google Maps
- Catálogos de tipos y métodos de pago
- Control de días de crédito
- Búsqueda inteligente

### ✅ Eventos de Personal
- Vacaciones (sistema flexible)
- Faltas (justificadas/injustificadas)
- Permisos por horas
- Otros eventos (capacitaciones, comisiones, etc.)
- Reportes y estadísticas

### ✅ Autenticación y Usuarios
- Login JWT
- Gestión de perfiles
- Sistema de roles
- Cambio de contraseña

---

## 🗄️ Base de Datos

### Características

- **17 tablas** con relaciones completas
- **Catálogos SAT** precargados (regímenes fiscales, CFDI, formas de pago)
- **Triggers** automáticos para auditoría
- **Índices** optimizados para búsquedas
- **Constraints** y validaciones a nivel BD

### Restaurar Base de Datos Local

**Windows:**
```powershell
cd backend\scripts
.\reload-database.sh  # Requiere Git Bash o WSL
```

**macOS/Linux:**
```bash
cd backend/scripts
./reload-database.sh
```

### Actualizar Base de Datos en Railway

**macOS/Linux:**
```bash
./update-railway-db-env.sh
# Selecciona opción 2: Esquema + datos de prueba
```

**Windows:**
```powershell
.\update-railway-db.ps1
# Selecciona opción 2
```

Ver [Guía de Railway](docs/GUIA_ACTUALIZACION_RAILWAY.md) para más detalles.

---

## 🛠️ Desarrollo

### Scripts Disponibles

#### Backend
```bash
npm run dev      # Modo desarrollo con nodemon
npm start        # Modo producción
```

#### Frontend
```bash
npm start        # Desarrollo con proxy
npm run build    # Build de producción
```

#### Proyecto Completo

**Windows:**
```powershell
.\start-dev.ps1           # Iniciar todo
.\start-dev.ps1 -Restart  # Reiniciar servicios
```

**macOS/Linux:**
```bash
./start-dev.sh           # Iniciar todo
```

### Variables de Entorno

Crear `backend/.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supercopias
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_secret_key_segura
NODE_ENV=development
```

---

## 📚 Documentación

Documentos técnicos en la carpeta `docs/`:

- 📋 [Guía de Actualización Railway](docs/GUIA_ACTUALIZACION_RAILWAY.md) - Cómo actualizar la BD en Railway
- 🔄 [Reporte Sincronización BD](docs/REPORTE_SINCRONIZACION_BD.md) - Historial de migraciones
- 👥 [Solución Módulo Empleados](docs/SOLUCION_MODULO_EMPLEADOS.md) - Detalles del módulo de empleados
- 📖 [Documentación Técnica Completa](docs/DOCUMENTACION_TECNICA_COMPLETA.md) - Documentación exhaustiva del sistema
- 📝 [Changelog BD](backend/scripts/CHANGELOG.md) - Cambios en la base de datos

Ver el [índice completo de documentación](docs/README.md).

---

## 🔄 Flujo de Trabajo Git

```
DEV (desarrollo) → QA (pruebas) → main (producción)
```

---

## 🚀 Deployment

### Backend (Railway/Heroku)
```bash
# Variables de entorno en producción
DATABASE_URL=postgresql://...
JWT_SECRET=clave_secreta_produccion
NODE_ENV=production
```

### Frontend (Netlify/Vercel)
```bash
ng build --configuration production
# Deploy carpeta: dist/supercopias-frontend
```

---

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

### Convenciones de Commits

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Documentación
- `style`: Formato de código
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Mantenimiento

---

## 📝 Archivos de Documentación

- `README.md` - Este archivo (overview general del proyecto)
- `docs/` - Documentación técnica y guías específicas
- `backend/scripts/CHANGELOG.md` - Historial de cambios de BD

---

## 📄 Licencia

Copyright © 2025 SuperCopias. Todos los derechos reservados.

---

## 📞 Soporte

Para problemas o preguntas:
- 📖 Consultar documentación en `docs/`
- 🐛 Crear issue en GitHub
- 📧 Contactar al equipo de desarrollo

---

**Última actualización**: 8 de diciembre de 2025  
**Versión**: 1.0.0  
**Desarrollado con**: ❤️ usando Angular + Node.js + PostgreSQL
