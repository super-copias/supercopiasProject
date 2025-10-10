# Scripts de Gestión de Clientes

Este directorio contiene scripts para gestionar los datos de clientes en la base de datos.

## Scripts disponibles

### 1. `limpiar-clientes.js` (Limpieza rápida)
Script simple que elimina todos los clientes y crea 2 clientes de prueba.

```bash
# Desde el directorio backend
node scripts/limpiar-clientes.js
```

### 2. `limpiar-inconsistentes.js` (Limpiar estructura)
Script que elimina clientes con estructura de datos inconsistente.

```bash
# Limpiar clientes con estructura incorrecta
node scripts/limpiar-inconsistentes.js
```

### 3. `gestionar-clientes.js` (Gestión avanzada)
Script completo con múltiples opciones para gestionar clientes.

```bash
# Listar todos los clientes
node scripts/gestionar-clientes.js listar

# Crear respaldo de clientes actuales
node scripts/gestionar-clientes.js respaldar

# Restaurar desde respaldo
node scripts/gestionar-clientes.js restaurar

# Eliminar todos los clientes
node scripts/gestionar-clientes.js limpiar

# Limpiar y crear 2 clientes de ejemplo
node scripts/gestionar-clientes.js ejemplos

# Desactivar todos los clientes
node scripts/gestionar-clientes.js desactivar

# Activar todos los clientes
node scripts/gestionar-clientes.js activar
```

## Nuevas funcionalidades

### 🆕 Plantilla Excel de ejemplo
- **Endpoint**: `GET /api/clientes/plantilla-excel`
- **Funcionalidad**: Descarga una plantilla Excel con columnas correctas y datos de ejemplo
- **Acceso**: Botón "Descargar plantilla Excel" en la interfaz de carga masiva

### 🆕 Validaciones mejoradas
#### Campos requeridos:
- **nombre**: Obligatorio, no puede estar vacío
- **telefono**: Obligatorio, formato numérico con caracteres permitidos
- **correo**: Obligatorio, formato de email válido

#### Campos opcionales con validación:
- **rfc**: Formato RFC mexicano válido (si se proporciona)
- **segundoTelefono**: Formato numérico (si se proporciona)

#### Validaciones de duplicados:
- **rfc**: No puede repetirse entre clientes activos
- **email**: No puede repetirse entre clientes activos

## Estructura de cliente actualizada

```json
{
  "id": "CLI_TEST_001",
  "nombre": "Cliente Test 1",           // REQUERIDO
  "telefono": "961-111-1111",          // REQUERIDO
  "segundoTelefono": "",
  "email": "test1@ejemplo.com",        // REQUERIDO
  "direccionEntrega": "Av. Test 123...",
  "razon": "Cliente Test 1 S.A. de C.V.",
  "rfc": "CTE850315T01",               // VALIDADO si se proporciona
  "regimen": "601 - General de...",
  "direccion": "Av. Test 123...",
  "cp": "29000",
  "cfdi": "G01 - Adquisición...",
  "activo": true,
  "fechaRegistro": "2025-10-10T...",
  "fechaModificacion": null
}
```

## Casos de uso

### Para desarrollo y testing
```bash
# Limpiar y crear datos de prueba
node scripts/limpiar-clientes.js
```

### Para mantenimiento
```bash
# Ver estado actual
node scripts/gestionar-clientes.js listar

# Crear respaldo antes de cambios
node scripts/gestionar-clientes.js respaldar

# Limpiar estructura inconsistente
node scripts/limpiar-inconsistentes.js
```

### Para restauración
```bash
# Restaurar desde respaldo
node scripts/gestionar-clientes.js restaurar
```

## Archivos de respaldo

- `db_backup_clientes.json`: Respaldo automático creado por el script gestor
- Incluye timestamp y datos completos de clientes

## Seguridad

- Validaciones en frontend y backend
- Formatos de datos estrictamente validados
- Prevención de duplicados en campos únicos
- Manejo de errores y feedback detallado

## Plantilla Excel

### Columnas requeridas:
1. **nombre** ⭐ (obligatorio)
2. **telefono** ⭐ (obligatorio)  
3. **correo** ⭐ (obligatorio)

### Columnas opcionales:
4. segundo telefono
5. direccion de entrega
6. razon social
7. rfc
8. regimen fiscal
9. direccion
10. codigo postal
11. uso cfdi

La plantilla incluye 3 ejemplos de diferentes tipos de clientes (persona física, persona moral, etc.)