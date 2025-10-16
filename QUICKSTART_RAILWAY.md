# 🚀 Quick Start: Railway Deployment

## ⚡ Pasos Rápidos (15 minutos)

### 1️⃣ Crear Cuenta Railway
- Ve a [railway.app](https://railway.app/)
- Login con GitHub
- Autoriza acceso a tus repositorios

### 2️⃣ Crear Proyecto y Base de Datos
```
1. Click "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Elige: supercopiasProject
4. Click "+ New" → "Database" → "Add PostgreSQL"
```

### 3️⃣ Configurar Variables de Entorno

En Railway → Tu Servicio → **Variables** → **Raw Editor**, pega:

```env
JWT_SECRET=supercopias_production_secret_2024_railway_secure_key_123456
PORT=3000
NODE_ENV=production
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
LOG_LEVEL=info
SESSION_TIMEOUT=86400000
FRONTEND_URL=*
ALLOWED_ORIGINS=*
```

### 4️⃣ Configurar Root Directory

Railway → Settings → **Root Directory**: `backend`

### 5️⃣ Importar Base de Datos

**Opción A - Desde Dashboard:**
1. PostgreSQL → **Data** → **Query**
2. Copia contenido de `backend/BD_SUPERCOPIAS.sql`
3. Ejecuta

**Opción B - Railway CLI:**
```bash
npm i -g @railway/cli
railway login
railway link
railway run psql < backend/BD_SUPERCOPIAS.sql
```

### 6️⃣ Deploy!

Railway despliega automáticamente. Verifica en **Deployments** → **Logs**

Deberías ver:
```
✅ PostgreSQL conectado exitosamente
🚀 SuperCopias Server running on port 3000
```

### 7️⃣ Probar tu API

```bash
curl https://tu-proyecto.railway.app/
```

---

## 📖 Documentación Completa

Para instrucciones detalladas, consulta: **`RAILWAY_DEPLOYMENT.md`**

---

## 🆘 Problemas Comunes

**Error: Cannot connect to database**
- Verifica que PostgreSQL esté corriendo en Railway
- Railway genera `DATABASE_URL` automáticamente

**Error: Application failed to respond**
- Verifica Root Directory: `backend`
- Verifica Start Command: `npm start`

**Error: Port already in use**
- Railway asigna puerto automáticamente
- Tu código usa `process.env.PORT` ✅

---

## 💡 Tips

✅ Railway detecta cambios en GitHub y redeploya automáticamente
✅ Puedes tener múltiples ambientes (development, staging, production)
✅ Los logs están en tiempo real
✅ SSL es automático

---

## 📊 Plan Gratuito

- $5 USD gratis/mes
- ~500 horas de ejecución
- Perfecto para desarrollo y demos
- PostgreSQL incluido

---

¡Listo para producción! 🎉
