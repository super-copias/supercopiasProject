# Sistema de Roles - SuperCopias

## Descripción General

El sistema de roles implementado en SuperCopias permite gestionar permisos granulares para diferentes usuarios del sistema. Cada empleado puede tener múltiples roles asignados, y cada rol define permisos específicos para diferentes módulos.

## Estructura del Sistema

### Roles Predefinidos

1. **Administrador (`admin`)**
   - Acceso completo a todos los módulos
   - Color: Rojo (#dc3545)

2. **Supervisor (`supervisor`)**
   - Acceso a módulos operativos con permisos de supervisión
   - Color: Naranja (#fd7e14)

3. **Operador (`operador`)**
   - Acceso básico a módulos operativos diarios
   - Color: Verde (#198754)

4. **Cajero (`cajero`)**
   - Acceso limitado al punto de venta y consulta de clientes
   - Color: Azul (#0d6efd)

5. **Gestor de Clientes (`gestor_clientes`)**
   - Especialista en gestión de clientes y relaciones comerciales
   - Color: Violeta (#6f42c1)

6. **Gestor de Inventarios (`gestor_inventarios`)**
   - Especialista en control de inventarios y equipos
   - Color: Verde agua (#20c997)

7. **Gestor de Ventas (`gestor_ventas`)**
   - Especialista en ventas y punto de venta
   - Color: Amarillo (#ffc107)

8. **Contabilidad (`contabilidad`)**
   - Especialista en gestión contable y financiera
   - Color: Gris (#6c757d)

### Módulos del Sistema

- **empleados**: Gestión de empleados
- **clientes**: Gestión de clientes
- **proveedores**: Gestión de proveedores
- **inventarios**: Control de inventarios
- **ventas**: Punto de venta y gestión comercial
- **reportes**: Reportes y análisis
- **configuracion**: Configuración del sistema

### Permisos por Módulo

Cada módulo puede tener los siguientes permisos:
- **crear**: Crear nuevos registros
- **leer**: Ver registros existentes
- **actualizar**: Modificar registros
- **eliminar**: Eliminar registros
- **administrar**: Acceso completo al módulo

## Uso en el Backend

### Crear Empleado con Roles

```javascript
POST /api/empleados
{
  "nombre": "Juan",
  "apellidos": "Pérez",
  "email": "juan@supercopias.com",
  "puesto": "Cajero",
  "roles": ["cajero"],
  "crearUsuario": true
}
```

### Asignar Roles a Empleado Existente

```javascript
POST /api/empleados/:id/assign-roles
{
  "roles": ["cajero", "gestor_clientes"],
  "crearUsuario": false
}
```

### Obtener Catálogo de Roles

```javascript
GET /api/empleados/roles
```

## Uso en el Frontend

### Servicios Disponibles

#### EmpleadosService

```typescript
// Crear empleado con roles
this.empleadosService.create({
  nombre: 'Juan',
  apellidos: 'Pérez',
  roles: ['cajero'],
  crearUsuario: true
}).subscribe(response => {
  console.log('Empleado creado:', response.data.empleado);
  if (response.data.usuario) {
    console.log('Credenciales:', response.data.usuario);
  }
});

// Asignar roles
this.empleadosService.assignRoles('emp_123', {
  roles: ['cajero', 'gestor_clientes'],
  crearUsuario: false
}).subscribe(response => {
  console.log('Roles asignados');
});

// Obtener catálogo de roles
this.empleadosService.getRoles().subscribe(response => {
  this.roles = response.data;
});
```

#### RolesService

```typescript
// Verificar permisos
const hasPermission = this.rolesService.hasPermission(
  ['cajero', 'gestor_clientes'],
  'clientes',
  'crear'
);

// Obtener módulos accesibles
const modules = this.rolesService.getAccessibleModules(['cajero']);

// Validar roles
const validation = this.rolesService.validateRoles(['cajero', 'admin']);
```

### Directivas en Templates

#### Mostrar elemento solo con permisos específicos

```html
<!-- Por módulo y acción -->
<button *appPermiso 
        appPermisoModulo="empleados" 
        appPermisoAccion="crear">
  Crear Empleado
</button>

<!-- Por permiso completo -->
<div *appPermiso="'clientes.leer'">
  Lista de clientes
</div>

<!-- Por roles específicos -->
<div *appRole="'admin'">
  Solo administradores
</div>

<div *appRole="['admin', 'supervisor']">
  Administradores y supervisores
</div>

<!-- Solo administradores -->
<div *appAdminOnly>
  Panel de administración
</div>
```

### Guards en Rutas

```typescript
// En el routing module
const routes: Routes = [
  {
    path: 'empleados',
    component: EmpleadosComponent,
    canActivate: [RolesGuard],
    data: {
      requiredPermission: {
        modulo: 'empleados',
        accion: 'leer'
      }
    }
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [RolesGuard],
    data: {
      requiredRole: 'admin'
    }
  }
];
```

### Utilidades de Permisos

```typescript
import { PermisosUtils, MODULOS, ACCIONES } from '../shared/utils/permisos.utils';

// Verificar permiso específico
const canEdit = PermisosUtils.hasPermission(
  userRoles,
  rolesDefinition,
  MODULOS.EMPLEADOS,
  ACCIONES.ACTUALIZAR
);

// Verificar múltiples permisos
const permissions = PermisosUtils.hasMultiplePermissions(
  userRoles,
  rolesDefinition,
  [
    { modulo: MODULOS.CLIENTES, accion: ACCIONES.LEER },
    { modulo: MODULOS.VENTAS, accion: ACCIONES.CREAR }
  ]
);

// Obtener nivel de acceso
const accessLevel = PermisosUtils.getAccessLevel(userRoles);
```

## Configuración Recomendada por Puesto

### Gerente General
- Roles: `['admin']`
- Acceso: Completo a todos los módulos

### Jefe de Ventas
- Roles: `['supervisor', 'gestor_ventas']`
- Acceso: Supervisión general + especialización en ventas

### Cajero
- Roles: `['cajero']`
- Acceso: Punto de venta y consulta de clientes

### Técnico de Servicio
- Roles: `['operador', 'gestor_inventarios']`
- Acceso: Operaciones + control de inventarios

### Atención al Cliente
- Roles: `['gestor_clientes']`
- Acceso: Gestión completa de clientes

### Contador
- Roles: `['contabilidad']`
- Acceso: Reportes y análisis financiero

## Seguridad

### Buenas Prácticas

1. **Principio de menor privilegio**: Asignar solo los roles mínimos necesarios
2. **Separación de responsabilidades**: Evitar concentrar demasiados permisos
3. **Revisión periódica**: Auditar roles asignados regularmente
4. **Trazabilidad**: Registrar cambios en roles y permisos

### Validaciones

- Todos los endpoints están protegidos por validación de roles
- Los permisos se verifican tanto en frontend como backend
- Los tokens JWT incluyen información de roles actualizados
- Las sesiones expiran automáticamente por seguridad

## Migración y Mantenimiento

### Agregar Nuevo Rol

1. Definir en `backend/utils/rolesSystem.js`
2. Actualizar `frontend/src/app/services/roles.service.ts`
3. Agregar mappings en directivas si es necesario
4. Actualizar documentación

### Modificar Permisos

1. Actualizar definición en `rolesSystem.js`
2. Verificar impacto en guards y directivas
3. Probar con usuarios existentes
4. Comunicar cambios al equipo

### Datos de Prueba

El sistema incluye datos mock para desarrollo y testing con diferentes combinaciones de roles para validar el comportamiento del sistema.