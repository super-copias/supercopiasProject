# 📚 Documentación Completa - SuperCopias

> Sistema de Gestión Integral para Negocios de Impresión y Papelería

**Versión**: 1.0.0  
**Fecha**: 30 de noviembre de 2025

---

## 📖 Tabla de Contenidos

1. [Inicio Rápido](#-inicio-rápido)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos Implementados](#-módulos-implementados)
4. [Base de Datos](#-base-de-datos)
5. [Scripts y Utilidades](#-scripts-y-utilidades)
6. [Guía de Desarrollo](#-guía-de-desarrollo)
7. [Changelog](#-changelog)

---

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** v16 o superior
- **PostgreSQL** 15.x
- **npm** o **yarn**
- Git

### Instalación

```powershell
# Clonar el repositorio
git clone <url-repositorio>
cd supercopiasProject

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### Configuración de Variables de Entorno

Crear archivo `backend/.env`:

```env
# Puerto del servidor
PORT=3000

# Configuración de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supercopias
DB_USER=postgres
DB_PASSWORD=tu_password

# Seguridad
JWT_SECRET=tu_clave_secreta_super_segura

# Entorno
NODE_ENV=development
```

### Inicializar Base de Datos

```powershell
# Crear la base de datos
createdb -U postgres supercopias

# Restaurar estructura y datos
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS_UTF8.sql
```

### Iniciar Desarrollo

**Opción 1: Script automatizado (Recomendado)**

```powershell
# Desde la raíz del proyecto
.\start-dev.ps1
```

Esto iniciará automáticamente:
- Backend en `http://localhost:3000`
- Frontend en `http://localhost:4200`

**Opción 2: Manual**

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### Acceso al Sistema

- **URL Frontend**: http://localhost:4200
- **URL Backend API**: http://localhost:3000
- **Usuario Admin**: 
  - Username: `admin`
  - Password: `Admin123!$`

### Opciones del Script start-dev.ps1

```powershell
# Reiniciar servicios
.\start-dev.ps1 -Restart

# Solo backend
.\start-dev.ps1 -BackendOnly

# Solo frontend
.\start-dev.ps1 -FrontendOnly

# Ver ayuda
.\start-dev.ps1 -Help
```

---

## 🏗 Arquitectura del Sistema

### Stack Tecnológico

#### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL 15
- **Autenticación**: JWT (jsonwebtoken)
- **Encriptación**: bcryptjs
- **Validaciones**: Express Validator
- **CORS**: cors middleware

#### Frontend
- **Framework**: Angular 16
- **UI**: Bootstrap 5
- **Iconos**: FontAwesome
- **Estilos**: SCSS
- **HTTP**: HttpClient (Angular)
- **Formularios**: Reactive Forms

### Estructura de Directorios

```
supercopiasProject/
├── backend/                    # API REST
│   ├── config/                 # Configuraciones
│   │   └── database.js         # Conexión PostgreSQL
│   ├── controllers/            # Lógica de negocio
│   │   ├── authController.js
│   │   ├── clientesController.js
│   │   ├── empleadosController.js
│   │   ├── proveedoresController.js
│   │   └── eventosPersonalController.js
│   ├── middlewares/            # Middlewares
│   │   ├── auth.js             # Autenticación JWT
│   │   └── roles.js            # Autorización por roles
│   ├── routes/                 # Rutas API
│   │   ├── auth.js
│   │   ├── clientes.js
│   │   ├── empleados.js
│   │   ├── proveedores.js
│   │   └── eventosPersonal.js
│   ├── scripts/                # Scripts de BD
│   │   ├── add-turno-empleados.sql
│   │   ├── insertar-modulos.sql
│   │   ├── restore-database.ps1
│   │   ├── CHANGELOG.md
│   │   └── README.md
│   ├── utils/                  # Utilidades
│   │   ├── apiStandard.js
│   │   ├── catalogosCompletos.js
│   │   └── rolesSystem.js
│   ├── uploads/                # Archivos subidos
│   │   └── profiles/
│   ├── BD_SUPERCOPIAS_UTF8.sql # Dump completo de BD
│   ├── index.js                # Punto de entrada
│   ├── nodemon.json            # Config nodemon
│   └── package.json
│
├── frontend/                   # Aplicación Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── modules/        # Módulos funcionales
│   │   │   │   ├── admin/
│   │   │   │   ├── clientes/
│   │   │   │   ├── empleados/
│   │   │   │   ├── login/
│   │   │   │   ├── profile/
│   │   │   │   └── proveedores/
│   │   │   ├── services/       # Servicios
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── clientes.service.ts
│   │   │   │   ├── empleados.service.ts
│   │   │   │   ├── proveedores.service.ts
│   │   │   │   └── eventos-personal.service.ts
│   │   │   └── shared/         # Componentes compartidos
│   │   ├── assets/
│   │   ├── environments/
│   │   └── styles.scss
│   ├── angular.json
│   ├── package.json
│   └── proxy.conf.json
│
├── start-dev.ps1               # Script de inicio
├── start-dev.sh                # Script de inicio (Linux/Mac)
├── DOCS.md                     # Esta documentación
└── README.md                   # Readme principal
```

### Flujo de Datos

```
Usuario (Browser)
    ↓
Angular Frontend (http://localhost:4200)
    ↓ HTTP Requests
API Backend (http://localhost:3000)
    ↓ SQL Queries
PostgreSQL Database
```

### Seguridad

1. **Autenticación**: JWT tokens en headers `Authorization: Bearer <token>`
2. **Encriptación**: Contraseñas hasheadas con bcrypt (10 rounds)
3. **Autorización**: Middleware de roles y permisos
4. **Validación**: Sanitización de inputs en backend
5. **CORS**: Configurado solo para orígenes permitidos

---

## 📦 Módulos Implementados

### 1. 👥 Módulo de Empleados

**Funcionalidades**:
- CRUD completo de empleados
- Asignación de puestos y sucursales
- Control de turnos (Matutino/Vespertino)
- Gestión de módulos asignados
- Sub-módulo de Eventos de Personal
- Impresión de datos

**Campos principales**:
- Nombre completo
- Email y teléfono
- Puesto y sucursal
- Turno de trabajo
- Salario
- Fecha de ingreso
- Estatus (Activo/Inactivo)
- Días de vacaciones sugeridos

#### Sub-módulo: Eventos de Personal

**Tipos de eventos**:

1. **Vacaciones**
   - Sistema flexible (permite exceder días sugeridos)
   - Días sugeridos configurables por empleado
   - Cálculo automático de días tomados/restantes
   - Advertencias visuales al exceder límite
   - Campo de observaciones

2. **Faltas**
   - Justificadas/Injustificadas
   - Con/Sin goce de sueldo
   - Motivos: Enfermedad, Familiar, Personal

3. **Permisos**
   - Por horas (inicio/fin)
   - Cálculo automático de duración
   - Tipos: Personal, Médico, Trámite, Otro
   - Estado de aprobación

4. **Otros**
   - Capacitaciones
   - Comisiones
   - Suspensiones
   - Licencias
   - Eventos personalizados

**Reportes**:
- Resumen de vacaciones por año
- Estadísticas por tipo de evento
- Filtros por año y tipo

### 2. 🏢 Módulo de Clientes

**Funcionalidades**:
- CRUD completo
- Importación masiva desde Excel
- Validación de RFC único
- Datos fiscales (SAT)
- Direcciones de entrega y facturación separadas
- Impresión de fichas

**Campos principales**:
- RFC y Razón Social
- Nombre comercial
- Email principal y secundario
- Teléfono principal y secundario
- Dirección de entrega (completa)
- Dirección de facturación
- Código postal
- Régimen fiscal
- Uso de CFDI
- Estatus

**Validaciones**:
- Formato de email
- Formato de RFC
- Campos requeridos según tipo

### 3. 🏭 Módulo de Proveedores

**Funcionalidades**:
- CRUD completo
- Catálogos de tipos y métodos de pago
- Integración con Google Maps para direcciones
- Control de días de crédito
- Búsqueda inteligente
- Impresión de fichas

**Campos principales**:
- Nombre comercial y razón social
- RFC
- Tipo (Productos/Servicios/Mixto)
- Contacto principal
- Teléfono y email
- Página web
- Dirección completa (con soporte Maps)
- Método de pago principal
- Cuenta bancaria/CLABE
- Días de crédito
- Notas internas
- Estatus

**Catálogos**:
- Tipos: Productos, Servicios, Mixto
- Métodos de pago: Efectivo, Transferencia, Cheque, Tarjeta crédito/débito, Otro

**Integración Google Maps**:
1. Botón junto al campo de dirección
2. Panel expandible con:
   - Campo de búsqueda
   - Botón "Abrir Maps"
   - Campo para pegar dirección exacta
3. Aplicación automática al presionar Enter

### 4. 🔧 Módulo de Equipos

**Funcionalidades**:
- CRUD completo de equipos electrónicos
- Registro de 8 tipos de equipos (Fotocopiadora, Impresora, PC, Laptop, Monitor, Router, Escáner, Otro)
- Características dinámicas según tipo de equipo
- Historial de contadores (impresoras/fotocopiadoras)
- Bitácora de mantenimientos y servicios
- Control de consumibles (toner, cilindros, reveladores)
- **Sistema de mantenimiento preventivo programado** 🆕
- **Alertas automáticas de mantenimientos próximos o vencidos** 🆕
- Filtros por tipo, estatus y cliente
- Asociación con clientes y ubicaciones

**Campos principales**:
- Tipo de equipo
- Marca y modelo
- Número de serie
- Nombre del equipo
- Área/ubicación
- Cliente asignado
- Estatus (Activo, Inactivo, En Reparación, Baja)
- Responsable técnico
- Observaciones

**Mantenimiento Preventivo** 🆕:
- Intervalo de días entre mantenimientos (configurable)
- Fecha de inicio del intervalo
- Días de anticipación para alertas (default: 7)
- Cálculo automático basado en último servicio
- Estados de alerta:
  - **Vencido**: Mantenimiento atrasado
  - **Urgente**: Dentro del período de alerta
  - **Próximo**: Dentro del doble del período de alerta
  - **OK**: Fuera del rango de alerta
- Dashboard de alertas en la vista principal
- Tarjetas visuales con código de colores

**Características específicas**:

1. **Fotocopiadoras/Impresoras**
   - Contador actual
   - Capacidad de bandejas
   - Tipo de consumible
   - Rendimiento estimado del toner

2. **PCs/Laptops**
   - Procesador
   - RAM
   - Almacenamiento
   - Sistema operativo
   - Dirección IP

3. **Monitores**
   - Tamaño en pulgadas
   - Tipo de panel
   - Resolución

**Historiales**:
- **Contador**: Registro cronológico de lecturas para fotocopiadoras/impresoras
- **Mantenimiento**: Bitácora de servicios con descripción, costo y técnico
- **Consumibles**: Control de instalación y próximo cambio
- **Preventivo** 🆕: Vista calculada de próximos mantenimientos y alertas

### 5. 🔐 Módulo de Autenticación

**Funcionalidades**:
- Login con username/password
- Generación de JWT tokens
- Refresh de tokens
- Gestión de perfiles
- Cambio de contraseña
- Subida de foto de perfil

**Roles del sistema**:
- **admin**: Acceso total
- **gerente**: Gestión de módulos asignados
- **empleado**: Acceso limitado

### 6. ⚙️ Módulo de Administración

**Funcionalidades**:
- Gestión de usuarios
- Configuración de módulos
- Gestión de catálogos
- Respaldos de base de datos

---

## 💾 Base de Datos

### Diagrama de Tablas Principales

```
usuarios (17 tablas en total)
├── empleados
│   ├── puestos
│   ├── sucursales
│   ├── empleados_modulos
│   │   └── modulos
│   └── eventos_personal
├── clientes
│   ├── regimenes_fiscales
│   ├── usos_cfdi
│   ├── formas_pago
│   └── metodos_pago
└── proveedores
    ├── cat_tipos_proveedor
    └── cat_metodos_pago_proveedor
```

### Tablas Principales

#### `empleados`
```sql
- id (SERIAL PRIMARY KEY)
- nombre (VARCHAR 255)
- email (VARCHAR 255)
- telefono (VARCHAR 20)
- puesto_id (FK → puestos)
- sucursal_id (FK → sucursales)
- turno (VARCHAR 20) -- 'Matutino' | 'Vespertino'
- salario (DECIMAL 10,2)
- fecha_ingreso (DATE)
- dias_vacaciones_sugeridos (INTEGER DEFAULT 12)
- notas_vacaciones (TEXT)
- activo (BOOLEAN)
- fecha_registro (TIMESTAMP)
- fecha_modificacion (TIMESTAMP)
```

#### `eventos_personal`
```sql
- id (SERIAL PRIMARY KEY)
- empleado_id (FK → empleados)
- tipo_evento (VARCHAR 50) -- 'VACACIONES' | 'FALTA' | 'PERMISO' | 'OTRO'
- fecha_inicio (DATE)
- fecha_fin (DATE)
- dias_totales (INTEGER)
- hora_inicio (TIME)
- hora_fin (TIME)
- horas_totales (DECIMAL 5,2)
- anio (INTEGER)
- motivo (VARCHAR 100)
- observaciones (TEXT)
- aprobado (BOOLEAN)
- con_goce_sueldo (BOOLEAN)
- registrado_por (FK → usuarios)
- fecha_registro (TIMESTAMP)
```

#### `clientes`
```sql
- id (SERIAL PRIMARY KEY)
- rfc (VARCHAR 13)
- razon_social (VARCHAR 500)
- nombre_comercial (VARCHAR 500)
- email (VARCHAR 255)
- segundo_email (VARCHAR 255)
- telefono (VARCHAR 20)
- segundo_telefono (VARCHAR 20)
- direccion_entrega (TEXT)
- direccion_facturacion (TEXT)
- direccion_codigo_postal (VARCHAR 10)
- regimen_fiscal (VARCHAR 10)
- uso_cfdi (VARCHAR 10)
- activo (BOOLEAN)
- fecha_registro (TIMESTAMP)
- fecha_modificacion (TIMESTAMP)
```

#### `proveedores`
```sql
- id (SERIAL PRIMARY KEY)
- nombre_comercial (VARCHAR 500)
- razon_social (VARCHAR 500)
- rfc (VARCHAR 13)
- tipo_proveedor (VARCHAR 50)
- nombre_contacto (VARCHAR 255)
- telefono (VARCHAR 20)
- email (VARCHAR 255)
- pagina_web (VARCHAR 500)
- direccion (TEXT)
- metodo_pago_principal (VARCHAR 100)
- cuenta_bancaria (VARCHAR 50)
- dias_credito (INTEGER DEFAULT 0)
- notas (TEXT)
- activo (BOOLEAN)
- fecha_registro (TIMESTAMP)
- fecha_modificacion (TIMESTAMP)
```

### Catálogos SAT Precargados

- **regimenes_fiscales**: 32 regímenes fiscales del SAT
- **usos_cfdi**: 28 usos de CFDI
- **formas_pago**: 18 formas de pago
- **metodos_pago**: 4 métodos de pago
- **estados**: 32 estados de México

### Índices y Constraints

```sql
-- Índices de búsqueda
CREATE INDEX idx_empleados_nombre ON empleados(nombre);
CREATE INDEX idx_clientes_rfc ON clientes(rfc);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre_comercial);

-- Constraints CHECK
ALTER TABLE empleados ADD CONSTRAINT empleados_turno_check 
  CHECK (turno IN ('Matutino', 'Vespertino'));

ALTER TABLE eventos_personal ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo_evento IN ('VACACIONES', 'FALTA', 'PERMISO', 'OTRO'));
```

### Triggers Automáticos

```sql
-- Actualización automática de fecha_modificacion
CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON empleados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Similar para clientes, proveedores, usuarios
```

---

## 🛠 Scripts y Utilidades

### Scripts de Base de Datos

#### `backend/scripts/restore-database.ps1`

Script PowerShell para restaurar la BD completa:

```powershell
.\restore-database.ps1
```

**Funciones**:
1. Verifica conexión a PostgreSQL
2. Cierra conexiones activas
3. Elimina y recrea la base de datos
4. Restaura desde `BD_SUPERCOPIAS_UTF8.sql`
5. Verifica integridad de datos

#### `backend/scripts/insertar-modulos.sql`

Inserta los módulos del sistema:
- Clientes
- Empleados
- Proveedores
- Administración

#### `backend/scripts/add-turno-empleados.sql`

Migración para agregar campo turno a empleados.

### Archivo Maestro de BD

**`backend/BD_SUPERCOPIAS_UTF8.sql`**

- Dump completo de PostgreSQL
- Codificación UTF-8
- Incluye estructura completa + datos
- 17 tablas con relaciones
- Catálogos SAT precargados
- 5 proveedores de ejemplo
- Usuario admin configurado

### Scripts NPM

#### Backend
```json
{
  "dev": "nodemon index.js",
  "start": "node index.js"
}
```

#### Frontend
```json
{
  "start": "ng serve --proxy-config proxy.conf.json",
  "build": "ng build --configuration production",
  "serve:static": "http-server dist/supercopias-frontend --spa"
}
```

---

## 👨‍💻 Guía de Desarrollo

### Estructura de API Estándar

Todas las respuestas API siguen el formato:

```javascript
{
  "success": true|false,
  "data": {...} | [...],
  "message": "Mensaje descriptivo",
  "error": {...}  // Solo si success = false
}
```

Implementación con `utils/apiStandard.js`:

```javascript
const { createResponse, createErrorResponse } = require('../utils/apiStandard');

// Respuesta exitosa
return res.json(createResponse(true, data, 'Operación exitosa'));

// Respuesta con error
return res.status(400).json(createErrorResponse('CODIGO_ERROR', 'Mensaje'));
```

### Códigos de Error Estándar

```javascript
CODIGOS_ERROR = {
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_DATA: 'INVALID_DATA',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SERVER_ERROR: 'SERVER_ERROR'
}
```

### Convenciones de Código

#### Backend (JavaScript)
- **snake_case** para nombres de columnas de BD
- **camelCase** para variables JavaScript
- Async/await para operaciones asíncronas
- Manejo de errores con try/catch
- Validación de inputs en controladores
- Comentarios descriptivos

#### Frontend (TypeScript)
- **camelCase** para variables y métodos
- **PascalCase** para clases y componentes
- Interfaces para tipado de datos
- Reactive Forms para formularios
- Servicios para lógica de negocio
- Componentes pequeños y reutilizables

### Optimizaciones de Rendimiento

#### Caché en Servicios (shareReplay)

Para evitar llamadas HTTP duplicadas, los servicios implementan caché usando RxJS `shareReplay`:

```typescript
// auth.service.ts - Caché de verificación de token
private verifyTokenCache$: Observable<ApiResponse> | null = null;
private lastVerifyTime = 0;
private readonly CACHE_DURATION = 5000; // 5 segundos

verifyToken(forceRefresh = false): Observable<ApiResponse> {
  const now = Date.now();
  
  // Retornar caché si es válido
  if (!forceRefresh && this.verifyTokenCache$ && 
      (now - this.lastVerifyTime < this.CACHE_DURATION)) {
    return this.verifyTokenCache$;
  }
  
  // Crear nueva petición y cachearla
  this.lastVerifyTime = now;
  this.verifyTokenCache$ = this.http.get(`${this.base}/verify`)
    .pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      // ... manejo de respuesta
    );
  
  return this.verifyTokenCache$;
}
```

**Servicios optimizados con caché**:
- ✅ `AuthService.verifyToken()` - Verificación de token (5s)
- ✅ `EmpleadosService.getPuestos()` - Catálogo de puestos
- ✅ `EmpleadosService.getModulos()` - Catálogo de módulos
- ✅ `CatalogosService` - Todos los catálogos estáticos (estados, regímenes, etc.)

#### Optimización de Guards

**Problema**: Múltiples guards en rutas anidadas causaban 6+ llamadas al mismo endpoint.

**Solución implementada**:
1. Eliminado `canActivateChild` redundante en rutas padre
2. Eliminado guards duplicados en módulos hijo
3. Implementado caché compartido en `AuthService.verifyToken()`

**Configuración optimizada**:
```typescript
// admin.module.ts - ANTES ❌
{
  path: '',
  component: AdminComponent,
  canActivate: [AuthGuard],
  canActivateChild: [AuthGuard], // ❌ Duplicado
  children: [
    { path: 'inventarios', 
      canLoad: [ModuleGuard], 
      canActivateChild: [ModuleGuard] // ❌ Duplicado
    }
  ]
}

// admin.module.ts - DESPUÉS ✅
{
  path: '',
  component: AdminComponent,
  canActivate: [AuthGuard], // ✅ Solo en padre
  children: [
    { path: 'inventarios', 
      canLoad: [ModuleGuard] // ✅ Solo canLoad
    }
  ]
}
```

**Resultado**: Reducción de 6 llamadas a 1 llamada HTTP por navegación.

#### Buenas Prácticas

1. **Usar caché para datos estáticos**: Catálogos, configuraciones
2. **shareReplay con refCount: true**: Libera memoria cuando no hay suscriptores
3. **Limpiar caché en errores**: Evitar datos obsoletos
4. **Guards mínimos**: Solo donde sea estrictamente necesario
5. **Verificar en consola**: Usar `HttpLoggerInterceptor` para detectar duplicados

### Mapeo snake_case ↔ camelCase

El backend convierte automáticamente:

```javascript
// BD (snake_case) → API (camelCase)
nombre_comercial → nombreComercial
fecha_registro → fechaRegistro

// API recibe camelCase y guarda en snake_case
req.body.nombreComercial → INSERT INTO ... nombre_comercial
```

### Crear Nuevo Módulo

1. **Base de Datos**:
```sql
CREATE TABLE nombre_tabla (
  id SERIAL PRIMARY KEY,
  campo VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  fecha_registro TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);
```

2. **Backend Controller** (`controllers/nombreController.js`):
```javascript
exports.list = async (req, res) => {
  try {
    const result = await query('SELECT * FROM tabla WHERE activo = true');
    return res.json(createResponse(true, result.rows, 'Registros obtenidos'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('SERVER_ERROR', error.message));
  }
};
```

3. **Backend Routes** (`routes/nombre.js`):
```javascript
const router = require('express').Router();
const controller = require('../controllers/nombreController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, controller.list);
router.post('/', authenticateToken, controller.create);

module.exports = router;
```

4. **Frontend Service** (`services/nombre.service.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class NombreService extends BaseHttpService {
  private apiUrl = `${this.baseUrl}/api/nombre`;

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
```

5. **Frontend Component**:
```typescript
@Component({
  selector: 'app-nombre',
  templateUrl: './nombre.component.html'
})
export class NombreComponent implements OnInit {
  constructor(private service: NombreService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.service.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.data = response.data;
        }
      }
    });
  }
}
```

### Testing

#### Backend (Jest)
```javascript
describe('Clientes Controller', () => {
  test('debe crear un cliente', async () => {
    // Test implementation
  });
});
```

#### Frontend (Jasmine/Karma)
```typescript
describe('ClientesService', () => {
  it('should fetch clientes', () => {
    // Test implementation
  });
});
```

### Deployment

#### Backend (Railway/Heroku)
```bash
# Variables de entorno en producción
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
```

#### Frontend (Netlify/Vercel)
```bash
# Build
ng build --configuration production

# Archivos necesarios
dist/supercopias-frontend/_redirects
dist/supercopias-frontend/.htaccess
```

---

## 📋 Changelog

### [2025-11-30] - Módulo de Proveedores Completado

**Base de Datos**:
- ✅ Tabla `proveedores` con dirección única
- ✅ Catálogos: `cat_tipos_proveedor`, `cat_metodos_pago_proveedor`
- ✅ 5 proveedores de ejemplo insertados

**Backend**:
- ✅ Controlador con CRUD completo
- ✅ Endpoints de catálogos (getTipos, getMetodosPago)
- ✅ Conversión automática de claves a descripciones (SERVICIOS → Servicios)
- ✅ Validación de RFC único

**Frontend**:
- ✅ Componente de lista con búsqueda y paginación
- ✅ Formulario multi-sección con validaciones
- ✅ Modal de detalles con impresión
- ✅ Integración Google Maps para direcciones
- ✅ Conversión bidireccional de catálogos

**Archivos**:
- `backend/controllers/proveedoresController.js`
- `backend/routes/proveedores.js`
- `frontend/src/app/modules/proveedores/*`
- `frontend/src/app/services/proveedores.service.ts`

### [2025-11-26] - Eventos de Personal Implementado

**Base de Datos**:
- ✅ Tabla `eventos_personal` creada
- ✅ Campos agregados a `empleados`: `dias_vacaciones_sugeridos`, `notas_vacaciones`
- ✅ Vista `vacaciones_resumen`

**Backend**:
- ✅ Controlador `eventosPersonalController.js`
- ✅ Endpoints: list, create, update, delete, estadísticas
- ✅ Rutas integradas en `/api/empleados/:id/eventos`

**Frontend**:
- ✅ Servicio `eventos-personal.service.ts`
- ✅ Componente principal `eventos-personal.component.ts`
- ✅ Modal de formulario con 4 tipos de eventos
- ✅ Formularios especializados: Vacaciones, Faltas, Permisos, Otros
- ✅ Integración en tab de detalle de empleados

**Características**:
- Sistema flexible de vacaciones (permite exceder días sugeridos)
- Cálculo automático de días/horas
- Advertencias visuales
- Resumen estadístico por año

### [2025-11-26] - Campo Turno en Empleados

**Base de Datos**:
- ✅ Columna `turno` agregada (VARCHAR 20, NOT NULL)
- ✅ Constraint CHECK: 'Matutino' | 'Vespertino'
- ✅ Valor por defecto: 'Matutino'

**Backend**:
- ✅ Campo incluido en create, update, get

**Frontend**:
- ✅ Select en formulario
- ✅ Columna en tabla
- ✅ Campo en modal de detalle
- ✅ Incluido en impresión

**Script**: `backend/scripts/add-turno-empleados.sql`

### [2025-11-30] - Módulo de Gestión de Equipos

**Base de Datos**:
- ✅ Tabla `equipos` - Datos generales de equipos electrónicos
- ✅ Tabla `equipos_caracteristicas` - Características específicas (JSON flexible)
- ✅ Tabla `equipos_historial_contador` - Historial de lecturas de contador
- ✅ Tabla `equipos_mantenimiento` - Historial de servicios y mantenimientos
- ✅ Tabla `equipos_consumibles` - Control de consumibles instalados
- ✅ Índices optimizados para búsqueda y filtrado

**Backend**:
- ✅ Controlador `equiposController.js` con CRUD completo
- ✅ Rutas en `/api/equipos` con autenticación
- ✅ Endpoints para historial de contador, mantenimiento y consumibles
- ✅ Filtros por tipo, estatus, cliente y búsqueda de texto
- ✅ Endpoint de estadísticas generales
- ✅ Estándar API aplicado a todas las respuestas

**Frontend**:
- ✅ Servicio `equipos.service.ts` con tipado completo
- ✅ Módulo lazy-loaded en `/admin/equipos`
- ✅ Componente de listado con filtros y paginación
- ✅ Formulario dinámico según tipo de equipo
- ✅ Vista de detalle con tabs para información, contador, mantenimiento y consumibles
- ✅ Formularios inline para agregar registros de historial
- ✅ UI consistente con Bootstrap 5 y FontAwesome

**Características**:
- 📋 Gestión de 8 tipos de equipos: Fotocopiadora, Impresora, PC, Laptop, Monitor, Router, Escáner, Otro
- 🔧 Campos específicos según tipo (contador para impresoras, especificaciones para PCs, etc.)
- 📊 Historial cronológico de contadores para fotocopiadoras/impresoras
- 🛠️ Bitácora completa de mantenimientos con costos y técnicos
- 🖨️ Control de consumibles (toner, cilindros, reveladores)
- 🏷️ Asociación con clientes y ubicaciones
- 🔄 Estatus: Activo, Inactivo, En Reparación, Dado de Baja

**Permisos**:
- Módulo `equipos` integrado en sistema de roles
- CRUD disponible para administradores y gestores de inventarios

### [2025-12-04] - Módulo de Inventarios y Reglas de Stock

**Base de Datos**:
- ✅ Tabla `inventarios` - Gestión completa de artículos (ventas, insumos, genéricos)
- ✅ Tabla `inventarios_categorias` - Categorías personalizadas con campos dinámicos (JSONB)
- ✅ Tabla `inventarios_reglas_stock` - Configuración de umbrales de alertas por artículo
- ✅ Catálogos: `cat_tipos_inventario`, `cat_unidades_medida`, `cat_ubicaciones`
- ✅ Foreign Keys con proveedores, categorías
- ✅ Constraints: CHECK de orden de porcentajes, validaciones de stock
- ✅ Índices optimizados: proveedor_id, categoria_id, tipo, activo

**Backend**:
- ✅ Controlador `inventariosController.js` con CRUD completo
- ✅ Endpoints para gestión de inventarios: list, create, update, delete, detalle
- ✅ Endpoints de catálogos: tipos, unidades, ubicaciones
- ✅ Sistema de alertas: `getAlertas()` con respeto a flags de activación
- ✅ CRUD de categorías personalizadas con validaciones
- ✅ Submódulo de reglas de stock:
  - GET/POST/PUT/DELETE `/api/inventarios/:id/reglas-stock`
  - Dual-mode calculation (con/sin stock_maximo)
  - Validaciones triple capa (BD, Backend, Frontend)
- ✅ Queries optimizados con LEFT JOIN para reglas personalizadas
- ✅ Cálculo dinámico de nivel_stock según reglas configuradas

**Frontend**:
- ✅ Módulo lazy-loaded en `/admin/inventarios`
- ✅ Servicio `inventarios.service.ts` con interfaces completas
- ✅ Componente de listado con filtros por tipo, categoría, nivel de stock
- ✅ Dashboard de alertas de stock bajo/crítico/sobrestock
- ✅ Formulario dinámico con validaciones
- ✅ Vista de detalle con información completa
- ✅ Gestión de categorías personalizadas:
  - Dashboard con contadores por tipo
  - Editor de campos dinámicos (texto, número, fecha, select)
  - Validación de categorías en uso antes de eliminar
- ✅ Componente de reglas de stock (`ReglasStockComponent`):
  - Formulario con selección de modo de cálculo
  - Configuración de 4 niveles: crítico, bajo, normal, sobrestock
  - Vista previa en tiempo real de umbrales calculados
  - Switches para activar/desactivar alertas por nivel
  - Confirmaciones para acciones destructivas
- ✅ UI consistente con estilos corporativos (thead azul con gradiente)

**Características Inventarios**:
- 📦 3 tipos de artículos: Venta, Insumo, Genérico
- 🏷️ Categorías personalizadas con campos dinámicos ilimitados
- 📊 Control de stock con mínimo/máximo configurable
- 💰 Gestión de precios (compra, venta, descuentos)
- 📍 Ubicación física en almacén
- 🔗 Asociación con proveedores
- ⚠️ Sistema de alertas de stock (3 niveles configurables)
- 🔄 Estatus: Activo, Inactivo

**Características Reglas de Stock**:
- 🎯 Configuración personalizada por artículo
- 📐 Dual-mode calculation:
  - Modo 1: Porcentaje del rango (min-max) - Recomendado
  - Modo 2: Porcentaje sobre mínimo
- 🔔 Control granular de alertas (3 flags independientes)
- 🔙 Backward compatible: artículos sin reglas usan defaults del sistema (10%)
- 📈 Vista previa en tiempo real de umbrales calculados
- ✅ Triple validación: BD CHECK constraints + Backend + Frontend
- 🗑️ Eliminación de reglas para volver a defaults del sistema

**Defaults del Sistema**:
- Nivel crítico: 0% (stock < mínimo)
- Nivel bajo: 10% sobre mínimo
- Nivel normal: 30% sobre mínimo
- Usar stock_maximo: true
- Todas las alertas activas excepto sobrestock

**Scripts**:
- `backend/scripts/add-inventarios-module.sql` - Migración de inventarios
- `backend/scripts/add-reglas-stock.sql` - Migración de reglas de stock
- `backend/scripts/update-categorias-personalizadas.sql` - Actualización de categorías

**Archivos**:
- `backend/controllers/inventariosController.js`
- `backend/routes/inventarios.js`
- `frontend/src/app/modules/admin/inventarios/*`
- `frontend/src/app/services/inventarios.service.ts`

### [2025-11-24] - Segundo Email en Clientes

**Base de Datos**:
- ✅ Columna `segundo_email` (VARCHAR 255, NULL)
- ✅ Constraint de validación de formato

**Backend**:
- ✅ Mapeo en todas las operaciones

**Frontend**:
- ✅ Campo en formulario
- ✅ Mostrado en detalles
- ✅ Incluido en impresión

### [2025-11-18] - Segundo Teléfono en Clientes

**Base de Datos**:
- ✅ Columna `segundo_telefono` (VARCHAR 20, NULL)

**Backend/Frontend**:
- ✅ Integración completa

### [2025-11-11] - Direcciones de Clientes Actualizadas

**Cambios**:
- ✅ Dirección de entrega y facturación separadas
- ✅ Campo único de texto para cada dirección
- ✅ Código postal separado
- ✅ Eliminada estructura multi-campo

### [2025-11-11] - RFC No Único en Clientes

**Cambios**:
- ❌ Eliminada restricción UNIQUE en RFC
- ✅ Índice normal para búsquedas
- ✅ Validaciones removidas del backend

### [Inicial] - Creación del Sistema

**Tablas Base**:
- usuarios, empleados, clientes, proveedores
- modulos, empleados_modulos
- sucursales, puestos
- auditoria

**Catálogos SAT**:
- regimenes_fiscales (32)
- usos_cfdi (28)
- formas_pago (18)
- metodos_pago (4)
- estados (32)

**Funcionalidades**:
- Autenticación JWT
- CRUD de módulos principales
- Sistema de roles y permisos
- Triggers y auditoría

---

## 📞 Soporte y Contribución

### Reportar Problemas

1. Verificar que el issue no exista
2. Crear issue con:
   - Descripción clara
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica

### Contribuir

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request con descripción detallada

### Convenciones de Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
docs: Cambios en documentación
style: Formato, espacios (no afecta código)
refactor: Refactorización de código
test: Agregar o actualizar tests
chore: Mantenimiento, dependencias
```

---

## 📄 Licencia

Copyright © 2025 SuperCopias. Todos los derechos reservados.

---

**Última actualización**: 30 de noviembre de 2025  
**Mantenido por**: Equipo de Desarrollo SuperCopias
