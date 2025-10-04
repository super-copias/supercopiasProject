# Super Copias - Backend (esqueleto)

Este es un backend minimal para desarrollo del proyecto Super Copias.

Características:
- Node + Express
- Autenticación JWT
- Persistencia simple con lowdb (archivo `db.json`)
- Endpoints básicos para login, clientes y empleados

Instalación (local):

1. cd backend
2. npm install
3. npm run dev

Credenciales por defecto:
- usuario: admin
- contraseña: Admin123!

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
