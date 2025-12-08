# Solución - Problemas del Módulo de Empleados

## Fecha: 8 de diciembre de 2025

## Problemas Identificados

### 1. **Catálogos no se cargan en el formulario de nuevo empleado**

#### Causa Raíz:
- Los datos en las tablas `puestos` y `sucursales` tienen valores literales `'CURRENT_TIMESTAMP'` en lugar de timestamps reales
- Esto puede causar problemas al parsear las fechas en el frontend

#### Solución Aplicada:
1. Creado script `/backend/scripts/fix-catalogos-empleados.sql` que:
   - Actualiza los timestamps incorrectos
   - Inserta/actualiza datos de prueba en `puestos` y `sucursales`
   - Verifica las relaciones con la tabla `empleados`
   - Inserta módulos del sistema si no existen

### 2. **Logs de depuración en el componente**

#### Cambio Aplicado:
- Agregados `console.log()` en el método `loadCatalogos()` del componente `empleados-form.component.ts`
- Esto permite verificar en la consola del navegador si los catálogos se están cargando correctamente

```typescript
console.log('Módulos cargados:', modulos);
console.log('Sucursales cargadas:', response);
console.log('Puestos cargados:', response);
```

### 3. **Validación del campo turno en el backend**

#### Problema:
- El campo `turno` es `NOT NULL` en la BD pero no tenía validación estricta en el controlador
- Podría aceptar valores inválidos o usar 'Matutino' como fallback

#### Solución Aplicada:
- Agregada validación en `createEmpleado()` para asegurar que `turno` sea obligatorio
- Agregada validación para que solo acepte valores 'Matutino' o 'Vespertino'
- Eliminado el fallback a 'Matutino' para forzar que el frontend siempre envíe el valor

```javascript
// Validaciones requeridas
if (!nombre || !puesto || !sucursal || !turno) {
  return res.status(400).json(
    createErrorResponse(
      CODIGOS_ERROR.REQUIRED_FIELD,
      'Nombre, puesto, sucursal y turno son requeridos'
    )
  );
}

// Validar que el turno sea válido
if (turno && !['Matutino', 'Vespertino'].includes(turno)) {
  return res.status(400).json(
    createErrorResponse(
      CODIGOS_ERROR.VALIDATION_ERROR,
      'El turno debe ser "Matutino" o "Vespertino"'
    )
  );
}
```

## Mapeo de Campos - BD ↔ Backend ↔ Frontend

### Tabla empleados (BD)
| Campo BD | Tipo | Backend | Frontend |
|----------|------|---------|----------|
| `puesto_id` | INTEGER | `puesto` | `puesto` |
| `sucursal_id` | INTEGER | `sucursal` | `sucursal` |
| `turno` | VARCHAR(20) | `turno` | `turno` |
| `salario` | NUMERIC(10,2) | `salario` | `salario` |
| `fecha_ingreso` | DATE | `fechaIngreso` | `fechaIngreso` |
| `dias_vacaciones_sugeridos` | INTEGER | `diasVacacionesSugeridos` | `diasVacacionesSugeridos` |
| `tipo_acceso` | VARCHAR(50) | `tipoAcceso` | `tipoPermiso` |
| `activo` | BOOLEAN | `activo` | `activo` |
| `fecha_baja` | DATE | `fechaBaja` | `fechaBaja` |

### Catálogo puestos
```sql
SELECT id, nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion
FROM puestos WHERE activo = true ORDER BY nombre
```

**Backend response:**
```javascript
{
  success: true,
  data: [{
    id: 1,
    nombre: 'Gerente General',
    descripcion: '...',
    salario_minimo: 15000.00,
    salario_maximo: 25000.00,
    activo: true,
    fecha_creacion: '2025-12-08T...'
  }]
}
```

**Frontend mapping (CatalogosService):**
```typescript
{
  id: puesto.id,
  nombre: puesto.nombre,
  descripcion: puesto.descripcion,
  salarioMinimo: parseFloat(puesto.salario_minimo) || 0,
  salarioMaximo: parseFloat(puesto.salario_maximo) || 0,
  activo: puesto.activo,
  fechaCreacion: puesto.fecha_creacion
}
```

### Catálogo sucursales
```sql
SELECT id, nombre, direccion, telefono, gerente, activa, fecha_creacion
FROM sucursales WHERE activa = true ORDER BY nombre
```

**Backend response:**
```javascript
{
  success: true,
  data: [{
    id: 1,
    nombre: 'Sucursal Principal',
    direccion: 'Av. Principal #123',
    telefono: '555-1234',
    gerente: 'Juan Pérez',
    activa: true,
    fecha_creacion: '2025-12-08T...'
  }]
}
```

**Frontend mapping (CatalogosService):**
```typescript
{
  id: sucursal.id,
  nombre: sucursal.nombre,
  direccion: sucursal.direccion,
  telefono: sucursal.telefono,
  gerente: sucursal.gerente,
  activa: sucursal.activa,
  fechaCreacion: sucursal.fecha_creacion
}
```

## Pasos para Verificar la Solución

### 1. Ejecutar el script SQL de corrección
```bash
# Conectarse a la base de datos
psql -U postgres -d supercopias

# Ejecutar el script
\i /Users/jhonatan/Documents/Desarrollo/supercopiasProject/backend/scripts/fix-catalogos-empleados.sql
```

### 2. Verificar los datos en la BD
```sql
-- Ver puestos
SELECT id, nombre, activo FROM puestos WHERE activo = true;

-- Ver sucursales
SELECT id, nombre, activa FROM sucursales WHERE activa = true;

-- Ver módulos
SELECT id, clave, nombre, activo FROM modulos WHERE activo = true ORDER BY orden;
```

### 3. Reiniciar el backend
```bash
cd backend
npm run dev
```

### 4. Verificar en el navegador
1. Abrir la consola del navegador (F12)
2. Ir a la página de nuevo empleado
3. Verificar en la consola los logs:
   ```
   Módulos cargados: [...]
   Sucursales cargadas: {success: true, data: [...]}
   Puestos cargados: {success: true, data: [...]}
   ```

4. Verificar que los selectores de Puesto y Sucursal tengan opciones disponibles

### 5. Probar creación de empleado
1. Llenar todos los campos requeridos:
   - Nombre completo
   - Teléfono
   - Puesto (seleccionar del dropdown)
   - Sucursal (seleccionar del dropdown)
   - Turno (Matutino o Vespertino)
   - Salario
   - Fecha de Ingreso

2. Seleccionar tipo de acceso (Sin Permisos, Administrador o Personalizado)

3. Hacer clic en "Guardar"

4. Verificar que no haya errores en la consola

## Archivos Modificados

### Backend
1. `/backend/controllers/empleadosController.js`
   - Agregada validación para campo `turno`
   - Mejorada validación de campos requeridos

### Frontend
1. `/frontend/src/app/modules/empleados/empleados-form.component.ts`
   - Agregados logs de depuración en `loadCatalogos()`
   - Mejorado manejo de errores

### Scripts
1. `/backend/scripts/fix-catalogos-empleados.sql` (NUEVO)
   - Script de corrección y verificación de datos

## Notas Adicionales

### Restricciones de la BD
- `turno` es NOT NULL y solo acepta: 'Matutino' o 'Vespertino'
- `puesto_id` y `sucursal_id` son opcionales pero recomendados
- `email` debe ser único si se proporciona
- `fecha_baja` es requerida cuando `activo = false`

### Endpoints Relacionados

#### Catálogos
- `GET /api/catalogos/puestos` - Obtener puestos
- `GET /api/catalogos/sucursales` - Obtener sucursales
- `GET /api/catalogos/modulos` - Obtener módulos

#### Empleados (usados también por el componente)
- `GET /api/empleados/puestos` - Endpoint alternativo (delegado a catálogos)
- `GET /api/empleados/modulos` - Endpoint alternativo (delegado a catálogos)
- `POST /api/empleados` - Crear nuevo empleado

## Próximos Pasos

1. ✅ Ejecutar el script SQL de corrección
2. ✅ Verificar que los catálogos se carguen correctamente
3. ✅ Probar la creación de un empleado de prueba
4. 🔲 Verificar que la edición de empleados funcione correctamente
5. 🔲 Verificar que la asignación de módulos funcione correctamente
6. 🔲 Verificar que la creación de usuarios asociados funcione

## Contacto para Soporte
Si persisten los problemas después de aplicar estas correcciones, revisar:
1. Logs del backend en la terminal
2. Logs del frontend en la consola del navegador (F12)
3. Network tab para ver las respuestas exactas de las APIs
