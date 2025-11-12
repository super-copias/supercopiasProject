# 🚀 Inicio Rápido - SuperCopias

## Uso del Script de Desarrollo

### Iniciar el ambiente completo

```powershell
.\start-dev.ps1
```

Esto iniciará:
- **Backend** en `http://localhost:3000`
- **Frontend** en `http://localhost:4200`

Cada servicio se abrirá en su propia ventana de PowerShell.

### Opciones disponibles

#### Reiniciar servicios
```powershell
.\start-dev.ps1 -Restart
```
Detiene los procesos existentes y los reinicia.

#### Iniciar solo Backend
```powershell
.\start-dev.ps1 -BackendOnly
```

#### Iniciar solo Frontend
```powershell
.\start-dev.ps1 -FrontendOnly
```

#### Ver ayuda
```powershell
.\start-dev.ps1 -Help
```

## Detener los servicios

1. Ve a cada ventana de terminal
2. Presiona `Ctrl+C`
3. O simplemente cierra las ventanas

## Primera vez

Si es la primera vez que ejecutas el proyecto, el script automáticamente:
- Verificará si existen las dependencias (`node_modules`)
- Las instalará si es necesario

## Requisitos previos

- Node.js instalado (v16 o superior)
- PostgreSQL configurado y corriendo
- Variables de entorno configuradas en `backend/.env`

## Variables de entorno del Backend

Asegúrate de tener un archivo `backend/.env` con:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supercopias
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_secret_key
NODE_ENV=development
```

## Solución de problemas

### Error: Puerto ya en uso
Si obtienes un error de puerto en uso, ejecuta:
```powershell
.\start-dev.ps1 -Restart
```

### Error: No se encuentra node_modules
El script instalará automáticamente las dependencias. Si falla:
```powershell
cd backend
npm install
cd ..\frontend
npm install
```

### Error: No se puede conectar a la base de datos
Verifica que PostgreSQL esté corriendo y que las credenciales en `.env` sean correctas.

## Estructura del Proyecto

```
supercopiasProject/
├── start-dev.ps1         # Script de inicio rápido
├── backend/              # API REST (Node.js + Express)
│   ├── index.js
│   ├── package.json
│   └── ...
└── frontend/             # Aplicación web (Angular)
    ├── src/
    ├── package.json
    └── ...
```

## Scripts NPM individuales

### Backend
```powershell
cd backend
npm run dev          # Modo desarrollo con nodemon
npm start            # Modo producción
```

### Frontend
```powershell
cd frontend
npm start            # Desarrollo con proxy
npm run build        # Build de producción
```
