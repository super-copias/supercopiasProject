# 📁 Scripts del Backend - SuperCopias

Este directorio contiene scripts esenciales para la gestión de la base de datos PostgreSQL.

---

## 📂 Archivos Disponibles

### 🔧 `db-manager.ps1`
**Descripción:** Script unificado para gestionar la base de datos PostgreSQL

**Comandos disponibles:**

#### Restaurar base de datos
```powershell
.\db-manager.ps1 restore
```
- Elimina y recrea la base de datos con encoding UTF-8
- Restaura desde BD_SUPERCOPIAS.sql
- Verifica encoding y datos
- Muestra resumen de tablas

#### Exportar base de datos
```powershell
.\db-manager.ps1 export
```
- Exporta la BD actual con encoding UTF-8
- Crea backup automático (BD_SUPERCOPIAS_backup.sql)
- Actualiza BD_SUPERCOPIAS.sql

#### Mostrar ayuda
```powershell
.\db-manager.ps1 help
```

**Características:**
- ✅ Manejo correcto de UTF-8 (acentos, ñ, etc.)
- ✅ Confirmación antes de acciones destructivas
- ✅ Backups automáticos al exportar
- ✅ Verificación de PostgreSQL y archivos
- ✅ Mensajes de progreso claros

---
**Descripción:** Inserta los módulos del sistema en la base de datos.

**Módulos incluidos:**
- Clientes
- Empleados  
- Proveedores
- Equipos
- Inventarios
- Administración

**Uso:** 
```bash
# Ejecutar después de crear la estructura base con BD_SUPERCOPIAS.sql
psql -U postgres -d supercopias -f scripts/insertar-modulos.sql
```

**Nota:** Este script es necesario solo si no se ejecutó durante la creación inicial de la base de datos.

---

### 🔄 `restore-database.ps1`
**Descripción:** Script PowerShell para restaurar la base de datos completa desde BD_SUPERCOPIAS.sql

**Funcionalidad:**
- Elimina y recrea la base de datos supercopias con encoding UTF-8
- Ejecuta el archivo BD_SUPERCOPIAS.sql principal
- Restaura toda la estructura y datos iniciales
- Verifica encoding y caracteres especiales (acentos, ñ, etc.)

**Uso:**
```powershell
# Desde el directorio backend
.\scripts\restore-database.ps1
```

**Requisitos:**
- PostgreSQL instalado y en PATH
- Permisos de superusuario (postgres)
- Variable de entorno PGPASSWORD configurada (opcional)

---

### 🚀 `migrate-database.ps1`
**Descripción:** Script simplificado de migración con verificación de encoding

**Funcionalidad:**
- Termina conexiones activas
- Elimina y recrea DB con encoding UTF-8 explícito
- Restaura estructura y datos
- Verifica caracteres especiales automáticamente
- Muestra resumen de tablas y registros

**Uso:**
```powershell
# Desde el directorio backend/scripts
.\migrate-database.ps1
```

---

### 📤 `export-utf8.ps1`
**Descripción:** Exporta la base de datos actual con encoding UTF-8 correcto

**Funcionalidad:**
- Exporta usando pg_dump con --encoding=UTF8
- Crea backup del archivo anterior
- Reemplaza BD_SUPERCOPIAS.sql con versión UTF-8

**Uso:**
```powershell
# Desde el directorio backend/scripts
.\export-utf8.ps1
```

**Cuándo usar:**
- Después de cambios estructurales en la BD
- Para regenerar BD_SUPERCOPIAS.sql con datos actuales
- Cuando hay problemas de encoding

---

### 📋 `CHANGELOG.md`
**Descripción:** Historial completo de cambios estructurales en la base de datos.

**Contenido:**
- Registro cronológico de todas las migraciones aplicadas
- Cambios en tablas, columnas, índices y constraints
- Nuevas funcionalidades agregadas
- Scripts de migración ejecutados

**Uso:** Consultar antes de aplicar cambios para entender el historial del proyecto.

---

## 📚 Estructura de la Base de Datos

### 🗄️ Archivo Principal: `BD_SUPERCOPIAS.sql`
**Ubicación:** `backend/BD_SUPERCOPIAS.sql`

Este es el archivo **MAESTRO** que contiene:
- ✅ Estructura completa de todas las tablas
- ✅ Todos los catálogos SAT
- ✅ Índices y constraints
- ✅ Foreign keys
- ✅ Triggers y funciones
- ✅ Datos iniciales

**Tablas Principales:**
- `usuarios` - Autenticación y acceso
- `empleados` - Gestión de personal
- `clientes` - Gestión de clientes
- `proveedores` - Gestión de proveedores
- `equipos` - Inventario de equipos electrónicos
- `equipos_caracteristicas` - Datos específicos por tipo de equipo
- `equipos_historial_contador` - Lecturas de contadores
- `equipos_mantenimiento` - Historial de servicios
- `equipos_consumibles` - Control de toner, cilindros, etc.
- `inventarios` - Gestión de artículos (ventas, insumos, genéricos)
- `inventarios_categorias` - Categorías personalizadas con campos dinámicos
- `inventarios_reglas_stock` - Configuración de alertas por artículo
- `eventos_personal` - Vacaciones, faltas, permisos
- `modulos` - Módulos del sistema
- `empleados_modulos` - Permisos por empleado

**Catálogos SAT:**
- `regimenes_fiscales` (32 registros)
- `usos_cfdi` (28 registros)
- `formas_pago` (18 registros)
- `metodos_pago` (4 registros)
- `estados` (32 registros)

**Catálogos del Sistema:**
- `cat_tipos_inventario` (Venta, Insumo, Genérico)
- `cat_unidades_medida` (Pieza, Caja, Litro, etc.)
- `cat_ubicaciones` (Almacén Principal, Bodega, etc.)
- `cat_tipos_proveedor` (Servicios, Productos, Ambos)
- `cat_metodos_pago_proveedor` (Efectivo, Transferencia, etc.)

---

## 🚀 Guía de Uso

### Instalación Inicial (Nueva Base de Datos)

```powershell
# 1. Crear la base de datos
createdb -U postgres supercopias

# 2. Restaurar estructura completa
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql

# 3. (Opcional) Verificar que los módulos estén insertados
psql -U postgres -d supercopias -c "SELECT * FROM modulos;"
```

### Restauración Rápida

```powershell
# Usar el script automatizado
cd backend
.\scripts\restore-database.ps1
```

---

## ⚠️ Notas Importantes

1. **BD_SUPERCOPIAS.sql es la fuente de verdad**
   - Todos los cambios estructurales deben reflejarse ahí
   - Los scripts de migración individuales se eliminaron tras consolidación
   - Mantener este archivo actualizado en cada cambio

2. **CHANGELOG.md**
   - Documentar cada cambio estructural
   - Incluir fecha, descripción y archivos afectados
   - Facilita el seguimiento de evolución del proyecto

3. **Backups**
   - Hacer backup antes de cambios estructurales importantes
   - Guardar dumps con: `pg_dump -U postgres supercopias > backup_YYYYMMDD.sql`

4. **Migraciones en Producción**
   - Probar primero en entorno de desarrollo
   - Ejecutar scripts de migración en horarios de bajo tráfico
   - Tener plan de rollback preparado

---

## 📞 Soporte

Para dudas sobre scripts o estructura de base de datos, consultar:
- `DOCS.md` en la raíz del proyecto
- `CHANGELOG.md` en este directorio
- Comentarios dentro de `BD_SUPERCOPIAS.sql`

---

**Última actualización:** 4 de diciembre de 2025  
**Mantenido por:** Equipo de Desarrollo SuperCopias
- Validaciones para prevenir inconsistencias
- Migración segura con IF NOT EXISTS

**Uso:**
```bash
psql -U postgres -d supercopias -f scripts/update-categorias-personalizadas.sql
```

**Verificación:**
```sql
-- El script incluye verificación automática al final
-- Muestra qué campos fueron agregados exitosamente
```

---

#### `insertar-modulos.sql`
**Descripción:** Inserta los módulos del sistema en la base de datos.

**Módulos incluidos:**
- Clientes
- Empleados  
- Proveedores
- Equipos (Gestión de Inventario)
- Inventarios (Gestión de Stock) 📦 NUEVO
- Administración

**Uso:** Se ejecuta automáticamente con `migrate-to-postgres.js`

**Ejecución manual:**
```bash
psql -U postgres -d supercopias -f scripts/insertar-modulos.sql
```

**Funcionalidad:**
- Agrega columnas de nombres (`cliente_nombre`, `responsable_nombre`, `tecnico_nombre`, `proveedor_nombre`)
- Migra datos de IDs a nombres automáticamente (si existen foreign keys)
- Elimina foreign keys hacia `clientes`, `empleados` y `proveedores`
- Elimina columnas de IDs (`cliente_id`, `responsable_id`, `tecnico_id`, `proveedor_id`)
- Crea índices para búsquedas por nombre
- Verifica migración exitosa

**Uso:**
```bash
# Si ya tienes tablas de equipos con foreign keys
psql -U postgres -d supercopias -f scripts/migrate-equipos-independiente.sql
```

**Cuándo usar:**
- Si instalaste el módulo de equipos con la versión anterior (con foreign keys)
- Si quieres convertir el módulo a independiente sin afectar otros módulos

**Nota:** Es idempotente, puedes ejecutarlo múltiples veces sin problemas.

---

## 📋 Archivo Principal de Base de Datos

### `BD_SUPERCOPIAS.sql`
**Ubicación:** `backend/BD_SUPERCOPIAS.sql`

**Descripción:** Archivo maestro con el dump completo y actualizado de la base de datos PostgreSQL.

**Incluye:**
- Todas las tablas del sistema
- Todos los índices y constraints
- Todos los triggers y funciones
- Estructura actualizada con todos los cambios aplicados

**Uso para crear la base de datos desde cero:**
```bash
# Crear la base de datos
createdb -U postgres supercopias

# Restaurar desde el dump
psql -U postgres -d supercopias -f backend/BD_SUPERCOPIAS.sql
```

**Importante:** Este es el archivo que debe mantenerse actualizado. Cuando se apliquen migraciones, actualizar también este archivo.

---

## 🗂️ Estructura de la Base de Datos

### Tablas Principales

#### `clientes`
Almacena información de clientes del sistema.

**Campos principales:**
- `id` - Identificador único
- `razon_social` - Razón social de facturación
- `nombre_comercial` - Nombre comercial del cliente
- `email` - Correo electrónico principal
- `segundo_email` - Correo electrónico secundario (opcional)
- `telefono` - Teléfono principal
- `segundo_telefono` - Teléfono secundario (opcional)
- `rfc` - RFC para facturación
- `regimen_fiscal` - Código de régimen fiscal SAT
- `uso_cfdi` - Código de uso CFDI SAT
- `direccion_entrega` - Dirección donde se entregan productos
- `direccion_facturacion` - Dirección para facturación
- `direccion_codigo_postal` - Código postal
- `activo` - Estado del cliente
- `fecha_registro` - Fecha de creación
- `fecha_modificacion` - Última actualización

#### `empleados`
Información de empleados del sistema.

#### `proveedores`
Información de proveedores.

#### `usuarios`
Cuentas de usuario del sistema.

#### `modulos`
Módulos funcionales del sistema.

#### `empleados_modulos`
Relación entre empleados y sus módulos asignados.

---

## 📝 Catálogos SAT

El sistema incluye los siguientes catálogos del SAT precargados:

- **Regímenes Fiscales** (`regimenes_fiscales`)
- **Usos CFDI** (`usos_cfdi`)
- **Formas de Pago** (`formas_pago`)
- **Métodos de Pago** (`metodos_pago`)
- **Estados** (`estados`)

Estos catálogos se cargan automáticamente con `migrate-to-postgres.js`.

---

## 🔍 Verificación de Cambios

Para verificar que una migración se aplicó correctamente:

```sql
-- Ver estructura de tabla clientes
\d clientes

-- Ver todas las columnas de clientes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes'
ORDER BY ordinal_position;
```

---

## ⚠️ Buenas Prácticas

1. **Siempre hacer backup antes de aplicar migraciones:**
   ```bash
   pg_dump -U postgres supercopias > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Probar migraciones primero en ambiente de desarrollo**

3. **Actualizar BD_SUPERCOPIAS.sql después de aplicar cambios exitosos:**
   ```bash
   pg_dump -U postgres supercopias > backend/BD_SUPERCOPIAS.sql
   ```

4. **Documentar cambios en el CHANGELOG.md**

---

## 🚀 Flujo de Trabajo para Nuevas Migraciones

1. Crear script de migración en `backend/scripts/`
   ```bash
   touch backend/scripts/add-nueva-funcionalidad.sql
   ```

2. Probar en base de datos local
   ```bash
   psql -U postgres -d supercopias -f backend/scripts/add-nueva-funcionalidad.sql
   ```

3. Si funciona correctamente, actualizar BD_SUPERCOPIAS.sql
   ```bash
   pg_dump -U postgres supercopias > backend/BD_SUPERCOPIAS.sql
   ```

4. Documentar en CHANGELOG.md

5. Commit de ambos archivos (script + BD_SUPERCOPIAS.sql actualizado)

---

## 📞 Soporte

Para problemas o preguntas sobre los scripts, revisar:
- `CHANGELOG.md` - Historial de cambios
- Logs de PostgreSQL
- Documentación del proyecto en README.md principal
