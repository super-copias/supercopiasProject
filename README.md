# 🚀 SuperCopias - Sistema de Gestión Integral

Sistema completo con **Angular 16** + **Node.js** + **PostgreSQL**.

---

## ⚡ Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- **Node.js** 18+
- **PostgreSQL** 12+ instalado y corriendo
- **Angular CLI** 16+

### Configuración en 3 Pasos

```bash
# 1. Crear base de datos
psql -U postgres
CREATE DATABASE supercopias;
\q

# 2. Ejecutar schema
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql

# 3. Instalar dependencias
cd ..
npm run install:all
```

### Iniciar Proyecto

**Opción 1 - PowerShell (Recomendado):**
```powershell
.\start.ps1
```

**Opción 2 - NPM:**
```bash
npm start
```

**Opción 3 - Manual (2 terminales):**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start
```

**URLs:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

---

## 📁 Estructura del Proyecto

```
supercopiasProject/
├── backend/              # API REST
│   ├── config/          # DB y configuración
│   ├── controllers/     # Lógica de negocio
│   ├── routes/         # Endpoints del API
│   ├── .env            # Config local (NO subir)
│   └── BD_SUPERCOPIAS.sql  # Schema PostgreSQL
│
├── frontend/            # App Angular
│   ├── src/app/
│   │   ├── modules/    # Módulos (admin, clientes, empleados, etc)
│   │   └── services/   # Servicios HTTP
│   └── proxy.conf.json # Proxy al backend
│
├── start.ps1           # Script inicio rápido
└── package.json        # Scripts del proyecto
```

---

## 🗄️ Base de Datos

**Configuración** (`backend/.env`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=supercopias
```

**Comandos útiles:**
```bash
# Conectarse
psql -U postgres -d supercopias

# Recrear BD
cd backend
npm run db:drop
npm run db:create
npm run setup-db
```

---

## 🔐 Sistema de Empleados y Permisos

### Tipos de Acceso

1. **Sin Permisos** (`solo_lectura`)
   - Solo visualización
   - No hay registros en `empleados_modulos`

2. **Administrador** (`completo`)
   - Acceso total a todos los módulos
   - Se insertan TODOS los módulos con `acceso = true`

3. **Personalizado** (`limitado`)
   - Solo módulos seleccionados
   - Se insertan módulos específicos con `acceso = true`

### Módulos Disponibles
- Dashboard
- Clientes
- Empleados
- Proveedores
- Inventarios
- Punto de Venta
- Reportes
- Equipos
- Operaciones

**Ver más detalles técnicos en:** `backend/README.md`

---

## 📡 API Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Clientes
- `GET /api/clientes` - Listar
- `POST /api/clientes` - Crear
- `PUT /api/clientes/:id` - Actualizar
- `DELETE /api/clientes/:id` - Eliminar
- `POST /api/clientes/import` - Importar Excel

### Empleados
- `GET /api/empleados` - Listar
- `POST /api/empleados` - Crear
- `PUT /api/empleados/:id` - Actualizar
- `DELETE /api/empleados/:id` - Eliminar
- `POST /api/empleados/:id/role` - Asignar rol
- `POST /api/empleados/import` - Importar Excel

### Proveedores
- `GET /api/proveedores` - Listar
- `POST /api/proveedores` - Crear
- `PUT /api/proveedores/:id` - Actualizar
- `DELETE /api/proveedores/:id` - Eliminar

### Catálogos
- `GET /api/catalogos/estados` - Estados de México
- `GET /api/catalogos/roles` - Roles del sistema
- `GET /api/catalogos/regimenes-fiscales` - Regímenes fiscales SAT
- `GET /api/catalogos/usos-cfdi` - Usos de CFDI

**Documentación completa:** `backend/README.md`

---

## 🔄 Flujo de Trabajo (DEV → QA)

### Desarrollo Local (DEV)
1. Hacer cambios en tu rama local
2. Probar localmente
3. Commit y push a rama DEV

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin DEV
```

### Merge a QA (Pruebas)
1. Asegurar que todo funciona localmente
2. Cambiar a rama QA y hacer merge

```bash
git checkout QA
git pull origin QA
git merge DEV
git push origin QA
```

3. Verificar deployment automático en Railway
4. Probar en ambiente QA
5. Regresar a DEV para continuar

```bash
git checkout DEV
```

**⚠️ Checklist pre-merge:**
- [ ] Backend y frontend inician sin errores
- [ ] Todas las funcionalidades funcionan
- [ ] Sin errores en consola
- [ ] `.env` NO está en commits
- [ ] Commits descriptivos

---

## 🛠️ Comandos Útiles

### Proyecto Completo
```bash
npm run install:all    # Instalar todo
npm start              # Iniciar todo
npm run setup          # Setup completo (instalar + DB)
```

### Backend
```bash
cd backend
npm run dev           # Desarrollo con auto-reload
npm run setup-db      # Ejecutar schema SQL
npm run db:create     # Crear base de datos
npm run db:drop       # Eliminar base de datos
```

### Frontend
```bash
cd frontend
npm start            # Desarrollo
npm run build        # Build de producción
npm test            # Tests
```

### Git
```bash
git status                    # Ver cambios
git add .                     # Agregar todos
git commit -m "mensaje"       # Commit
git push origin DEV           # Push a DEV
```

---

## � Solución de Problemas

### Backend no inicia
```bash
# Verificar PostgreSQL
pg_isready

# Revisar .env
cat backend\.env

# Verificar conexión
psql -U postgres -d supercopias
```

### Frontend no conecta
```bash
# Verificar backend en puerto 3000
curl http://localhost:3000

# Revisar proxy
cat frontend\proxy.conf.json
```

### Error de Base de Datos
```bash
# Recrear todo
cd backend
npm run db:drop
npm run db:create
npm run setup-db
```

### Puerto ocupado
```bash
# Ver qué usa el puerto 3000
netstat -ano | findstr :3000

# Matar proceso (reemplazar PID)
taskkill /PID <PID> /F
```

---

## 📝 Variables de Entorno

**Archivo:** `backend/.env` (NO subir a git)

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=supercopias

# Servidor
PORT=3000
NODE_ENV=development

# Seguridad
JWT_SECRET=dev_secret_key_local_2024

# Frontend
FRONTEND_URL=http://localhost:4200
```

**Plantilla:** `backend/.env.example`

---

## 📚 Documentación Adicional

- **API Completo:** `backend/README.md`
- **Deployment QA/Producción:** `DEPLOYMENT.md`

---

## ⚙️ Tecnologías

- **Frontend:** Angular 16, TypeScript, SCSS
- **Backend:** Node.js 18, Express, JWT
- **Base de Datos:** PostgreSQL 12+
- **Herramientas:** Nodemon, Angular CLI, Multer, XLSX

---

## 🚀 Deploy a Producción

Para desplegar en Railway (QA/Producción), ver: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

**¿Listo para desarrollar?** Ejecuta `.\start.ps1` y comienza a trabajar 🎯