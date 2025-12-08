# Scripts de Base de Datos - SuperCopias

## Descripción de Archivos

### BD_SUPERCOPIAS.sql (Archivo Maestro)
**Archivo principal de migración de base de datos**

- ✅ Contiene la estructura completa de la base de datos
- ✅ Incluye todos los catálogos SAT necesarios
- ✅ Datos esenciales del sistema (puestos, sucursales, módulos, etc.)
- ✅ **Usuario admin único** con credenciales:
  - **Usuario**: `admin`
  - **Contraseña**: `Admin123!$`
- ❌ **NO contiene datos de prueba** (clientes, empleados, proveedores, inventarios, equipos)

### datos-prueba.sql
**Script de datos de prueba para desarrollo y testing**

Contiene:
- 5 Clientes de ejemplo
- 5 Proveedores (basados en datos reales)
- 5 Artículos de inventario
- 5 Equipos con características variadas

**⚠️ IMPORTANTE:** Este script debe ejecutarse **DESPUÉS** de BD_SUPERCOPIAS.sql

## Instrucciones de Uso

### 1. Migración Limpia (Producción/Nueva Instalación)

```powershell
# Desde la carpeta backend
cd C:\Users\PC-JHGR\Desktop\DEV\supercopiasProject\backend

# Opción 1: Usar el script de restauración automatizado
.\scripts\restore-database.ps1

# Opción 2: Ejecutar manualmente
$env:PGPASSWORD='admin'
psql -h localhost -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
```

**Resultado:**
- Base de datos completamente limpia
- Solo el usuario admin configurado
- Lista para entorno de producción

### 2. Migración con Datos de Prueba (Desarrollo)

```powershell
# Desde la carpeta backend
cd C:\Users\PC-JHGR\Desktop\DEV\supercopiasProject\backend

# Paso 1: Restaurar estructura base
$env:PGPASSWORD='admin'
psql -h localhost -U postgres -d supercopias -f BD_SUPERCOPIAS.sql

# Paso 2: Cargar datos de prueba
psql -h localhost -U postgres -d supercopias -f scripts/datos-prueba.sql
```

**Resultado:**
- Base de datos con estructura completa
- Usuario admin
- Datos de prueba cargados para desarrollo

### 3. Reconstruir Base de Datos desde Cero

```powershell
cd C:\Users\PC-JHGR\Desktop\DEV\supercopiasProject\backend

# Eliminar y recrear la base de datos
$env:PGPASSWORD='admin'
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS supercopias;"
psql -h localhost -U postgres -c "CREATE DATABASE supercopias;"

# Restaurar estructura
psql -h localhost -U postgres -d supercopias -f BD_SUPERCOPIAS.sql

# (Opcional) Cargar datos de prueba
psql -h localhost -U postgres -d supercopias -f scripts/datos-prueba.sql
```

## Credenciales de Acceso

### Usuario Administrador (Siempre disponible)
```
Usuario: admin
Contraseña: Admin123!$
Email: admin@supercopias.com
Rol: admin
```

## Mantenimiento del Archivo Maestro

### ¿Cuándo actualizar BD_SUPERCOPIAS.sql?

Actualizar cuando se realicen cambios en:
- ✅ Estructura de tablas (nuevas columnas, índices, constraints)
- ✅ Funciones y triggers
- ✅ Vistas
- ✅ Catálogos del sistema (SAT, módulos, tipos, etc.)
- ❌ **NUNCA** incluir datos de prueba de clientes, empleados, etc.

### Generar nuevo dump limpio

```powershell
cd C:\Users\PC-JHGR\Desktop\DEV\supercopiasProject\backend

# Generar dump de la estructura actual
$env:PGPASSWORD='admin'
pg_dump -h localhost -U postgres -d supercopias --clean --if-exists -F p -f BD_SUPERCOPIAS_new.sql

# Revisar y limpiar manualmente:
# 1. Eliminar datos de prueba (clientes, empleados, proveedores, etc.)
# 2. Mantener solo el usuario admin con la contraseña correcta
# 3. Verificar que los catálogos estén completos
# 4. Resetear secuencias a valores iniciales

# Hacer backup del actual
Copy-Item BD_SUPERCOPIAS.sql BD_SUPERCOPIAS_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Reemplazar
Move-Item BD_SUPERCOPIAS_new.sql BD_SUPERCOPIAS.sql -Force
```

## Archivos de Respaldo

Todos los respaldos generados automáticamente se guardan con timestamp:
- `BD_SUPERCOPIAS_backup_YYYYMMDD_HHMMSS.sql`

## Notas Importantes

1. **Contraseña del usuario admin**: 
   - Hash bcrypt: `$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq`
   - Contraseña en texto plano: `Admin123!$`

2. **Base de datos local**:
   - Host: localhost
   - Puerto: 5432
   - Usuario PostgreSQL: postgres
   - Contraseña PostgreSQL: admin
   - Nombre BD: supercopias

3. **Orden de ejecución**:
   - SIEMPRE ejecutar BD_SUPERCOPIAS.sql primero
   - Luego (opcional) ejecutar datos-prueba.sql

4. **Caracteres especiales**:
   - Los datos de prueba evitan caracteres raros (é, á, ñ, etc.)
   - Usan codificación UTF-8 estándar

## Solución de Problemas

### Error: "relation already exists"
```powershell
# El script BD_SUPERCOPIAS.sql incluye DROP IF EXISTS
# Si persiste el error, eliminar la BD manualmente:
$env:PGPASSWORD='admin'
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS supercopias;"
psql -h localhost -U postgres -c "CREATE DATABASE supercopias;"
psql -h localhost -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
```

### Error: "duplicate key value"
```powershell
# Asegurarse de ejecutar los scripts en orden correcto
# 1. BD_SUPERCOPIAS.sql
# 2. datos-prueba.sql
```

### Verificar que la migración fue exitosa
```powershell
$env:PGPASSWORD='admin'
psql -h localhost -U postgres -d supercopias -c "SELECT COUNT(*) FROM usuarios;"
# Debe retornar 1 (solo el admin)

psql -h localhost -U postgres -d supercopias -c "SELECT username, nombre FROM usuarios;"
# Debe mostrar: admin | Administrador SuperCopias
```

---

**Última actualización**: 8 de diciembre de 2025
**Versión BD_SUPERCOPIAS.sql**: 1.0.0 (Limpia)
