# ✅ Railway Deployment Checklist

## 📝 Pre-Deployment

- [ ] Cuenta Railway.app creada
- [ ] Repositorio en GitHub actualizado
- [ ] Código testeado localmente
- [ ] Variables de entorno documentadas

## 🔧 Railway Setup

- [ ] Proyecto creado en Railway
- [ ] Repositorio GitHub conectado
- [ ] PostgreSQL database agregada
- [ ] Root Directory configurado: `backend`
- [ ] Start Command verificado: `npm start`

## 🗄️ Base de Datos

- [ ] PostgreSQL corriendo en Railway
- [ ] `DATABASE_URL` generada automáticamente
- [ ] Script `BD_SUPERCOPIAS.sql` ejecutado
- [ ] Tablas creadas verificadas
- [ ] Datos de prueba cargados (opcional)

## ⚙️ Variables de Entorno

Configuradas en Railway → Variables:

- [ ] `JWT_SECRET`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `UPLOAD_PATH=./uploads`
- [ ] `MAX_FILE_SIZE=5242880`
- [ ] `LOG_LEVEL=info`
- [ ] `SESSION_TIMEOUT=86400000`
- [ ] `FRONTEND_URL` (actualizar después)
- [ ] `ALLOWED_ORIGINS` (actualizar después)

## 🚀 Backend Deployment

- [ ] Deployment iniciado
- [ ] Build exitoso (sin errores)
- [ ] Aplicación corriendo
- [ ] Logs sin errores críticos
- [ ] Conexión a DB exitosa
- [ ] URL del backend copiada

## 🧪 Testing Backend

Prueba estos endpoints:

- [ ] `GET /` → Información del API
- [ ] `POST /api/auth/login` → Login funciona
- [ ] `GET /api/catalogos/roles` → Obtiene roles
- [ ] `GET /api/clientes` → Lista clientes (con auth)

**Comando de prueba:**
```bash
curl https://tu-backend.railway.app/
```

## 🌐 Frontend Deployment (Opcional)

Si despliegas frontend por separado:

- [ ] Nuevo servicio creado en Railway
- [ ] Root Directory: `frontend`
- [ ] Build Command configurado
- [ ] `environment.prod.ts` actualizado con URL del backend
- [ ] Frontend desplegado
- [ ] URL del frontend copiada

## 🔗 Conexión Frontend-Backend

- [ ] `FRONTEND_URL` actualizada en backend
- [ ] `ALLOWED_ORIGINS` actualizada en backend
- [ ] CORS funcionando correctamente
- [ ] Requests desde frontend funcionan

## 🔐 Seguridad

- [ ] JWT_SECRET es seguro (no default)
- [ ] Variables sensibles no están en el código
- [ ] `.env` en `.gitignore`
- [ ] SSL habilitado (Railway lo hace automáticamente)
- [ ] CORS configurado correctamente

## 📊 Monitoreo

- [ ] Deployment logs revisados
- [ ] No hay errores en logs
- [ ] Uso de recursos dentro del plan
- [ ] Tiempo de respuesta aceptable

## 🎯 Funcionalidad

Prueba estas funcionalidades críticas:

- [ ] Login con usuario existente
- [ ] Registro de nuevo usuario
- [ ] Obtener perfil de usuario
- [ ] CRUD de clientes
- [ ] CRUD de empleados
- [ ] Upload de imágenes de perfil
- [ ] Obtención de catálogos
- [ ] Logout

## 📱 Testing Usuario Final

- [ ] Crear usuario de prueba
- [ ] Login desde navegador
- [ ] Navegar por módulos
- [ ] Crear un cliente
- [ ] Editar un cliente
- [ ] Ver perfil de usuario
- [ ] Cambiar foto de perfil

## 🐛 Troubleshooting

Si algo falla:

- [ ] Revisar logs: Railway → Deployments → View Logs
- [ ] Verificar variables de entorno
- [ ] Verificar conexión a DB
- [ ] Verificar CORS
- [ ] Limpiar cache y redesplegar

## 📚 Documentación

- [ ] README actualizado con URLs de producción
- [ ] Variables de entorno documentadas
- [ ] Proceso de deployment documentado
- [ ] Credenciales de demo creadas (si aplica)

## 🎉 Go Live!

- [ ] Todo funcionando correctamente
- [ ] Usuarios de prueba creados
- [ ] URLs compartidas con el equipo
- [ ] Monitoreo configurado
- [ ] Backup plan definido

---

## 🚨 En caso de emergencia:

**Rollback rápido:**
1. Railway → Deployments
2. Click en deployment anterior que funcionaba
3. Click "Redeploy"

**Ver logs en tiempo real:**
```bash
railway logs --follow
```

**Reiniciar servicio:**
Railway → Settings → Restart

---

## 📞 Soporte

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app/

---

**Fecha de último deployment:** __________
**URL Backend:** __________
**URL Frontend:** __________
**Versión desplegada:** __________

---

¡Éxito en tu deployment! 🚀
