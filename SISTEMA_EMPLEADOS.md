# 📋 Sistema de Gestión de Empleados - SuperCopias

## 🎯 Lógica de Permisos y Módulos

### Reglas de Asignación

1. **Sin Permisos**
   - `tipo_acceso = 'solo_lectura'`
   - NO se insertan registros en `empleados_modulos`
   - Radio button: "Sin Permisos"
   - Módulos: `[]`

2. **Administrador**
   - `tipo_acceso = 'completo'`
   - Se insertan TODOS los módulos con `acceso = true`
   - Radio button: "Administrador"
   - Módulos: `[todos]`

3. **Personalizado**
   - `tipo_acceso = 'limitado'`
   - Se insertan SOLO los módulos seleccionados con `acceso = true`
   - Radio button: "Personalizado"
   - Módulos: `[1 a n-1]`

4. **Conversión Automática**
   - Si Personalizado tiene TODOS los módulos (9/9) → se convierte en Administrador
   - Validación: `modulosPermitidos.length === totalModulos`

---

## 🔄 Flujo de Datos

### Frontend → Backend
```javascript
{
  tipoPermiso: 'personalizado',     // administrador | personalizado | sin_permisos
  modulosPermitidos: [1, 3, 5]      // Array de IDs de módulos
}
```

### Backend → Base de Datos
```javascript
{
  tipo_acceso: 'limitado',          // completo | limitado | solo_lectura
}
// + Registros en empleados_modulos:
// empleado_id | modulo     | acceso
// 20          | dashboard  | true
// 20          | clientes   | true
```

### Base de Datos → Frontend
```javascript
{
  tipoPermiso: 'personalizado',
  modulosPermitidos: ['dashboard', 'clientes']
}
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: `empleados`
```sql
CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  puesto_id INTEGER,
  sucursal_id INTEGER,
  salario DECIMAL(10,2),
  fecha_ingreso DATE,
  activo BOOLEAN DEFAULT true,
  fecha_baja DATE,
  tipo_acceso VARCHAR(20) DEFAULT 'solo_lectura',
  usuario_id INTEGER,
  fecha_registro TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP
);
```

### Tabla: `empleados_modulos`
```sql
CREATE TABLE empleados_modulos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  acceso BOOLEAN DEFAULT false,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);
```

### Tabla: `modulos`
```sql
CREATE TABLE modulos (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  orden INTEGER
);
```

---

## 📝 Queries Importantes

### Verificar módulos de un empleado
```sql
SELECT modulo, acceso 
FROM empleados_modulos 
WHERE empleado_id = 20;
```

### Verificar tipo de acceso
```sql
SELECT id, nombre, tipo_acceso 
FROM empleados 
WHERE id = 20;
```

### Limpiar módulos de un empleado
```sql
DELETE FROM empleados_modulos WHERE empleado_id = 20;
```

### Eliminar empleado completo
```sql
DELETE FROM empleados WHERE id = 20;
-- Esto también elimina automáticamente los registros en empleados_modulos (CASCADE)
```

---

## 🔧 Funciones del Backend

### `createEmpleado()`
**Validaciones:**
1. Convierte `tipoPermiso` → `tipo_acceso`
2. Si personalizado tiene todos los módulos → convierte a administrador
3. Inserta SOLO módulos con `acceso=true` en `empleados_modulos`
4. Crea usuario del sistema si `tipo_acceso` es `completo` o `limitado`

### `updateEmpleado()`
**Proceso:**
1. Valida conversión automática personalizado → administrador
2. Elimina todos los módulos anteriores: `DELETE FROM empleados_modulos`
3. Inserta nuevos módulos con `acceso=true`
4. Crea usuario si no existe y tiene permisos

### `getEmpleado()`
**Retorna:**
1. Consulta `empleados_modulos` para obtener módulos con `acceso=true`
2. Si es administrador (`tipo_acceso='completo'`), retorna TODOS los módulos
3. Convierte `tipo_acceso` → `tipoPermiso` para el frontend
4. Incluye datos de usuario si existe

---

## 🚀 Testing

### Test 1: Sin Permisos
```bash
POST /api/empleados
{
  "nombre": "Test Usuario",
  "puesto": 8,
  "sucursal": 1,
  "tipoPermiso": "sin_permisos"
}
```
**Resultado esperado:**
- `tipo_acceso = 'solo_lectura'`
- 0 registros en `empleados_modulos`

### Test 2: Administrador
```bash
POST /api/empleados
{
  "nombre": "Test Admin",
  "puesto": 8,
  "sucursal": 1,
  "tipoPermiso": "administrador"
}
```
**Resultado esperado:**
- `tipo_acceso = 'completo'`
- 9 registros en `empleados_modulos` (todos con `acceso=true`)

### Test 3: Personalizado
```bash
POST /api/empleados
{
  "nombre": "Test Personalizado",
  "puesto": 8,
  "sucursal": 1,
  "tipoPermiso": "personalizado",
  "modulosPermitidos": ["dashboard", "clientes"]
}
```
**Resultado esperado:**
- `tipo_acceso = 'limitado'`
- 2 registros en `empleados_modulos` (dashboard y clientes con `acceso=true`)

### Test 4: Conversión Automática
```bash
POST /api/empleados
{
  "nombre": "Test Conversion",
  "puesto": 8,
  "sucursal": 1,
  "tipoPermiso": "personalizado",
  "modulosPermitidos": [todos los 9 módulos]
}
```
**Resultado esperado:**
- `tipo_acceso = 'completo'` (convertido automáticamente)
- 9 registros en `empleados_modulos`

---

## 📌 Mapeo Frontend ↔ Backend

| Frontend | Backend | Descripción |
|----------|---------|-------------|
| `administrador` | `completo` | Acceso total |
| `personalizado` | `limitado` | Módulos específicos |
| `sin_permisos` | `solo_lectura` | Sin acceso |

---

## 🛠️ Troubleshooting

### Problema: modulosPermitidos llega vacío al editar
**Solución:** Verificar que:
1. La query `SELECT modulo FROM empleados_modulos WHERE empleado_id = ? AND acceso = true` retorna datos
2. El mapeo en `getEmpleado()` filtra correctamente: `.filter(m => m.acceso)`
3. El frontend recibe el array en `populateForm()`

### Problema: Se insertan todos los módulos en lugar de los seleccionados
**Solución:** Verificar que:
1. Solo se insertan módulos con `acceso=true`
2. El objeto `modulos` solo contiene módulos seleccionados
3. No se está iterando sobre `todosLosModulos` al insertar

### Problema: Usuario no se crea
**Solución:** Verificar que:
1. `tipo_acceso` sea `completo` o `limitado`
2. No exista ya un `usuario_id` asociado
3. Las credenciales se generan correctamente

---

## 📂 Archivos Principales

- `backend/controllers/empleadosController.js` - Controlador principal
- `frontend/src/app/modules/empleados/empleados-form.component.ts` - Formulario
- `frontend/src/app/modules/empleados/empleados-list.component.ts` - Lista
- `frontend/src/app/services/empleados.service.ts` - Servicio HTTP

---

## ✅ Estado Actual

- ✅ Lógica de permisos implementada correctamente
- ✅ Conversión automática personalizado → administrador
- ✅ Inserción selectiva de módulos (solo con acceso=true)
- ✅ Creación automática de usuarios con credenciales
- ✅ Logs de debug eliminados
- ✅ Código limpio y optimizado
- ✅ **CORREGIDO**: Endpoint getModulos() ahora usa `clave` como `id`
- ✅ **CORREGIDO**: Checkboxes de módulos personalizados se marcan correctamente
- ✅ **CORREGIDO**: Modal de detalle muestra nombres de módulos en lugar de IDs

---

## 🔧 Correcciones Recientes

### Problema: Módulos mostraban IDs numéricos en lugar de nombres

**Síntomas:**
- Modal de detalle mostraba "1  3" en lugar de "Dashboard  Clientes"
- Checkboxes no se marcaban al editar empleado con módulos personalizados
- `modulosPermitidos` llegaba como `['1', '3']` en lugar de `['dashboard', 'clientes']`

**Causa raíz:**
- La tabla `empleados_modulos` tenía IDs numéricos (1, 2, 3) guardados en la columna `modulo`
- Debería guardar **claves** ('dashboard', 'clientes', etc.)
- El código actual inserta claves correctamente, pero datos antiguos tenían IDs

**Solución implementada:**

1. **Query mejorada con conversión automática** en `getEmpleado()`:
```javascript
const modulosResult = await query(
  `SELECT 
    CASE 
      WHEN em.modulo ~ '^[0-9]+$' THEN m.clave 
      ELSE em.modulo 
    END as modulo,
    em.acceso 
   FROM empleados_modulos em
   LEFT JOIN modulos m ON em.modulo::text = m.id::text
   WHERE em.empleado_id = $1`,
  [empleadoId]
);
```

Esta query:
- ✅ Detecta si `modulo` es un número (`~ '^[0-9]+$'`)
- ✅ Si es número, hace JOIN con `modulos` para obtener la `clave`
- ✅ Si ya es una clave, la retorna tal cual
- ✅ Funciona con datos antiguos (IDs) y nuevos (claves)

2. **Favicon agregado** (eliminado error 404):
```html
<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,iVBORw0K...">
```

3. **Logs de debug eliminados** del frontend

---

### Migración de Datos (Opcional)

Si quieres limpiar los datos antiguos, ejecuta este script SQL:

```sql
-- Ver módulos con IDs numéricos
SELECT em.empleado_id, em.modulo, m.clave 
FROM empleados_modulos em
LEFT JOIN modulos m ON em.modulo::text = m.id::text
WHERE em.modulo ~ '^[0-9]+$';

-- Actualizar IDs numéricos a claves
UPDATE empleados_modulos em
SET modulo = m.clave
FROM modulos m
WHERE em.modulo::text = m.id::text 
  AND em.modulo ~ '^[0-9]+$';
```

**Nota:** No es necesario ejecutar esto, la query del backend ya maneja ambos casos.
