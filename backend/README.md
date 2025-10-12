# 🚀 SuperCopias Backend

Backend con Node.js + Express + PostgreSQL.

## 🎯 Para Migrar a PostgreSQL

**➡️ Ve al directorio raíz y sigue: `../GUIA_COMPLETA.md`**

## � Después de la Migración

```bash
npm start  # Iniciar servidor
```

## 📡 API Endpoints

- `POST /api/auth/login` - Login
- `GET /api/catalogos/estados` - Estados México  
- `GET /api/empleados` - Empleados
- `GET /api/clientes` - Clientes

**¡Sigue la GUIA_COMPLETA.md para migrar!** 🎯

Endpoints básicos:
- POST /api/auth/login { username, password }
- GET /api/clientes
- POST /api/clientes
- GET /api/empleados
- POST /api/empleados
 - POST /api/empleados/import (multipart/form-data file) -> importar empleados desde Excel (solo admin)
 - POST /api/empleados/:id/role { role, createUser?, username?, password? } -> asignar rol a empleado (solo admin)

Notas:
- Este esqueleto es para desarrollo local. Para producción considera usar una base de datos real y prácticas de seguridad.
