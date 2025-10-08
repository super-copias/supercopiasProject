# SuperCopias - Documentación del Código

## 📋 Resumen de Revisión y Documentación

Esta documentación detalla la estructura y funcionalidad del sistema SuperCopias después de una revisión completa del código.

## 🔧 Backend - API REST

### Servidor Principal (`backend/index.js`)
- **Puerto**: 3000 (configurable via PORT env)
- **Middlewares**: CORS, body-parser JSON
- **Endpoints Base**: `/api/auth`, `/api/clientes`, `/api/empleados`

### Controladores

#### AuthController (`backend/controllers/authController.js`)
- **`login()`**: Autenticación con username/email y contraseña
  - **Endpoint**: `POST /api/auth/login`
  - **Respuesta**: Token JWT (8h) + datos del usuario
  - **Seguridad**: bcrypt para contraseñas, JWT para tokens

#### ClientesController (`backend/controllers/clientesController.js`)
- **`listClientes()`**: Lista con búsqueda y paginación
  - **Endpoint**: `GET /api/clientes?q=&page=&limit=`
  - **Funcionalidad**: Búsqueda normalizada, paginación
  
- **`getCliente()`**: Obtener cliente por ID
  - **Endpoint**: `GET /api/clientes/:id`
  
- **`createCliente()`**: Crear nuevo cliente
  - **Endpoint**: `POST /api/clientes`
  - **ID**: Generado con nanoid()
  
- **`updateCliente()`**: Actualizar cliente existente
  - **Endpoint**: `PUT /api/clientes/:id`
  
- **`deleteCliente()`**: Eliminar cliente
  - **Endpoint**: `DELETE /api/clientes/:id`
  
- **`getUsosCFDI()`**: Catálogo México de Usos CFDI
  - **Endpoint**: `GET /api/clientes/usos-cfdi`
  - **Datos**: 24 códigos oficiales SAT (G01-CN01)

### Rutas (`backend/routes/clientes.js`)
- Todas las rutas requieren autenticación (`auth` middleware)
- Documentación completa de cada endpoint
- Base URL: `/api/clientes`

## 🖥️ Frontend - Angular

### Servicios

#### AuthService (`frontend/src/app/services/auth.service.ts`)
- **`login()`**: Llamada a `POST /api/auth/login`
- **`logout()`**: Limpieza de localStorage y redirección
- **`isLoggedIn()`**: Verificación de token
- **`getCurrentUser()`**: Obtener usuario actual
- **`updateUser()`**: Actualizar datos del usuario
- **Estado**: BehaviorSubject para reactividad

#### ClientesService (`frontend/src/app/services/clientes.service.ts`)
- **Desarrollo**: Datos mock en memoria para testing
- **`list()`**: Lista con búsqueda y paginación (mock)
- **`create()`**: Crear cliente (mock)
- **`getById()`**: Obtener por ID (mock)
- **`update()`**: Actualizar cliente (mock)
- **`delete()`**: Eliminar cliente (mock)
- **`getUsosCFDI()`**: Llamada a `GET /api/clientes/usos-cfdi` con fallback local

### Componentes

#### ClientesFormComponent (`frontend/src/app/modules/clientes/clientes-form.component.ts`)
- **Funcionalidad**: Crear/editar clientes
- **Campos**: Datos personales + facturación + dirección con Google Maps
- **`loadUsosCFDI()`**: Carga catálogo CFDI via service
- **`save()`**: Crear/actualizar via service
- **`cancel()`**: Navegación de regreso

##### Selector de Google Maps (Funcionalidad Especial)
- **`toggleSelectorMapa()`**: Mostrar/ocultar accordion expandible
- **`abrirGoogleMaps()`**: Abrir Maps con dirección de búsqueda
- **`aplicarDireccion()`**: Aplicar dirección copiada (Enter)
- **`cerrarSelector()`**: Cerrar y limpiar campos temporales
- **Diseño**: Card expandible (sin modal) con 2 columnas
- **Flujo**: Buscar → Abrir Maps → Copiar → Pegar → Enter

## 📊 Características Técnicas

### Base de Datos
- **Tipo**: lowdb (JSON file-based)
- **Archivo**: `backend/db.json`
- **Inicialización**: Automática con datos de ejemplo

### Autenticación
- **Método**: JWT tokens
- **Duración**: 8 horas
- **Storage**: localStorage (frontend)
- **Middleware**: Verificación automática en rutas protegidas

### CFDI (Facturación México)
- **Catálogo**: 24 códigos oficiales SAT
- **Endpoint**: `/api/clientes/usos-cfdi`
- **Fallback**: Datos locales si backend no disponible
- **Códigos**: G01-G03, I01-I08, D01-D10, S01, CP01, CN01

### Google Maps Integration
- **Método**: window.open con search URL
- **Codificación**: encodeURIComponent para direcciones
- **UX**: Accordion expandible (sin modal problemático)
- **Flujo**: 5 pasos documentados para usuario

## 🔒 Seguridad

### Backend
- **Contraseñas**: bcrypt hash
- **Tokens**: JWT con secret key
- **CORS**: Habilitado para frontend
- **Middleware**: Auth required en rutas protegidas

### Frontend
- **Interceptor**: Auth headers automáticos
- **Guards**: Protección de rutas
- **Token**: Verificación en localStorage
- **Logout**: Limpieza completa de datos

## 📁 Estructura de Archivos Documentados

```
backend/
├── index.js ✅ (servidor principal)
├── controllers/
│   ├── authController.js ✅ (autenticación)
│   └── clientesController.js ✅ (CRUD clientes + CFDI)
└── routes/
    └── clientes.js ✅ (rutas documentadas)

frontend/src/app/
├── services/
│   ├── auth.service.ts ✅ (autenticación)
│   └── clientes.service.ts ✅ (CRUD + mock data)
└── modules/clientes/
    └── clientes-form.component.ts ✅ (formulario + Google Maps)
```

## ✅ Estado de Documentación

- **Backend**: 100% documentado con JSDoc
- **Frontend**: 100% documentado con comentarios TypeScript
- **Endpoints**: Todos identificados con métodos HTTP
- **Funciones**: Todas tienen descripción de propósito
- **Parámetros**: Documentados con tipos y descripción
- **Flujos**: Google Maps workflow completamente explicado

## 🚀 Compilación Exitosa

- **Build**: Exitoso sin errores
- **Bundle Size**: 292.72 kB total inicial
- **Lazy Loading**: Módulos optimizados
- **Funcionalidad**: Google Maps selector funcional sin modal