# Guía de Despliegue a Producción - SuperCopias

## 📋 Requisitos Previos

- **Node.js** 18+ y npm
- **PostgreSQL** 12+
- **Servidor web** (nginx recomendado)
- **Dominio** configurado

## 🔧 Configuración de Producción

### 1. Backend - Configuración de Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp backend/.env.production.example backend/.env.production

# Editar con valores reales
nano backend/.env.production
```

**Variables críticas a cambiar:**
```env
DB_HOST=tu-servidor-postgres.com
DB_PASSWORD=password_seguro_produccion
JWT_SECRET=tu_clave_super_secreta_produccion_2024
FRONTEND_URL=https://tu-dominio.com
```

### 2. Base de Datos PostgreSQL

```sql
-- Crear usuario y base de datos
CREATE USER supercopias_user WITH PASSWORD 'password_seguro_produccion';
CREATE DATABASE supercopias_prod OWNER supercopias_user;
GRANT ALL PRIVILEGES ON DATABASE supercopias_prod TO supercopias_user;

-- Ejecutar schema
\c supercopias_prod
\i BD_SUPERCOPIAS.sql
```

### 3. Frontend - Build de Producción

```bash
cd frontend/
npm ci --production
npm run build:prod
```

### 4. Backend - Instalación

```bash
cd backend/
npm ci --production
NODE_ENV=production npm start
```

## 🚀 Scripts de Despliegue

### Desarrollo Local
```bash
# Backend
cd backend && npm run dev

# Frontend (nueva terminal)
cd frontend && npm start
```

### Producción
```bash
# Build frontend
cd frontend && npm run build:prod

# Iniciar backend
cd backend && npm run start:prod
```

## 🔒 Seguridad - Lista de Verificación

- [ ] Cambiar `JWT_SECRET` en producción
- [ ] Usar contraseñas fuertes para PostgreSQL
- [ ] Configurar HTTPS en servidor web
- [ ] Limitar `ALLOWED_ORIGINS` a dominios reales
- [ ] Configurar firewall del servidor
- [ ] Backup automático de base de datos

## 📁 Estructura de Archivos de Producción

```
/var/www/supercopias/
├── backend/
│   ├── .env.production    # NO versionar
│   ├── dist/              # Build si aplica
│   └── uploads/           # Archivos subidos
├── frontend/
│   └── dist/              # Build de Angular
└── nginx/
    └── supercopias.conf   # Configuración Nginx
```

## 🌐 Configuración Nginx (Ejemplo)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;
    
    # Certificados SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend estático
    location / {
        root /var/www/supercopias/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## ⚠️ Problemas Comunes

1. **Error de CORS**: Verificar `ALLOWED_ORIGINS` en .env
2. **Base de datos**: Verificar credenciales y conectividad
3. **Archivos estáticos**: Verificar permisos en `/uploads`
4. **Variables de entorno**: No usar valores de desarrollo

## 📊 Monitoreo

- Logs del backend: `/var/log/supercopias/app.log`
- Estado del servicio: `systemctl status supercopias`
- Base de datos: Monitorear conexiones PostgreSQL