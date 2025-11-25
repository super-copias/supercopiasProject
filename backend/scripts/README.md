# 📁 Scripts del Backend - SuperCopias

Este directorio contiene scripts esenciales para la gestión de la base de datos PostgreSQL.

---

## 📂 Scripts Disponibles

### 🔧 Scripts de Migración y Setup

#### `migrate-to-postgres.js`
**Descripción:** Script principal de migración e inicialización de la base de datos PostgreSQL.

**Funcionalidad:**
- Crea la estructura completa de la base de datos
- Inicializa catálogos SAT (Regímenes Fiscales, Usos CFDI, Formas de Pago, etc.)
- Crea tablas: usuarios, empleados, clientes, proveedores, módulos
- Ejecuta automáticamente el script `insertar-modulos.sql`

**Uso:**
```bash
# Desde el directorio backend
node scripts/migrate-to-postgres.js
```

**Nota:** Este script debe ejecutarse solo una vez al configurar el proyecto por primera vez.

---

#### `insertar-modulos.sql`
**Descripción:** Inserta los módulos del sistema en la base de datos.

**Módulos incluidos:**
- Clientes
- Empleados  
- Proveedores
- Administración

**Uso:** Se ejecuta automáticamente con `migrate-to-postgres.js`

**Ejecución manual:**
```bash
psql -U postgres -d supercopias -f scripts/insertar-modulos.sql
```

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
