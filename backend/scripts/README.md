# 🚀 Scripts de Migración SuperCopias# Scripts del Backend - SuperCopias# Scripts de Gestión de Clientes



## Scripts Esenciales



### 1. `install-postgresql.js` Este directorio contiene el script de inicialización del sistema.Este directorio contiene scripts para gestionar los datos de clientes en la base de datos.

**Instala y configura PostgreSQL completo**

```bash

node scripts/install-postgresql.js

```## Script Disponible## Scripts disponibles



### 2. `migrate-to-postgres.js`

**Ejecuta la migración de datos**

```bash### `init-clean-data.js`### 1. `limpiar-clientes.js` (Limpieza rápida)

node scripts/migrate-to-postgres.js

```**Descripción:** Script maestro para inicializar el sistema con datos limpios.Script simple que elimina todos los clientes y crea 2 clientes de prueba.



## Proceso de Migración - 3 Pasos Simples



### PASO 1: Instalar PostgreSQL**Funcionalidad:**```bash

```bash

node scripts/install-postgresql.js- Crea 1 usuario administrador# Desde el directorio backend

```

Este script:- Crea 3 empleados con diferentes niveles de accesonode scripts/limpiar-clientes.js

- Descarga PostgreSQL 15

- Lo instala automáticamente- Crea 5 clientes de ejemplo  ```

- Crea la base de datos 'supercopias'

- Configura usuario y contraseña- Inicializa catálogos básicos del sistema



### PASO 2: Ejecutar Migración### 2. `limpiar-inconsistentes.js` (Limpiar estructura)

```bash

node scripts/migrate-to-postgres.js**Uso:**Script que elimina clientes con estructura de datos inconsistente.

```

Este script:```bash

- Crea todas las tablas

- Migra los datos existentes# Desde el directorio backend```bash

- Instala catálogos SAT oficiales

- Convierte IDs a numéricasnpm run init# Limpiar clientes con estructura incorrecta



### PASO 3: Verificar Resultadonode scripts/limpiar-inconsistentes.js

```bash

npm start# O directamente:```

```

El servidor iniciará con PostgreSQL.node scripts/init-clean-data.js



## ¿Problemas?```### 3. `gestionar-clientes.js` (Gestión avanzada)



**Error de conexión:**Script completo con múltiples opciones para gestionar clientes.

```bash

# Verificar PostgreSQL**Credenciales creadas:**

Get-Service postgresql*

```- **Admin:** admin / Admin123!$```bash



**Tablas vacías:**- **Empleado (completo):** mgomez / empleado123# Listar todos los clientes

```bash

# Re-ejecutar migración- **Empleado (limitado):** jperez / empleado123node scripts/gestionar-clientes.js listar

node scripts/migrate-to-postgres.js

```



**¡Eso es todo! Solo 2 scripts, 3 pasos.** 🎯**Empleados configurados:**# Crear respaldo de clientes actuales

- María Gómez: Acceso administrador (todos los módulos)node scripts/gestionar-clientes.js respaldar

- Juan Pérez: Acceso personalizado (dashboard y clientes)

- Ana López: Inactivo (sin usuario de sistema)# Restaurar desde respaldo

node scripts/gestionar-clientes.js restaurar

**Nota:** Este script restablece completamente la base de datos a un estado limpio. Úsalo cuando necesites volver al estado inicial del sistema.
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