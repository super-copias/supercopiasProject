# SuperCopias

Sistema de gestión integral con Angular 16 + Node.js + PostgreSQL.

## Inicio Rápido - Desarrollo Local

### 1. Base de Datos
```bash
# Crear base de datos
psql -U postgres -c "CREATE DATABASE supercopias;"

# Restaurar dump
cd backend
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Editar .env y configurar DB_PASSWORD
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

### 4. Acceder
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api
- Login: `admin` / `admin123`

---

## Estructura

```
backend/           # Node.js + Express API
  .env.example     # Template de configuración
  BD_SUPERCOPIAS.sql  # Dump completo de DB
frontend/          # Angular 16 app
```

## Flujo Git

```
DEV  QA  main
```

## Stack

- Angular 16 + TypeScript
- Node.js + Express + JWT
- PostgreSQL
- Railway (deploy)
