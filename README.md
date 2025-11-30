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

```powershell
# Clonar el repositorio
git clone <url-repositorio>
cd supercopiasProject

# Configurar base de datos
createdb -U postgres supercopias
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS_UTF8.sql

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Iniciar desarrollo
cd ..
.\start-dev.ps1
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

### 🔑 Credenciales de Acceso

- **Usuario**: `admin`
- **Contraseña**: `Admin123!$`

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
│   │   ├── CHANGELOG.md          # Historial de cambios BD
│   │   └── restore-database.ps1  # Script de restauración
│   ├── BD_SUPERCOPIAS_UTF8.sql   # Dump completo de BD
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
├── start-dev.ps1                 # Script de inicio
├── DOCS.md                       # Documentación completa
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

### Restaurar Base de Datos

```powershell
# Windows
cd backend\scripts
.\restore-database.ps1

# Linux/Mac
psql -U postgres -d supercopias -f backend/BD_SUPERCOPIAS_UTF8.sql
```

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
```powershell
.\start-dev.ps1           # Iniciar todo
.\start-dev.ps1 -Restart  # Reiniciar servicios
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

Para documentación completa, consulta [DOCS.md](./DOCS.md):

- 🚀 Guía de inicio rápido
- 🏗️ Arquitectura del sistema
- 📦 Módulos detallados
- 💾 Estructura de base de datos
- 👨‍💻 Guía de desarrollo
- 📋 Changelog completo

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

- `README.md` - Este archivo (overview general)
- `DOCS.md` - Documentación técnica completa
- `backend/scripts/CHANGELOG.md` - Historial de cambios de BD
- `backend/scripts/README.md` - Guía de scripts de BD

---

## 📄 Licencia

Copyright © 2025 SuperCopias. Todos los derechos reservados.

---

## 📞 Soporte

Para problemas o preguntas:
- 📖 Consultar [DOCS.md](./DOCS.md)
- 🐛 Crear issue en GitHub
- 📧 Contactar al equipo de desarrollo

---

**Última actualización**: 30 de noviembre de 2025  
**Versión**: 1.0.0  
**Desarrollado con**: ❤️ usando Angular + Node.js + PostgreSQL
