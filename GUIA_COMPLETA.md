# 🚀 SuperCopias - Migración a PostgreSQL

## 📍 GUÍA PASO A PASO (Solo seguir este archivo)

### PASO 1: Preparación
```bash
cd backend
npm install
```

### PASO 2: Instalar PostgreSQL
```bash
node scripts/install-postgresql.js
```
**¿Qué hace?** Instala PostgreSQL 15 automáticamente y configura todo.

### PASO 3: Crear Schema de Base de Datos
```bash
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
```
**¿Qué hace?** Crea todas las 14 tablas con IDs numéricas en PostgreSQL.

### PASO 4: Migrar Datos
```bash
node scripts/migrate-to-postgres.js
```
**¿Qué hace?** Convierte todos los datos de LowDB a PostgreSQL.

### PASO 5: Iniciar el sistema
```bash
npm start
```
**¡Listo!** SuperCopias ahora funciona con PostgreSQL.

---

## 📂 ARCHIVOS CONSERVADOS (Solo estos son necesarios)

### Backend:
- `BD_SUPERCOPIAS.sql` ← Schema PostgreSQL completo
- `scripts/install-postgresql.js` ← Instalador de PostgreSQL  
- `scripts/migrate-to-postgres.js` ← Migrador de datos
- `backend/README.md` ← Info del backend

### Documentación:
- `GUIA_COMPLETA.md` ← Esta guía (la única necesaria)
- `README.md` ← Info básica del proyecto

---

## 🆘 ¿Algo falló?

**Error de conexión PostgreSQL:**
```bash
Get-Service postgresql*
```

**Re-ejecutar schema:**
```bash
psql -U postgres -d supercopias -f BD_SUPERCOPIAS.sql
```

**Re-ejecutar migración:**
```bash
node scripts/migrate-to-postgres.js
```

---

## ✅ ¿Qué obtienes?

- ✅ PostgreSQL instalado y configurado
- ✅ Base de datos 'supercopias' creada
- ✅ 14 tablas con IDs numéricas (SERIAL)
- ✅ Catálogos SAT oficiales (estados, regímenes fiscales, etc.)
- ✅ Todos los datos migrados correctamente
- ✅ Backend funcionando 100% con PostgreSQL

**¡Solo sigue estos 5 pasos en orden!** 🎯