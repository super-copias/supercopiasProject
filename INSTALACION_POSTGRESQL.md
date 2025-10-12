# Guía de Instalación PostgreSQL para SuperCopias

## 🚀 Instalación PostgreSQL en Windows

### Opción 1: Instalador Oficial (Recomendado)
1. **Descargar PostgreSQL**:
   - Ir a: https://www.postgresql.org/download/windows/
   - Descargar el instalador oficial (versión 15 o 16)

2. **Ejecutar Instalación**:
   - Ejecutar el archivo descargado como administrador
   - **Puerto**: 5432 (por defecto)
   - **Usuario**: postgres
   - **Contraseña**: (definir una contraseña segura)
   - **Locale**: Spanish_Mexico o C

3. **Configurar Variables de Entorno**:
   ```bash
   # Agregar a PATH del sistema:
   C:\Program Files\PostgreSQL\16\bin
   ```

### Opción 2: Docker (Alternativa)
```bash
# Ejecutar PostgreSQL en Docker
docker run --name supercopias-postgres \
  -e POSTGRES_DB=supercopias \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=admin123 \
  -p 5432:5432 \
  -d postgres:15
```

## 🔧 Configuración Post-Instalación

### 1. Crear Base de Datos
```sql
-- Conectar como usuario postgres
psql -U postgres

-- Crear base de datos
CREATE DATABASE supercopias 
  WITH ENCODING 'UTF8' 
  LC_COLLATE = 'es_MX.UTF-8' 
  LC_CTYPE = 'es_MX.UTF-8';

-- Salir
\q
```

### 2. Configurar Archivo .env
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=supercopias
```

## ⚡ Ejecutar Migración

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Crear Schema de Base de Datos
```bash
# Ejecutar archivo SQL directamente
psql -U postgres -d supercopias -f BD_SUPERCOPIAS_POSTGRES.sql
```

### 3. Ejecutar Script de Migración
```bash
# Migrar datos desde JSON a PostgreSQL
node scripts/migrate-to-postgres.js
```

### 4. Verificar Migración
```bash
# Conectar a la base de datos
psql -U postgres -d supercopias

# Verificar tablas
\dt

# Verificar datos
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM empleados;
SELECT COUNT(*) FROM clientes;
```

## 🐛 Solución de Problemas

### Error: "role does not exist"
```sql
-- Crear usuario si no existe
CREATE USER postgres WITH PASSWORD 'admin123';
ALTER USER postgres CREATEDB;
```

### Error: "database does not exist"
```sql
-- Crear base de datos manualmente
CREATE DATABASE supercopias;
```

### Error de conexión
1. Verificar que PostgreSQL esté ejecutándose
2. Verificar puerto 5432 disponible
3. Verificar credenciales en .env

## 📋 Comandos Útiles PostgreSQL

```bash
# Listar bases de datos
\l

# Conectar a base de datos
\c supercopias

# Listar tablas
\dt

# Describir tabla
\d usuarios

# Salir
\q
```

## ✅ Verificación Final

Después de la migración, verificar:
1. ✅ Todas las tablas creadas
2. ✅ Datos migrados correctamente
3. ✅ IDs numéricas generadas
4. ✅ Relaciones Foreign Key funcionando
5. ✅ Backend conectándose correctamente

---

**Nota**: Si encuentras problemas, revisa los logs del script de migración en `migration-log.txt`