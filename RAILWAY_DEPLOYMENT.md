# 🚂 GUÍA COMPLETA: Despliegue en Railway.app

## 📋 Tabla de Contenidos
1. [Preparación Inicial](#preparación-inicial)
2. [Configuración de Railway](#configuración-de-railway)
3. [Despliegue del Backend](#despliegue-del-backend)
4. [Configuración de PostgreSQL](#configuración-de-postgresql)
5. [Variables de Entorno](#variables-de-entorno)
6. [Despliegue del Frontend](#despliegue-del-frontend)
7. [Verificación y Pruebas](#verificación-y-pruebas)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Preparación Inicial

### 1. Crear cuenta en Railway.app

1. Ve a [railway.app](https://railway.app/)
2. Haz clic en **"Start a New Project"** o **"Login with GitHub"**
3. Autoriza Railway para acceder a tus repositorios de GitHub
4. **Plan Gratuito incluye:**
   - $5 USD de crédito mensual gratis
   - ~500 horas de ejecución
   - Perfecto para desarrollo y pruebas

### 2. Preparar tu Repositorio Git

Asegúrate de que tu proyecto esté en GitHub:

```bash
# Si aún no has inicializado git
git init
git add .
git commit -m "Preparar proyecto para Railway deployment"

# Si ya tienes git pero no has subido a GitHub
git remote add origin https://github.com/JHGR/supercopiasProject.git
git branch -M main
git push -u origin main
```

---

## 🚀 Configuración de Railway

### Paso 1: Crear Nuevo Proyecto

1. En el dashboard de Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio: **`supercopiasProject`**
4. Railway detectará automáticamente que es un proyecto Node.js

### Paso 2: Configurar PostgreSQL

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway creará automáticamente una base de datos PostgreSQL
4. **IMPORTANTE:** Railway generará automáticamente la variable `DATABASE_URL`

---

## ⚙️ Configuración del Backend

### Paso 1: Variables de Entorno

En Railway, ve a tu servicio de backend → **Variables** → **Raw Editor** y pega:

```env
# Configuración de Base de Datos (Railway lo proporciona automáticamente)
# DATABASE_URL=postgresql://user:password@host:port/database

# Configuración JWT
JWT_SECRET=supercopias_production_secret_2024_railway_secure_key_123456

# Configuración del Servidor
PORT=3000
NODE_ENV=production

# Configuración de Archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Configuración de Logs
LOG_LEVEL=info

# Configuración de Sesión
SESSION_TIMEOUT=86400000

# URLs del Frontend (Actualizar después del deployment)
FRONTEND_URL=https://tu-frontend.railway.app
ALLOWED_ORIGINS=https://tu-frontend.railway.app
```

**⚠️ IMPORTANTE:**
- Railway genera automáticamente `DATABASE_URL` cuando agregas PostgreSQL
- **NO necesitas** configurar `DB_HOST`, `DB_PORT`, `DB_USER`, etc. individualmente
- Actualiza `FRONTEND_URL` después de desplegar el frontend

### Paso 2: Configurar Root Directory

Si Railway no detecta correctamente el backend:

1. Ve a **Settings** → **Service Settings**
2. En **Root Directory**, escribe: `backend`
3. En **Start Command**, escribe: `npm start`

### Paso 3: Importar Base de Datos

Una vez que PostgreSQL esté corriendo:

#### Opción A: Desde Railway Dashboard
1. Ve a tu base de datos PostgreSQL en Railway
2. Haz clic en **"Data"** → **"Query"**
3. Copia y pega el contenido de `backend/BD_SUPERCOPIAS.sql`
4. Ejecuta el script

#### Opción B: Desde tu PC (usando Railway CLI)
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Conectar al proyecto
railway link

# Ejecutar script SQL
railway run psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f backend/BD_SUPERCOPIAS.sql
```

#### Opción C: Usando conexión directa
1. En Railway, ve a PostgreSQL → **Connect** → **PostgreSQL Connection URL**
2. Copia la URL de conexión
3. Usa un cliente como DBeaver, pgAdmin o TablePlus
4. Importa el archivo `BD_SUPERCOPIAS.sql`

---

## 🌐 Configuración del Frontend

### Opción 1: Desplegar Frontend en Railway (Recomendado)

1. En Railway, haz clic en **"+ New"** → **"GitHub Repo"**
2. Selecciona el mismo repositorio
3. Configura el servicio:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build:prod`
   - **Start Command**: `npm install -g http-server && http-server dist/supercopias-frontend -p $PORT`

4. Agrega variables de entorno:
```env
NODE_ENV=production
```

5. Actualiza `frontend/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tu-backend.railway.app/api',  // URL de tu backend en Railway
  name: 'production'
};
```

### Opción 2: Servir Frontend desde Backend

Modifica tu `backend/index.js` para servir archivos estáticos:

```javascript
// Después de los middlewares globales
if (process.env.NODE_ENV === 'production') {
  // Servir archivos estáticos del frontend
  app.use(express.static('../frontend/dist/supercopias-frontend'));
  
  // Redirigir todas las rutas no-API al frontend
  app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist/supercopias-frontend/index.html'));
    }
  });
}
```

---

## ✅ Verificación y Pruebas

### 1. Verificar Backend

1. En Railway, ve a tu servicio de backend
2. Haz clic en **"Deployments"** → Último deployment → **"View Logs"**
3. Deberías ver:
```
✅ PostgreSQL conectado exitosamente
🚀 SuperCopias Server running on port 3000
```

4. Prueba tu API:
```bash
curl https://tu-backend.railway.app/
```

### 2. Verificar Base de Datos

```bash
# Usando Railway CLI
railway run psql -c "SELECT * FROM modulos LIMIT 5;"
```

### 3. Verificar Frontend

Abre tu navegador y ve a la URL de tu frontend en Railway.

---

## 🔧 Actualizar Configuración de database.js

Railway proporciona `DATABASE_URL` en lugar de variables individuales. Actualiza `backend/config/database.js`:

```javascript
// Al inicio del archivo
const { Pool } = require('pg');

// Configuración del pool de conexiones
const dbConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'supercopias',
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_TIMEOUT) || 60000,
      connectionTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      ssl: false
    };
```

---

## 🐛 Troubleshooting

### Error: "Application failed to respond"

**Solución:**
- Verifica que el `PORT` esté configurado correctamente
- Railway asigna un puerto dinámico, usa `process.env.PORT`
- Asegúrate de que el servidor escuche en `0.0.0.0`, no solo `localhost`

### Error: "Cannot connect to database"

**Solución:**
1. Verifica que PostgreSQL esté corriendo en Railway
2. Verifica que `DATABASE_URL` esté en las variables de entorno
3. Revisa los logs: `railway logs`

### Error: "CORS policy blocked"

**Solución:**
Actualiza `FRONTEND_URL` en las variables de entorno del backend con la URL correcta de tu frontend.

### Build fails

**Solución:**
1. Verifica que `package.json` tenga el script `start`
2. Limpia caché: Settings → **"Clear Build Cache"**
3. Redeploy

---

## 📊 Monitoreo

### Ver Logs en Tiempo Real

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Ver logs
railway logs

# Ver logs en tiempo real
railway logs --follow
```

### Metrics

En Railway Dashboard:
- CPU Usage
- Memory Usage
- Network Traffic
- Request Rate

---

## 💰 Gestión de Costos (Plan Gratuito)

**Plan Trial:**
- $5 USD gratis al mes
- ~500 horas de ejecución
- Suficiente para desarrollo y demos

**Optimización:**
- Configura **Sleep on Idle** para servicios no críticos
- Monitorea el uso en Dashboard → **Usage**

---

## 🚀 Siguiente Paso: Deploy Automático

Railway detecta automáticamente cambios en GitHub:

```bash
# Hacer cambios en tu código
git add .
git commit -m "Actualización de funcionalidad"
git push origin main

# Railway automáticamente:
# 1. Detecta el push
# 2. Construye la aplicación
# 3. Despliega automáticamente
```

---

## 📚 Recursos Adicionales

- [Railway Docs](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [PostgreSQL en Railway](https://docs.railway.app/databases/postgresql)
- [Variables de Entorno](https://docs.railway.app/develop/variables)

---

## ✨ Checklist Final

Antes de lanzar a producción:

- [ ] Base de datos PostgreSQL creada en Railway
- [ ] Variables de entorno configuradas
- [ ] Script SQL ejecutado (tablas creadas)
- [ ] Backend desplegado y funcionando
- [ ] Frontend desplegado y conectado al backend
- [ ] CORS configurado correctamente
- [ ] Pruebas de login/registro funcionando
- [ ] Endpoints principales probados
- [ ] Logs sin errores críticos
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL habilitado (Railway lo hace automáticamente)

---

¡Tu aplicación SuperCopias está lista para producción en Railway! 🎉
