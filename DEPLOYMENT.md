# 🚀 Deployment a Producción - SuperCopias

**Guía para desplegar a Railway (QA) o cualquier servidor de producción.**

---

## 📋 Requisitos Previos

- **Node.js** 18+ y npm
- **PostgreSQL** 12+
- **Cuenta en Railway** (para QA) o servidor dedicado
- **Dominio** configurado (opcional)

---

## 🌐 Deployment en Railway (QA)

### 1. Configuración Inicial

1. **Conectar Repositorio**
   - Push de rama QA a GitHub
   - Conectar Railway con el repositorio
   - Seleccionar rama `QA`

2. **Configurar PostgreSQL**
   - Railway > New > Database > PostgreSQL
   - Copiar credenciales generadas

3. **Variables de Entorno**

En Railway Dashboard, configurar:

```env
# Base de Datos (usar credenciales de Railway)
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=xxx-generada-por-railway-xxx
DB_NAME=railway

# Servidor
PORT=3000
NODE_ENV=production

# Seguridad (CAMBIAR)
JWT_SECRET=clave_super_secreta_produccion_2024_railway

# Frontend
FRONTEND_URL=https://supercopias-frontend.railway.app
ALLOWED_ORIGINS=https://supercopias-frontend.railway.app

# Pool de Conexiones
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=60000
DB_ACQUIRE_TIMEOUT=60000
```

### 2. Configurar Build

**Backend** (railway.json):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && npm install && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Frontend**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd frontend && npm install && npm run build:prod && npx http-server dist -p 4200"
  }
}
```

### 3. Ejecutar Schema de Base de Datos

```bash
# Conectarse a PostgreSQL de Railway
psql -h containers-us-west-xxx.railway.app -U postgres -d railway

# Ejecutar schema
\i backend/BD_SUPERCOPIAS.sql
\q
```

### 4. Deploy Automático

- Push a rama `QA` activa deployment automático
- Railway detecta cambios y redeploya
- Monitorear en Railway Dashboard

---

## 🖥️ Deployment en Servidor Dedicado

### 1. Preparación del Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

### 2. Configurar PostgreSQL

```sql
-- Crear usuario y base de datos
sudo -u postgres psql

CREATE USER supercopias_user WITH PASSWORD 'password_seguro_produccion';
CREATE DATABASE supercopias_prod OWNER supercopias_user;
GRANT ALL PRIVILEGES ON DATABASE supercopias_prod TO supercopias_user;
\q

-- Ejecutar schema
psql -U supercopias_user -d supercopias_prod -f backend/BD_SUPERCOPIAS.sql
```

### 3. Configurar Aplicación

```bash
# Clonar repositorio
cd /var/www
git clone https://github.com/tu-usuario/supercopiasProject.git
cd supercopiasProject

# Checkout rama QA
git checkout QA

# Backend
cd backend
npm ci --production
cp .env.example .env
nano .env  # Editar con valores de producción

# Frontend
cd ../frontend
npm ci
npm run build:prod
```

### 4. Variables de Entorno Producción

**backend/.env:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=supercopias_user
DB_PASSWORD=password_seguro_produccion
DB_NAME=supercopias_prod

PORT=3000
NODE_ENV=production

JWT_SECRET=clave_super_secreta_produccion_unica_2024
SESSION_TIMEOUT=86400000

FRONTEND_URL=https://tu-dominio.com
ALLOWED_ORIGINS=https://tu-dominio.com

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

LOG_LEVEL=warn
LOG_FILE=/var/log/supercopias/app.log
```

### 5. Configurar PM2

```bash
cd backend

# Iniciar con PM2
pm2 start index.js --name supercopias-backend

# Auto-iniciar en boot
pm2 startup
pm2 save

# Ver logs
pm2 logs supercopias-backend

# Monitorear
pm2 monit
```

### 6. Configurar Nginx

**`/etc/nginx/sites-available/supercopias`:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    # Certificados SSL (usar Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Frontend (archivos estáticos)
    location / {
        root /var/www/supercopiasProject/frontend/dist/supercopias-frontend;
        try_files $uri $uri/ /index.html;
        
        # Cache para assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/supercopiasProject/backend/uploads/;
    }
}
```

**Habilitar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/supercopias /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configurar SSL con Let's Encrypt

```bash
# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Auto-renovación
sudo certbot renew --dry-run
```

---

## 🔒 Checklist de Seguridad

- [ ] **JWT_SECRET** único y fuerte (min 32 caracteres)
- [ ] **Contraseñas PostgreSQL** fuertes
- [ ] **HTTPS** configurado (certificado SSL)
- [ ] **Firewall** activo (UFW o similar)
- [ ] **ALLOWED_ORIGINS** solo dominios reales
- [ ] **Backups automáticos** de base de datos
- [ ] **Logs** rotados y monitoreados
- [ ] **PM2** configurado para auto-restart
- [ ] **Variables sensibles** no en código
- [ ] **Permisos de archivos** correctos (uploads/)

---

## 📊 Monitoreo y Mantenimiento

### Logs

```bash
# Backend (PM2)
pm2 logs supercopias-backend

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-12-main.log
```

### Backups

```bash
# Backup manual de PostgreSQL
pg_dump -U supercopias_user supercopias_prod > backup_$(date +%Y%m%d).sql

# Backup automático (crontab)
0 2 * * * pg_dump -U supercopias_user supercopias_prod > /backups/db_$(date +\%Y\%m\%d).sql
```

### Actualizar Aplicación

```bash
cd /var/www/supercopiasProject
git pull origin QA

# Backend
cd backend
npm ci --production
pm2 restart supercopias-backend

# Frontend
cd ../frontend
npm ci
npm run build:prod
```

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Ver logs
pm2 logs supercopias-backend

# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar .env
cat backend/.env
```

### Error de CORS
- Verificar `ALLOWED_ORIGINS` en `.env`
- Reiniciar backend: `pm2 restart supercopias-backend`

### Frontend no carga
```bash
# Verificar build
ls -la frontend/dist/

# Verificar nginx
sudo nginx -t
sudo systemctl status nginx
```

### Base de datos no conecta
```bash
# Probar conexión
psql -U supercopias_user -d supercopias_prod

# Verificar credenciales en .env
# Verificar firewall PostgreSQL
```

---

## 📈 Escalabilidad (Futuro)

- **Load Balancer**: Múltiples instancias del backend
- **Redis**: Cache y sesiones
- **CDN**: Archivos estáticos del frontend
- **PostgreSQL Replica**: Lectura/escritura separadas
- **Monitoreo**: New Relic, DataDog, o similar

---

## 🔄 Flujo de Deployment

```
DEV (local)
    ↓ git push
QA (Railway/Servidor)
    ↓ verificación y pruebas
PRODUCCIÓN
```

---

**Para desarrollo local, ver:** [README.md](./README.md)