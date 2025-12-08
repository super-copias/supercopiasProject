# 🚂 Guía de Actualización de Base de Datos Railway

## Scripts Disponibles

Se han creado **2 scripts** para actualizar la base de datos en Railway:

### 1. `update-railway-db.sh` (Requiere Railway CLI)
Usa Railway CLI para obtener automáticamente las credenciales de conexión.

### 2. `update-railway-db-env.sh` (⭐ Recomendado)
Usa las variables de entorno desde tu archivo `.env` o solicita la URL manualmente.

---

## 🎯 Opción Recomendada: Usar `update-railway-db-env.sh`

### Paso 1: Asegurar que tienes la DATABASE_URL

Agrega la URL de conexión de Railway a tu archivo `.env` en el backend:

```bash
# Editar backend/.env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@HOST:PORT/railway
```

Para obtener esta URL:
1. Ve a tu proyecto en Railway (https://railway.app)
2. Selecciona el servicio de PostgreSQL
3. Ve a la pestaña "Variables"
4. Copia el valor de `DATABASE_PUBLIC_URL` o `DATABASE_URL`

### Paso 2: Ejecutar el script

```bash
# Desde la raíz del proyecto
./update-railway-db-env.sh
```

### Paso 3: Seleccionar opción 2 (Recomendado)

Cuando aparezca el menú, selecciona la opción **2**:

```
═══════════════════════════════════════
  Selecciona qué actualizar:
═══════════════════════════════════════
1. 📄 Aplicar esquema completo (BD_SUPERCOPIAS.sql)
2. 🎯 Aplicar esquema + datos de prueba (RECOMENDADO) ← SELECCIONA ESTA
3. 📦 Solo datos de prueba (datos-prueba.sql)
4. 🔌 Conectar a la base de datos (shell interactivo)
5. 🔍 Ver tablas y registros
6. 📊 Crear backup de la base de datos

Ingresa el número de opción: 2
```

### Paso 4: Confirmar la operación

Escribe `SI` (en mayúsculas) cuando te lo pida:

```
⚠️  ADVERTENCIA: Esto eliminará y recreará todas las tablas con datos de prueba.
¿Estás seguro? (escribe 'SI' para continuar): SI
```

---

## 📋 Qué hace cada opción del menú

### Opción 1: Aplicar esquema completo
- Ejecuta `BD_SUPERCOPIAS.sql`
- ⚠️ Elimina y recrea todas las tablas
- **NO** incluye datos de prueba

### Opción 2: Aplicar esquema + datos de prueba ⭐
- Ejecuta `BD_SUPERCOPIAS.sql` primero
- Luego ejecuta `datos-prueba.sql`
- Crea la estructura completa con datos de ejemplo
- **Incluye usuarios de prueba con credenciales funcionales**

### Opción 3: Solo datos de prueba
- Solo ejecuta `datos-prueba.sql`
- Útil si ya aplicaste el esquema antes
- Inserta los datos de ejemplo

### Opción 4: Conectar a la base de datos
- Abre una sesión interactiva con `psql`
- Útil para consultas SQL directas
- Escribe `\q` para salir

### Opción 5: Ver tablas y registros
- Muestra todas las tablas existentes
- Cuenta los registros en cada tabla
- Lista los usuarios del sistema

### Opción 6: Crear backup
- Genera un archivo `.sql` con todo el contenido actual
- Se guarda en `backend/backups/backup_railway_TIMESTAMP.sql`
- **Recomendado ejecutar antes de aplicar cambios**

---

## 🔐 Datos de Prueba Incluidos

Después de ejecutar la opción 2, tendrás:

### Usuarios del Sistema (password: `password123`)
| Username | Role | Módulos Asignados |
|----------|------|-------------------|
| `001.robertomar` | Admin | Todos |
| `002.lauragomez` | Empleado | empleados, clientes, reportes |
| `003.carloshern` | Empleado | empleados, clientes, inventarios, reportes |
| `004.anamariarui` | Empleado | clientes, inventarios, equipos |

### Otros Datos
- ✅ 5 Clientes
- ✅ 5 Proveedores
- ✅ 5 Artículos de inventario
- ✅ 5 Equipos
- ✅ 10 Empleados (4 con acceso al sistema)
- ✅ Catálogos completos (puestos, sucursales, módulos, etc.)

---

## 🆘 Solución de Problemas

### Error: "psql no está instalado"

**Solución en macOS:**
```bash
brew install postgresql
```

### Error: "No se encontró el archivo .env"

**Solución:**
El script te pedirá la URL manualmente. Pégala cuando te lo solicite:

```
Por favor, ingresa la URL de conexión a Railway:
(Formato: postgresql://user:password@host:port/database)
DATABASE_URL: [pega tu URL aquí]
```

### Error al conectar a Railway

**Verifica:**
1. Que la URL de conexión sea correcta
2. Que el servicio de PostgreSQL esté activo en Railway
3. Que tengas acceso a internet

### Quiero usar Railway CLI (script original)

**Instalar Railway CLI:**
```bash
# Opción 1: npm
npm install -g @railway/cli

# Opción 2: Homebrew
brew install railway

# Vincular al proyecto
railway link
```

Luego ejecuta:
```bash
./update-railway-db.sh
```

---

## 📊 Verificar que todo funcionó

Después de ejecutar el script, puedes verificar con la **opción 5**:

```bash
./update-railway-db-env.sh
# Seleccionar: 5
```

Deberías ver algo como:

```
=== CONTEO DE REGISTROS ===
   tabla        | registros 
----------------+-----------
 clientes       |         5
 empleados      |        10
 usuarios       |         4
 proveedores    |         5
 inventarios    |         5
 equipos        |         5
 ...
```

---

## 🎓 Mejores Prácticas

1. **Siempre crear backup antes de actualizar** (opción 6)
2. **Usar la opción 2 para entornos de desarrollo/prueba**
3. **Usar la opción 1 para producción (sin datos de prueba)**
4. **Verificar con la opción 5 después de aplicar cambios**

---

## 🔄 Flujo de Trabajo Recomendado

```bash
# 1. Crear backup de seguridad
./update-railway-db-env.sh
# Seleccionar: 6

# 2. Aplicar esquema + datos de prueba
./update-railway-db-env.sh
# Seleccionar: 2
# Confirmar: SI

# 3. Verificar que todo está correcto
./update-railway-db-env.sh
# Seleccionar: 5
```

---

## 📝 Notas Adicionales

- Los scripts incluyen mensajes coloridos para mejor legibilidad
- Todos los cambios son permanentes, por eso se solicita confirmación
- Los backups se guardan en `backend/backups/` con timestamp
- Los scripts son compatibles con macOS (bash/zsh)
