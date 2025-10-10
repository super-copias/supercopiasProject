# 📋 **Estándar de Comunicación API - SuperCopias**

## 🎯 **Objetivo**

Este documento establece el estándar de comunicación entre el frontend (Angular) y backend (Node.js/Express) para garantizar consistencia, mantenibilidad y escalabilidad en todo el sistema SuperCopias.

---

## 🏗️ **Estructura de Respuestas API**

### ✅ **Respuesta Exitosa Básica**

```json
{
  "success": true,
  "data": {
    // Datos de respuesta
  },
  "message": "Operación exitosa",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ✅ **Respuesta Exitosa con Paginación**

```json
{
  "success": true,
  "data": [
    // Array de elementos
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "pages": 16
  },
  "message": "Lista obtenida exitosamente",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ❌ **Respuesta de Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos proporcionados son inválidos",
    "details": {
      "field": "email",
      "reason": "Formato de email inválido"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔑 **Campos Estándar de Entidades**

### 📝 **Campos Obligatorios (TODAS las entidades)**

```typescript
interface BaseEntity {
  id: string;                    // Formato: PREFIX_XXXXXX
  activo: boolean;               // Estado activo/inactivo
  fechaRegistro: string;         // ISO 8601 timestamp
  fechaModificacion: string | null; // ISO 8601 timestamp o null
}
```

### 🏷️ **Prefijos de ID por Entidad**

| Entidad | Prefijo | Ejemplo |
|---------|---------|---------|
| Usuarios | `USR_` | `USR_abc123def` |
| Clientes | `CLI_` | `CLI_xyz789ghi` |
| Empleados | `EMP_` | `EMP_jkl456mno` |
| Proveedores | `PRV_` | `PRV_pqr123stu` |
| Productos | `PRD_` | `PRD_vwx789yzab` |
| Pedidos | `PED_` | `PED_cde456fgh` |
| Facturas | `FAC_` | `FAC_ijk789lmn` |

---

## 📊 **Operaciones CRUD Estándar**

### 📋 **1. Listar Entidades (GET /api/{entidad})**

**Request:**
```
GET /api/clientes?page=1&limit=10&q=búsqueda&includeInactive=false
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "CLI_abc123",
      "nombre": "Empresa XYZ",
      "rfc": "EXY123456789",
      "email": "contacto@empresa.com",
      "activo": true,
      "fechaRegistro": "2024-01-15T10:30:00.000Z",
      "fechaModificacion": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 🔍 **2. Obtener Entidad por ID (GET /api/{entidad}/{id})**

**Request:**
```
GET /api/clientes/CLI_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "CLI_abc123",
    "nombre": "Empresa XYZ",
    "rfc": "EXY123456789",
    "email": "contacto@empresa.com",
    "activo": true,
    "fechaRegistro": "2024-01-15T10:30:00.000Z",
    "fechaModificacion": null
  },
  "message": "Cliente encontrado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ➕ **3. Crear Entidad (POST /api/{entidad})**

**Request:**
```json
{
  "nombre": "Nueva Empresa",
  "rfc": "NUE123456789",
  "email": "info@nuevaempresa.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "CLI_def456",
    "nombre": "Nueva Empresa",
    "rfc": "NUE123456789",
    "email": "info@nuevaempresa.com",
    "activo": true,
    "fechaRegistro": "2024-01-15T10:30:00.000Z",
    "fechaModificacion": null
  },
  "message": "Cliente creado exitosamente",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ✏️ **4. Actualizar Entidad (PUT /api/{entidad}/{id})**

**Request:**
```json
{
  "email": "nuevo@email.com",
  "telefono": "555-0123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "CLI_abc123",
    "nombre": "Empresa XYZ",
    "rfc": "EXY123456789",
    "email": "nuevo@email.com",
    "telefono": "555-0123",
    "activo": true,
    "fechaRegistro": "2024-01-15T10:30:00.000Z",
    "fechaModificacion": "2024-01-15T11:45:00.000Z"
  },
  "message": "Cliente actualizado exitosamente",
  "timestamp": "2024-01-15T11:45:00.000Z"
}
```

### 🗑️ **5. Eliminar Entidad (DELETE /api/{entidad}/{id})**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "CLI_abc123",
    "activo": false
  },
  "message": "Cliente desactivado exitosamente",
  "timestamp": "2024-01-15T11:50:00.000Z"
}
```

---

## 🚨 **Códigos de Error Estándar**

### 🔍 **Validación y Datos**

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `VALIDATION_ERROR` | Datos de entrada inválidos | 400 |
| `REQUIRED_FIELD` | Campo requerido faltante | 400 |
| `INVALID_FORMAT` | Formato de datos incorrecto | 400 |

### 🎯 **Recursos**

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `NOT_FOUND` | Recurso no encontrado | 404 |
| `ALREADY_EXISTS` | El recurso ya existe | 400 |
| `DEPENDENCY_ERROR` | El recurso tiene dependencias | 400 |

### 🔐 **Autenticación y Autorización**

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `UNAUTHORIZED` | No autorizado | 401 |
| `FORBIDDEN` | Acceso denegado | 403 |
| `TOKEN_EXPIRED` | Token expirado | 401 |

### ⚠️ **Servidor y Red**

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `INTERNAL_ERROR` | Error interno del servidor | 500 |
| `DATABASE_ERROR` | Error de base de datos | 500 |
| `FILE_ERROR` | Error procesando archivo | 500 |
| `NETWORK_ERROR` | Error de conexión | 0 |

---

## 🛠️ **Implementación en Backend**

### 📂 **Estructura de Archivos**

```
backend/
├── utils/
│   └── apiStandard.js         # Helpers para respuestas estándar
├── controllers/
│   ├── authController.js      # Login y autenticación
│   ├── clientesController.js  # CRUD clientes
│   └── empleadosController.js # CRUD empleados
├── middlewares/
│   ├── auth.js               # Verificación de JWT
│   └── roles.js              # Control de acceso por roles
└── routes/
    ├── auth.js               # Rutas de autenticación
    ├── clientes.js           # Rutas de clientes
    └── empleados.js          # Rutas de empleados
```

### 🔧 **Uso de Helpers**

```javascript
const { 
  createResponse, 
  createPaginatedResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

// Respuesta exitosa
res.json(createResponse(true, data, 'Operación exitosa'));

// Respuesta paginada
res.json(createPaginatedResponse(items, page, limit, total));

// Respuesta de error
res.status(400).json(
  createErrorResponse(
    CODIGOS_ERROR.VALIDATION_ERROR,
    'Datos inválidos'
  )
);
```

---

## 🅰️ **Implementación en Frontend**

### 📂 **Estructura de Servicios**

```
frontend/src/app/services/
├── base-http.service.ts           # Servicio base con métodos CRUD
├── standard-api.interceptor.ts    # Interceptor para manejo estándar
├── auth.service.ts                # Autenticación con respuestas estándar
├── clientes.service.ts            # Extiende BaseHttpService
└── empleados.service.ts           # Extiende BaseHttpService
```

### 🔄 **Extender Servicio Base**

```typescript
@Injectable()
export class ClientesService extends BaseHttpService<Cliente> {
  protected baseUrl = '/api/clientes';
  protected mockData: Cliente[] = [
    // Datos mock para desarrollo
  ];

  constructor(http: HttpClient) {
    super(http);
  }

  // Métodos específicos adicionales si son necesarios
  buscarPorRfc(rfc: string): Observable<ApiResponse<Cliente[]>> {
    return this.getList({ rfc });
  }
}
```

### 🎯 **Uso en Componentes**

```typescript
export class ClientesListComponent {
  clientes: Cliente[] = [];
  loading = false;
  error: string | null = null;

  constructor(private clientesService: ClientesService) {}

  cargarClientes(): void {
    this.loading = true;
    this.error = null;

    this.clientesService.getList({ page: 1, limit: 10 })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.clientes = response.data || [];
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Error desconocido';
          this.loading = false;
        }
      });
  }
}
```

---

## 📝 **Interceptor HTTP**

### 🔧 **Configuración en app.module.ts**

```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { StandardApiInterceptor } from './services/standard-api.interceptor';

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: StandardApiInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

### ⚙️ **Funciones del Interceptor**

1. **Añade token JWT automáticamente** a todas las requests
2. **Establece headers estándar** (Content-Type, Accept)
3. **Maneja errores de forma uniforme** con códigos estándar
4. **Redirige al login** cuando la sesión expira (401)
5. **Valida estructura de respuestas** API

---

## 🧪 **Datos Mock para Desarrollo**

### 💡 **Activación de Fallback**

El sistema automáticamente usa datos mock cuando:
- El backend no está disponible (error de red)
- Hay errores 500+ del servidor
- Se configura explícitamente en desarrollo

### 📊 **Estructura Mock**

```typescript
const mockClientes: Cliente[] = [
  {
    id: 'CLI_mock_001',
    nombre: 'Ferretería El Martillo',
    rfc: 'FEM890123ABC',
    email: 'ventas@elmartillo.com',
    telefono: '555-0101',
    activo: true,
    fechaRegistro: '2024-01-01T00:00:00.000Z',
    fechaModificacion: null
  }
];
```

---

## ✅ **Checklist de Implementación**

### 🔧 **Backend**

- [x] ✅ Implementar helpers de respuesta estándar (`apiStandard.js`)
- [x] ✅ Estandarizar controlador de autenticación
- [x] ✅ Estandarizar controlador de clientes
- [x] ✅ Estandarizar controlador de empleados
- [ ] 📋 Aplicar estándar a controladores restantes
- [ ] 📋 Validar todas las rutas siguen el estándar

### 🅰️ **Frontend**

- [x] ✅ Crear servicio base HTTP con métodos CRUD
- [x] ✅ Implementar interceptor estándar
- [x] ✅ Estandarizar servicio de autenticación
- [ ] 📋 Migrar servicio de clientes al estándar
- [ ] 📋 Migrar servicio de empleados al estándar
- [ ] 📋 Configurar interceptor en app.module.ts

### 🧪 **Testing**

- [ ] 📋 Probar respuestas estándar en desarrollo
- [ ] 📋 Validar fallback a datos mock
- [ ] 📋 Verificar manejo de errores
- [ ] 📋 Confirmar funcionalidad de paginación

---

## 🎯 **Beneficios del Estándar**

### 🔄 **Consistencia**
- Todas las respuestas siguen la misma estructura
- Códigos de error unificados en todo el sistema
- Campos obligatorios consistentes entre entidades

### 🚀 **Escalabilidad**
- Fácil añadir nuevos módulos siguiendo el patrón
- Servicios reutilizables en el frontend
- Controladores con estructura predecible

### 🛠️ **Mantenibilidad**
- Manejo centralizado de errores
- Fallback automático a datos mock
- Interceptor maneja comunicación de forma transparente

### 👥 **Desarrollo en Equipo**
- Estándar claro para todos los desarrolladores
- Menos errores por inconsistencias
- Onboarding más rápido para nuevos desarrolladores

---

## 📞 **Soporte y Extensiones**

Para añadir nuevos módulos al sistema:

1. **Backend**: Crear controlador extendiendo el patrón estándar
2. **Frontend**: Crear servicio extendiendo `BaseHttpService`
3. **Entidad**: Seguir estructura con campos obligatorios
4. **Testing**: Usar datos mock con estructura estándar

El estándar está diseñado para crecer con el sistema sin breaking changes.