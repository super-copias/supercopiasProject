# � SuperCopias Backend

API REST con Node.js + Express + PostgreSQL.

---

## ⚡ Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar .env (si no existe)
cp .env.example .env

# Iniciar en modo desarrollo
npm run dev
```

El servidor estará en: **http://localhost:3000**

---

## 🗄️ Base de Datos

### Crear la base de datos

```bash
# Crear base de datos
npm run db:create

# Ejecutar schema
npm run setup-db
```

### Comandos útiles

```bash
npm run db:drop     # Eliminar base de datos
npm run setup-db    # Ejecutar schema SQL
```

---

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registro de usuario

### Catálogos
- `GET /api/catalogos/estados` - Estados de México
- `GET /api/catalogos/roles` - Roles del sistema

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente
- `POST /api/clientes/import` - Importar desde Excel

### Empleados
- `GET /api/empleados` - Listar empleados
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `DELETE /api/empleados/:id` - Eliminar empleado
- `POST /api/empleados/import` - Importar desde Excel
- `POST /api/empleados/:id/role` - Asignar rol (admin)

### Proveedores
- `GET /api/proveedores` - Listar proveedores
- `POST /api/proveedores` - Crear proveedor
- `PUT /api/proveedores/:id` - Actualizar proveedor
- `DELETE /api/proveedores/:id` - Eliminar proveedor

### Perfil
- `GET /api/profile` - Obtener perfil del usuario
- `PUT /api/profile` - Actualizar perfil
- `POST /api/profile/photo` - Subir foto de perfil

---

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login`) requieren token JWT:

```
Authorization: Bearer <token>
```

---

## 📁 Estructura

```
backend/
├── config/           # Configuración (DB, etc)
├── controllers/      # Lógica de negocio
├── middlewares/      # Auth, roles, etc
├── routes/           # Definición de rutas
├── utils/           # Utilidades
├── uploads/         # Archivos subidos
├── index.js         # Entrada principal
└── .env             # Variables de entorno (NO subir)
```

---

## 🛠️ Scripts Disponibles

```bash
npm start           # Producción
npm run dev         # Desarrollo con auto-reload
npm run setup-db    # Ejecutar schema SQL
npm run db:create   # Crear base de datos
npm run db:drop     # Eliminar base de datos
```

---

## 📝 Notas

- El archivo `.env` contiene configuración sensible (NO subir a git)
- Para ambiente de producción, usar variables de entorno de Railway
- Los uploads se guardan en `uploads/` (no se suben a git)
