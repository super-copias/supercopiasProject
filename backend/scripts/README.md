# 📁 Scripts del Backend - SuperCopias

Este directorio contiene scripts esenciales para la gestión de la base de datos PostgreSQL.

---

## 📂 Archivos Disponibles

### 🔧 `db-manager.ps1` (Windows)
**Script unificado para gestionar la base de datos PostgreSQL**

#### Restaurar base de datos
```powershell
.\db-manager.ps1 restore
```
- Elimina y recrea la base de datos con encoding UTF-8
- Restaura desde `BD_SUPERCOPIAS.sql`
- Verifica encoding y muestra resumen de tablas

#### Exportar base de datos
```powershell
.\db-manager.ps1 export
```
- Exporta la BD actual con encoding UTF-8
- Crea backup automático (`BD_SUPERCOPIAS_backup.sql`)
- Actualiza `BD_SUPERCOPIAS.sql`

#### Mostrar ayuda
```powershell
.\db-manager.ps1 help
```

**Características:**
- ✅ Manejo correcto de UTF-8 (acentos, ñ, etc.)
- ✅ Confirmación antes de acciones destructivas
- ✅ Backups automáticos al exportar
- ✅ Mensajes de progreso claros

---

### 🐧 `reload-database.sh` (macOS / Linux)
**Equivalente de `db-manager.ps1` para entornos Unix**

```bash
# Desde el directorio backend/scripts
./reload-database.sh
```

- Lee credenciales del archivo `backend/.env` si existe
- Elimina y recrea la base de datos con encoding UTF-8
- Restaura desde `BD_SUPERCOPIAS.sql`
- Verifica caracteres especiales (acentos, ñ, etc.)

---

## 📚 Archivo Maestro de Base de Datos

**Ubicación:** `backend/BD_SUPERCOPIAS.sql`

Archivo único que contiene:
- ✅ Estructura completa de todas las tablas
- ✅ Todos los catálogos SAT
- ✅ Índices, constraints y foreign keys
- ✅ Triggers y funciones
- ✅ Datos iniciales del sistema (módulos, puestos, sucursales, usuario admin)
- ❌ No contiene datos de prueba (clientes, empleados, proveedores, inventarios)

### Credenciales del usuario administrador
| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `Admin123!$` |
| Email | `admin@supercopias.com` |

### ¿Cuándo actualizar BD_SUPERCOPIAS.sql?

Actualizar cuando se realizan cambios en:
- ✅ Estructura de tablas (columnas, índices, constraints)
- ✅ Funciones y triggers
- ✅ Vistas
- ✅ Catálogos del sistema (SAT, módulos, puestos, etc.)
- ❌ **Nunca** incluir datos de clientes, empleados, proveedores, etc.

Para actualizar, ejecutar desde `backend/scripts`:
```powershell
# Windows
.\db-manager.ps1 export

# macOS/Linux — equivalente manual
pg_dump -U postgres --encoding=UTF8 --no-owner --no-acl --clean --if-exists -d supercopias -f ../BD_SUPERCOPIAS.sql
```
