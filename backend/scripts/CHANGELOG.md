# 📋 Historial de Cambios - Base de Datos SuperCopias

Este archivo registra todos los cambios estructurales importantes en la base de datos.

---

## [2025-11-11] Separación de Direcciones de Entrega y Facturación

### Motivación
Diferenciar entre la dirección de entrega (donde se entregan productos) y la dirección de facturación (para emisión de facturas), permitiendo al sistema manejar ambas de forma independiente.

### Cambios Realizados

**Base de Datos:**
- ✅ Renombrada columna `direccion` → `direccion_entrega`
- ✅ Agregada columna `direccion_facturacion` (TEXT)
- ✅ Recreada vista `vista_clientes_activos` con ambos campos de dirección

**Backend:**
- ✅ Actualizado `clientesController.js` para manejar ambos campos:
  - `listClientes()` - mapea ambas direcciones
  - `getCliente()` - retorna `direccionEntrega` y `direccion` (facturación)
  - `createCliente()` - inserta ambas direcciones
  - `updateCliente()` - actualiza ambas direcciones independientemente
  - `uploadExcelClientes()` - importa desde "direccion de entrega" y "direccion"
- ✅ Actualizada plantilla Excel (`plantillaClientes.js`) con ejemplos que muestran direcciones diferentes

**Frontend:**
- ✅ Actualizado formulario de cliente: labels "Dirección de entrega" y "Dirección de facturación"
- ✅ Actualizado componente de detalle para mostrar ambas direcciones
- ✅ Actualizado componente de carga masiva con instrucciones claras sobre las dos direcciones
- ✅ Actualizada función de impresión con labels correctos

**Script de Migración:** `add-direccion-facturacion.sql`

**Impacto:**
- ✅ Los clientes existentes tendrán su dirección antigua en `direccion_entrega`, `direccion_facturacion` será NULL hasta que se actualice
- ✅ La plantilla Excel muestra ejemplos donde las direcciones pueden ser iguales o diferentes

---

## [2025-11-11] Eliminación de Columnas de Dirección Obsoletas

### Motivación
Limpiar la estructura de la tabla `clientes` eliminando columnas de dirección que no se usan en el código. El sistema usa un campo consolidado `direccion` (TEXT) en lugar de múltiples campos individuales.

### Cambios Realizados

**Base de Datos:**
- ❌ Eliminada columna `direccion_calle`
- ❌ Eliminada columna `direccion_numero`
- ❌ Eliminada columna `direccion_colonia`
- ❌ Eliminada columna `direccion_ciudad`
- ❌ Eliminada columna `direccion_estado`
- ✅ Se mantiene `direccion` (TEXT) - campo consolidado (renombrado después a `direccion_entrega`)
- ✅ Se mantiene `direccion_codigo_postal` - código postal separado
- ✅ Recreada vista `vista_clientes_activos` con estructura actualizada

**Backend/Frontend:**
- ℹ️ Sin cambios necesarios (ya usaban solo campo `direccion`)

**Script de Migración:** `remove-obsolete-direccion-columns.sql`

**Impacto:**
- ✅ Simplifica la estructura de la tabla
- ✅ Sin impacto en funcionalidad existente (columnas no usadas)

---

## [2025-11-11] Eliminación de Restricción UNIQUE en RFC

### Motivación
Permitir que múltiples clientes puedan compartir el mismo RFC, ya que en la práctica varios negocios pueden usar el RFC de la misma persona física o moral.

### Cambios Realizados

**Base de Datos:**
- ✅ Eliminada restricción `clientes_rfc_key` (UNIQUE)
- ✅ Eliminado índice `idx_clientes_rfc`

**Backend:**
- ✅ Eliminada validación de RFC duplicado en función `createCliente()`
- ✅ Eliminada validación de RFC duplicado en función `updateCliente()`



### Scripts Aplicados**Base de Datos:**- ✅ Eliminada validación de RFC duplicado en función `uploadExcelClientes()` (líneas 814-824)

- `remove-obsolete-direccion-columns.sql`

- ❌ Eliminado constraint `UNIQUE (rfc)` en tabla `clientes`- ✅ Eliminado mensaje de error de RFC duplicado en manejo de errores de importación Excel (línea 948-950)

### Estructura Final de Dirección

| Campo | Tipo | Uso |- ❌ Eliminado índice único `idx_clientes_rfc`

|-------|------|-----|

| `direccion` | TEXT | Dirección completa (calle, número, colonia, ciudad, estado) |- ✅ Creado índice normal (no único) para mantener rendimiento de búsquedas### 2. Frontend

| `direccion_codigo_postal` | VARCHAR(10) | Código postal |

- ❌ Eliminada validación CHECK de longitud de RFC- ✅ No se encontraron validaciones adicionales de RFC duplicado en el frontend

### Verificación

```sql- ℹ️ El frontend solo valida el formato del RFC, no la unicidad

-- Columnas de dirección actuales

SELECT column_name, data_type **Backend:**

FROM information_schema.columns 

WHERE table_name = 'clientes' AND column_name LIKE 'direccion%';- ❌ Eliminada validación de RFC duplicado en `createCliente()`### 3. Base de Datos (`backend/BD_SUPERCOPIAS.sql`)



-- Resultado esperado:- ❌ Eliminada validación de RFC duplicado en `updateCliente()`- ✅ Eliminado `DROP INDEX IF EXISTS public.idx_clientes_rfc` (línea 63)

-- direccion | text

-- direccion_codigo_postal | character varying- ❌ Eliminada validación de RFC duplicado en `uploadExcelClientes()`- ✅ Eliminado `DROP CONSTRAINT IF EXISTS clientes_rfc_key` (línea 97)

```

- ✅ Se mantiene validación de formato de RFC- ✅ Eliminado `CONSTRAINT chk_clientes_rfc CHECK` en definición de tabla (línea 382)

---

- ✅ Eliminado `ADD CONSTRAINT clientes_rfc_key UNIQUE (rfc)` (líneas 1458-1462)

## [2025-11-11] Eliminación de Restricción UNIQUE en RFC

**Frontend:**- ✅ Eliminado `CREATE INDEX idx_clientes_rfc ON public.clientes USING btree (rfc)` único (líneas 1721-1724)

### Motivación

Permitir que múltiples clientes puedan compartir el mismo RFC, ya que en la práctica varios negocios pueden usar el RFC de la misma persona física o moral.- ℹ️ Sin cambios (solo validaba formato, no unicidad)



### Cambios Realizados### 4. Base de Datos Local



**Base de Datos:**### Scripts Aplicados- ✅ Ejecutado script `backend/scripts/remove-rfc-unique-constraint.sql`

- ❌ Eliminado constraint `UNIQUE (rfc)` en tabla `clientes`

- ❌ Eliminado índice único `idx_clientes_rfc`- `remove-rfc-unique-constraint.sql`- ✅ Eliminada restricción `clientes_rfc_key UNIQUE`

- ✅ Creado índice normal (no único) para mantener rendimiento de búsquedas

- ❌ Eliminada validación CHECK de longitud de RFC- ✅ Eliminado índice único `idx_clientes_rfc`



**Backend:**### Validaciones Actuales- ✅ Creado índice normal (no único) `idx_clientes_rfc` para mejorar búsquedas

- ❌ Eliminada validación de RFC duplicado en `createCliente()`

- ❌ Eliminada validación de RFC duplicado en `updateCliente()`

- ❌ Eliminada validación de RFC duplicado en `uploadExcelClientes()`

- ✅ Se mantiene validación de formato de RFC**Se sigue validando:**## Verificación de Cambios



**Frontend:**- ✅ Formato de RFC: `/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/`

- ℹ️ Sin cambios (solo validaba formato, no unicidad)

- ✅ Email único (constraint UNIQUE activo)### Estado de la Base de Datos (Después de la Migración)

### Scripts Aplicados

- `remove-rfc-unique-constraint.sql`- ✅ Nombre requerido



### Validaciones Actuales- ✅ Teléfono requerido**Constraints activos en tabla `clientes`:**



**Se sigue validando:**- ✅ Formato de email- `chk_clientes_email` - Validación de formato de email

- ✅ Formato de RFC: `/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/`

- ✅ Email único (constraint UNIQUE activo)- ✅ Régimen fiscal (3 dígitos)- `chk_clientes_regimen_fiscal` - Validación de régimen fiscal (3 dígitos)

- ✅ Nombre requerido

- ✅ Teléfono requerido- `clientes_pkey` - Primary Key (id)

- ✅ Formato de email

- ✅ Régimen fiscal (3 dígitos)**Ya NO se valida:**



**Ya NO se valida:**- ❌ RFC único**Índices activos:**

- ❌ RFC único

- `clientes_pkey` (UNIQUE) - Por ID

### Reversión (si necesario)

```sql### Reversión (si necesario)- `idx_clientes_activo` - Por estado activo

-- Para volver a hacer RFC único:

CREATE UNIQUE INDEX idx_clientes_rfc_unique ON clientes(rfc) WHERE rfc IS NOT NULL;```sql- `idx_clientes_codigo_postal` - Por código postal

ALTER TABLE clientes ADD CONSTRAINT clientes_rfc_key UNIQUE (rfc);

```-- Para volver a hacer RFC único:- `idx_clientes_email` - Por email



---CREATE UNIQUE INDEX idx_clientes_rfc_unique ON clientes(rfc) WHERE rfc IS NOT NULL;- `idx_clientes_razon_social` - Por razón social



## [2025-10-XX] Simplificación de DireccionesALTER TABLE clientes ADD CONSTRAINT clientes_rfc_key UNIQUE (rfc);- `idx_clientes_rfc` (NO ÚNICO) - Por RFC



### Cambios```

- Consolidado múltiples campos de dirección en un solo campo `TEXT`

- Agregado campo `direccion_codigo_postal`## Validaciones que Permanecen

- **Nota:** El script de migración original no se ejecutó completamente, se aplicó manualmente el 11/11/2025

### Estado Actual

### Script

- `migration-simplify-direcciones.sql`| Constraint | Tipo | Estado |El sistema sigue validando:



---|------------|------|--------|- ✅ Formato de RFC (3-4 letras + 6 dígitos + 3 caracteres)



## [2025-09-XX] Segundo Teléfono| `clientes_pkey` | PRIMARY KEY | ✅ Activo |- ✅ Longitud del RFC (12 o 13 caracteres)



### Cambios| `chk_clientes_email` | CHECK | ✅ Activo |- ✅ Fecha válida dentro del RFC

- Agregado campo `segundo_telefono VARCHAR(20)` a tabla clientes

| `chk_clientes_regimen_fiscal` | CHECK | ✅ Activo |- ✅ Email único (no puede haber clientes con el mismo email)

### Script

- `add-segundo-telefono-clientes.sql`| `clientes_rfc_key` | UNIQUE | ❌ Eliminado |- ✅ Formato de email válido



---- ✅ Formato de régimen fiscal (3 dígitos)



## Estructura Actual de la Tabla Clientes| Índice | Tipo | Estado |



### Campos Principales|--------|------|--------|## Validaciones Eliminadas

| Campo | Tipo | Restricción | Descripción |

|-------|------|------------|-------------|| `idx_clientes_rfc` | Normal | ✅ Activo (no único) |

| `id` | SERIAL | PRIMARY KEY | Identificador único |

| `rfc` | VARCHAR(13) | - | RFC (puede repetirse) || `idx_clientes_email` | Normal | ✅ Activo |- ❌ RFC único (ahora pueden existir múltiples clientes con el mismo RFC)

| `razon_social` | VARCHAR(500) | NOT NULL | Razón social |

| `nombre_comercial` | VARCHAR(500) | - | Nombre comercial || `idx_clientes_razon_social` | Normal | ✅ Activo |

| `email` | VARCHAR(255) | UNIQUE | Email del cliente |

| `telefono` | VARCHAR(20) | NOT NULL | Teléfono principal |## Archivos Modificados

| `segundo_telefono` | VARCHAR(20) | - | Teléfono secundario |

| `direccion` | TEXT | - | Dirección completa |---

| `direccion_codigo_postal` | VARCHAR(10) | - | Código postal |

| `regimen_fiscal` | VARCHAR(10) | CHECK | Régimen fiscal SAT |1. `backend/controllers/clientesController.js`

| `uso_cfdi` | VARCHAR(10) | - | Uso CFDI SAT |

| `activo` | BOOLEAN | DEFAULT true | Estado del cliente |## [2025-10-XX] Simplificación de Direcciones2. `backend/BD_SUPERCOPIAS.sql`

| `fecha_registro` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de registro |

| `fecha_modificacion` | TIMESTAMPTZ | DEFAULT NOW() | Última modificación |3. `backend/scripts/remove-rfc-unique-constraint.sql` (nuevo)



### Constraints Activos### Cambios

- `clientes_pkey` - PRIMARY KEY (id)

- `chk_clientes_email` - CHECK formato email- Consolidado múltiples campos de dirección en un solo campo `TEXT`## Instrucciones para Aplicar en Producción

- `chk_clientes_regimen_fiscal` - CHECK 3 dígitos

- Agregado campo `direccion_codigo_postal`

### Índices Activos

- `clientes_pkey` - UNIQUE (id)Si necesitas aplicar estos cambios en un servidor de producción:

- `idx_clientes_rfc` - Normal (no único)

- `idx_clientes_email` - Normal### Script

- `idx_clientes_razon_social` - Normal

- `idx_clientes_activo` - Normal- `migration-simplify-direcciones.sql````bash

- `idx_clientes_codigo_postal` - Normal

# 1. Conectarse a la base de datos de producción

---

---psql -U [usuario] -h [host] -d [database]

## Notas para Futuras Migraciones



### Antes de Aplicar

1. ✅ Crear respaldo de la base de datos## [2025-09-XX] Segundo Teléfono# 2. Ejecutar los siguientes comandos SQL:

2. ✅ Probar en ambiente de desarrollo/staging

3. ✅ Revisar dependencias del cambio (vistas, procedures, etc.)BEGIN;

4. ✅ Preparar script de reversión

5. ✅ Verificar que no hay código usando las columnas a eliminar### Cambios



### Después de Aplicar- Agregado campo `segundo_telefono VARCHAR(20)` a tabla clientesDROP INDEX IF EXISTS idx_clientes_rfc;

1. ✅ Verificar integridad de datos

2. ✅ Recrear vistas/funciones afectadasALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_rfc_key;

3. ✅ Actualizar archivo BD_SUPERCOPIAS.sql

4. ✅ Registrar en este CHANGELOG### ScriptALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_clientes_rfc;

5. ✅ Comunicar cambios al equipo

6. ✅ Probar funcionalidad completa- `add-segundo-telefono-clientes.sql`CREATE INDEX IF NOT EXISTS idx_clientes_rfc ON clientes USING btree (rfc);



### Plantilla para Nuevas Migraciones

```markdown

## [YYYY-MM-DD] Título del Cambio---COMMIT;



### Motivación

Descripción breve del por qué

## Notas para Futuras Migraciones# 3. Verificar que los cambios se aplicaron correctamente

### Cambios Realizados

**Base de Datos:**SELECT con.conname, con.contype 

- Lista de cambios

### Antes de AplicarFROM pg_constraint con

**Backend/Frontend:**

- Lista de cambios1. ✅ Crear respaldo de la base de datosINNER JOIN pg_class rel ON rel.oid = con.conrelid



### Scripts Aplicados2. ✅ Probar en ambiente de desarrollo/stagingWHERE rel.relname = 'clientes';

- nombre-del-script.sql

3. ✅ Revisar dependencias del cambio```

### Verificación

\`\`\`sql4. ✅ Preparar script de reversión

-- Comandos para verificar

\`\`\`## Notas Importantes



### Reversión (si aplicable)### Después de Aplicar

\`\`\`sql

-- Comandos para revertir1. ✅ Verificar integridad de datos- ⚠️ Los clientes importados desde Excel ya no serán rechazados por RFC duplicado

\`\`\`

```2. ✅ Actualizar documentación- ⚠️ Al crear o actualizar clientes, el sistema ya no verificará si el RFC existe



---3. ✅ Registrar en este CHANGELOG- ✅ El índice de RFC sigue existiendo para mantener el rendimiento de búsquedas



**Mantenido por:** Equipo de Desarrollo SuperCopias  4. ✅ Comunicar cambios al equipo- ✅ El formato del RFC sigue siendo validado

**Última actualización:** 11 de noviembre de 2025



### Plantilla para Nuevas Migraciones## Pruebas Recomendadas

```markdown

## [YYYY-MM-DD] Título del Cambio1. Crear dos clientes con el mismo RFC manualmente

2. Importar un Excel con clientes que tengan RFC duplicados

### Motivación3. Actualizar un cliente con un RFC que ya existe en otro cliente

Descripción breve del por qué4. Verificar que las búsquedas por RFC siguen funcionando correctamente



### Cambios Realizados---

- Lista de cambios**Autor:** Sistema de Migración Automática  

**Versión:** 1.0

### Scripts Aplicados
- nombre-del-script.sql

### Reversión (si aplicable)
```sql
-- Comandos para revertir
```
```

---

**Mantenido por:** Equipo de Desarrollo SuperCopias  
**Última actualización:** 11 de noviembre de 2025
