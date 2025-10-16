# 🛠️ Railway CLI - Comandos Útiles

## 📥 Instalación

```bash
# Instalar Railway CLI globalmente
npm install -g @railway/cli

# Verificar instalación
railway --version
```

## 🔐 Autenticación

```bash
# Login en Railway
railway login

# Logout
railway logout

# Verificar usuario actual
railway whoami
```

## 🚀 Gestión de Proyectos

```bash
# Listar todos tus proyectos
railway list

# Vincular proyecto actual con Railway
railway link

# Desvincular proyecto
railway unlink

# Ver información del proyecto
railway status
```

## 📊 Deployment y Logs

```bash
# Ver logs del último deployment
railway logs

# Ver logs en tiempo real
railway logs --follow

# Ver logs de un servicio específico
railway logs --service backend

# Desplegar manualmente (normalmente es automático)
railway up
```

## 🗄️ Base de Datos

```bash
# Conectar a PostgreSQL
railway connect postgres

# Ejecutar query SQL
railway run psql -c "SELECT * FROM modulos;"

# Importar SQL desde archivo
railway run psql < backend/BD_SUPERCOPIAS.sql

# Dump de base de datos
railway run pg_dump > backup.sql

# Ver información de la base de datos
railway run psql -c "\dt"

# Ver tablas y sus tamaños
railway run psql -c "\dt+"
```

## ⚙️ Variables de Entorno

```bash
# Ver todas las variables de entorno
railway variables

# Agregar variable
railway variables set JWT_SECRET=mi_secreto_super_seguro

# Eliminar variable
railway variables delete VARIABLE_NAME

# Ejecutar comando con las variables del proyecto
railway run node index.js
```

## 🔧 Desarrollo Local con Railway

```bash
# Ejecutar tu app localmente con las variables de Railway
railway run npm start

# Ejecutar cualquier comando con el contexto de Railway
railway run node scripts/seed-database.js

# Abrir shell con variables de entorno de Railway
railway shell
```

## 🌐 URLs y Dominios

```bash
# Ver URL pública de tu aplicación
railway domain

# Abrir aplicación en el navegador
railway open
```

## 🐛 Debugging

```bash
# Ver información detallada del deployment
railway status --json

# Reiniciar servicio
railway restart

# Ver variables de entorno (sin valores sensibles)
railway variables --json

# Verificar conexión con Railway
railway ping
```

## 📦 Servicios

```bash
# Listar servicios en el proyecto
railway service

# Ver logs de un servicio específico
railway logs --service backend

# Cambiar a un servicio específico
railway service backend
```

## 🔄 Ambientes

```bash
# Listar ambientes
railway environment

# Cambiar de ambiente
railway environment production

# Crear nuevo ambiente
railway environment create staging
```

## 💾 Backups de Base de Datos

```bash
# Backup completo
railway run pg_dump -Fc > backup_$(date +%Y%m%d_%H%M%S).dump

# Backup solo estructura
railway run pg_dump --schema-only > schema.sql

# Backup solo datos
railway run pg_dump --data-only > data.sql

# Restaurar desde backup
railway run pg_restore -d $DATABASE_URL backup.dump
```

## 🧪 Testing

```bash
# Ejecutar tests con variables de Railway
railway run npm test

# Ejecutar en modo desarrollo con Railway
railway run npm run dev

# Ejecutar migraciones
railway run npm run migrate
```

## 📈 Monitoreo

```bash
# Ver uso de recursos
railway metrics

# Ver deployments recientes
railway deployments

# Ver detalles de un deployment específico
railway deployment <deployment-id>
```

## 🚨 Comandos de Emergencia

```bash
# Rollback al deployment anterior
railway rollback

# Reiniciar todos los servicios
railway restart --all

# Limpiar caché de build
railway build --clear-cache

# Ver errores recientes
railway logs --level error
```

## 🔍 Comandos de Inspección

```bash
# Ver todas las configuraciones del proyecto
railway status --verbose

# Ver variables de entorno (formato JSON)
railway variables --json

# Ver información del servicio actual
railway service --json

# Verificar estado de la base de datos
railway run psql -c "SELECT version();"
railway run psql -c "SELECT current_database();"
railway run psql -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

## 📝 Ejemplos Prácticos

### Importar Base de Datos

```bash
# Desde tu máquina local
railway run psql < backend/BD_SUPERCOPIAS.sql

# O conectarte directamente
railway connect postgres
# Luego dentro de psql:
\i /ruta/a/BD_SUPERCOPIAS.sql
```

### Ver Logs Filtrados

```bash
# Solo errores
railway logs --level error

# Últimas 100 líneas
railway logs --tail 100

# Desde hace 1 hora
railway logs --since 1h
```

### Ejecutar Script de Migración

```bash
# Con las variables de Railway
railway run node backend/scripts/migrate-to-postgres.js
```

### Verificar Conectividad

```bash
# Verificar conexión a base de datos
railway run node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows); pool.end(); });"
```

### Seed de Datos

```bash
# Insertar módulos
railway run psql < backend/scripts/insertar-modulos.sql
```

## 🎯 Workflow Recomendado

```bash
# 1. Iniciar sesión
railway login

# 2. Vincular proyecto
railway link

# 3. Ver estado
railway status

# 4. Ejecutar localmente con variables de Railway
railway run npm run dev

# 5. Ver logs en tiempo real
railway logs --follow

# 6. Si hay problemas, rollback
railway rollback
```

## 💡 Tips Avanzados

### Alias útiles (agregar a .bashrc o .zshrc)

```bash
alias rl="railway logs --follow"
alias rs="railway status"
alias rdb="railway connect postgres"
alias rrun="railway run"
alias rdeploy="git push && railway up"
```

### Script de Deployment Automático

```bash
#!/bin/bash
# deploy.sh
git add .
git commit -m "Deploy: $(date)"
git push origin main
railway logs --follow
```

## 📚 Recursos

- Docs: https://docs.railway.app/develop/cli
- Changelog: https://github.com/railwayapp/cli/releases
- Issues: https://github.com/railwayapp/cli/issues

---

**Comandos más usados:**

```bash
railway login          # Iniciar sesión
railway link           # Vincular proyecto
railway logs -f        # Ver logs en tiempo real
railway run psql       # Conectar a base de datos
railway variables      # Ver variables
railway status         # Ver estado del proyecto
```

¡Domina Railway CLI! 🚂
