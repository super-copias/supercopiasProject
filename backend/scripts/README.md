# 📁 Scripts del Backend - SuperCopias# 🚀 Scripts de Migración SuperCopias# Scripts del Backend - SuperCopias# Scripts de Gestión de Clientes



Este directorio contiene scripts SQL y de Node.js para gestión de la base de datos y migraciones.



---## Scripts Esenciales



## 🗄️ Scripts SQL de Migración



### `migration-simplify-direcciones.sql`### 1. `install-postgresql.js` Este directorio contiene el script de inicialización del sistema.Este directorio contiene scripts para gestionar los datos de clientes en la base de datos.

**Propósito:** Simplifica la estructura de direcciones en la tabla clientes.  

**Uso:** Se ejecuta automáticamente con `migrate-to-postgres.js`**Instala y configura PostgreSQL completo**



### `add-segundo-telefono-clientes.sql````bash

**Propósito:** Agrega campo de segundo teléfono a clientes.  

**Uso:** Migración automática, ya aplicada en producción.node scripts/install-postgresql.js



### `remove-rfc-unique-constraint.sql````## Script Disponible## Scripts disponibles

**Propósito:** Permite RFC duplicados entre clientes.  

**Fecha:** 11 nov 2025  

**Uso:**

```bash### 2. `migrate-to-postgres.js`

psql -U postgres -d supercopias -f remove-rfc-unique-constraint.sql

```**Ejecuta la migración de datos**



### `insertar-modulos.sql````bash### `init-clean-data.js`### 1. `limpiar-clientes.js` (Limpieza rápida)

**Propósito:** Inserta módulos del sistema en la base de datos.

node scripts/migrate-to-postgres.js

### `verificar-migracion.sql`

**Propósito:** Verifica el estado de las migraciones aplicadas.```**Descripción:** Script maestro para inicializar el sistema con datos limpios.Script simple que elimina todos los clientes y crea 2 clientes de prueba.



---



## 🔧 Scripts de Node.js## Proceso de Migración - 3 Pasos Simples



### `migrate-to-postgres.js`

**Propósito:** Script principal de migración a PostgreSQL.  

**Uso:**### PASO 1: Instalar PostgreSQL**Funcionalidad:**```bash

```bash

node scripts/migrate-to-postgres.js```bash

```

node scripts/install-postgresql.js- Crea 1 usuario administrador# Desde el directorio backend

**Funcionalidad:**

- Crea estructura de base de datos```

- Migra datos existentes

- Aplica todas las migraciones SQLEste script:- Crea 3 empleados con diferentes niveles de accesonode scripts/limpiar-clientes.js

- Inicializa catálogos SAT

- Descarga PostgreSQL 15

---

- Lo instala automáticamente- Crea 5 clientes de ejemplo  ```

## 📝 Historial de Cambios

- Crea la base de datos 'supercopias'

Ver archivo `CHANGELOG.md` para el registro completo de todas las migraciones y cambios estructurales de la base de datos.

- Configura usuario y contraseña- Inicializa catálogos básicos del sistema

**Última migración:** Eliminación de RFC único (11 nov 2025)



---

### PASO 2: Ejecutar Migración### 2. `limpiar-inconsistentes.js` (Limpiar estructura)

## 🚀 Guía Rápida

```bash

### Primera vez - Configurar Base de Datos

```bashnode scripts/migrate-to-postgres.js**Uso:**Script que elimina clientes con estructura de datos inconsistente.

# 1. Asegurarse que PostgreSQL está instalado y corriendo

# 2. Ejecutar migración principal```

node scripts/migrate-to-postgres.js

Este script:```bash

# 3. Verificar

node scripts/verificar-migracion.sql- Crea todas las tablas

```

- Migra los datos existentes# Desde el directorio backend```bash

### Aplicar Migración Específica

```bash- Instala catálogos SAT oficiales

# Conectarse a la base de datos

psql -U postgres -d supercopias- Convierte IDs a numéricasnpm run init# Limpiar clientes con estructura incorrecta



# Ejecutar archivo SQL específico

\i scripts/nombre-del-script.sql

```### PASO 3: Verificar Resultadonode scripts/limpiar-inconsistentes.js



### Para Producción```bash

```bash

# Siempre hacer respaldo primeronpm start# O directamente:```

pg_dump -U postgres supercopias > backup_$(date +%Y%m%d).sql

```

# Aplicar migración

psql -U postgres -d supercopias -f scripts/nombre-del-script.sqlEl servidor iniciará con PostgreSQL.node scripts/init-clean-data.js



# Verificar cambios

psql -U postgres -d supercopias -c "\d nombre_tabla"

```## ¿Problemas?```### 3. `gestionar-clientes.js` (Gestión avanzada)



---



## ⚠️ Notas Importantes**Error de conexión:**Script completo con múltiples opciones para gestionar clientes.



### Estructura Actual de Clientes```bash

- **RFC:** Puede repetirse (desde nov 2025)

- **Email:** ÚNICO - no puede repetirse# Verificar PostgreSQL**Credenciales creadas:**

- **Teléfono:** Requerido

- **Segundo teléfono:** OpcionalGet-Service postgresql*



### Validaciones Activas```- **Admin:** admin / Admin123!$```bash

✅ Formato de RFC válido  

✅ Email único  

✅ Formato de email  

✅ Régimen fiscal (3 dígitos)  **Tablas vacías:**- **Empleado (completo):** mgomez / empleado123# Listar todos los clientes

❌ RFC único (eliminado)

```bash

---

# Re-ejecutar migración- **Empleado (limitado):** jperez / empleado123node scripts/gestionar-clientes.js listar

## 📞 Soporte

node scripts/migrate-to-postgres.js

Para problemas con migraciones:

1. Revisar `CHANGELOG.md````

2. Verificar logs de PostgreSQL

3. Consultar respaldos en `backups/` (si existen)



**Importante:** Siempre hacer respaldo antes de ejecutar migraciones en producción.**¡Eso es todo! Solo 2 scripts, 3 pasos.** 🎯**Empleados configurados:**# Crear respaldo de clientes actuales


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

## Migraciones de Base de Datos

### `remove-rfc-unique-constraint.sql`

**Descripción:** Elimina la restricción de RFC único en la tabla de clientes.

**Propósito:** Permite que múltiples clientes puedan compartir el mismo RFC.

**Uso:**
```bash
# Desde el directorio backend
psql -U postgres -d supercopias -f scripts/remove-rfc-unique-constraint.sql
```

**Cambios realizados:**
- ✅ Elimina constraint UNIQUE `clientes_rfc_key`
- ✅ Elimina índice único de RFC
- ✅ Crea índice normal (no único) para mejorar búsquedas

**Documentación:** Ver `MIGRACION-RFC-NO-UNICO.md` para detalles completos.

**Fecha de aplicación:** 11 de noviembre de 2025

## Archivos de respaldo

- `db_backup_clientes.json`: Respaldo automático creado por el script gestor
- Incluye timestamp y datos completos de clientes

## Seguridad

- Validaciones en frontend y backend
- Formatos de datos estrictamente validados
- Prevención de duplicados en campos únicos (excepto RFC desde nov 2025)
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
7. rfc (puede repetirse entre clientes)
8. regimen fiscal
9. direccion
10. codigo postal
11. uso cfdi

La plantilla incluye 3 ejemplos de diferentes tipos de clientes (persona física, persona moral, etc.)