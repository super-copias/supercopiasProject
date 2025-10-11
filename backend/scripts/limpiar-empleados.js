/**
 * Script para limpiar empleados y crear 3 ejemplos
 */
const fs = require('fs');
const path = require('path');

// Leer el archivo db.json actual
const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Limpiar empleados y crear solo 3 ejemplos
db.empleados = [
  {
    "id": "EMP_SIN_PERMISOS",
    "nombre": "Juan Carlos Pérez Mendoza",
    "telefono": "961-100-0001",
    "email": "juan.perez@supercopias.com",
    "puesto": "Operador de Equipos",
    "sucursal": "Sucursal Centro",
    "salario": 15000,
    "fechaIngreso": "2024-01-15",
    "numeroEmpleado": "E001",
    "activo": true,
    "fechaBaja": null,
    "roles": [],
    "tieneUsuario": false,
    "usuarioId": null,
    "tipoPermiso": "sin_permisos",
    "modulosPermitidos": [],
    "permisos": [],
    "fechaAsignacionPermisos": "2024-01-15T08:00:00.000Z",
    "fechaRegistro": "2024-01-15T08:00:00.000Z",
    "fechaModificacion": null
  },
  {
    "id": "EMP_ADMINISTRADOR",
    "nombre": "María Elena García Rodríguez",
    "telefono": "961-100-0002",
    "email": "maria.garcia@supercopias.com",
    "puesto": "Gerente General",
    "sucursal": "Sucursal Centro",
    "salario": 45000,
    "fechaIngreso": "2023-06-01",
    "numeroEmpleado": "E002",
    "activo": true,
    "fechaBaja": null,
    "roles": ["admin"],
    "tieneUsuario": true,
    "usuarioId": "USR_ADMIN_001",
    "tipoPermiso": "administrador",
    "modulosPermitidos": [
      "dashboard",
      "empleados", 
      "clientes",
      "proveedores",
      "inventarios",
      "equipos",
      "reportes",
      "puntoventa"
    ],
    "permisos": [],
    "fechaAsignacionPermisos": "2023-06-01T08:00:00.000Z",
    "fechaRegistro": "2023-06-01T08:00:00.000Z",
    "fechaModificacion": null
  },
  {
    "id": "EMP_PERSONALIZADO",
    "nombre": "Carlos Roberto Hernández López",
    "telefono": "961-100-0003",
    "email": "carlos.hernandez@supercopias.com",
    "puesto": "Asesor de Ventas",
    "sucursal": "Sucursal Norte",
    "salario": 22000,
    "fechaIngreso": "2024-03-10",
    "numeroEmpleado": "E003",
    "activo": true,
    "fechaBaja": null,
    "roles": ["empleado"],
    "tieneUsuario": true,
    "usuarioId": "USR_EMPLEADO_001",
    "tipoPermiso": "personalizado",
    "modulosPermitidos": ["dashboard", "clientes"],
    "permisos": [],
    "fechaAsignacionPermisos": "2024-03-10T08:00:00.000Z",
    "fechaRegistro": "2024-03-10T08:00:00.000Z",
    "fechaModificacion": null
  }
];

// También agregar usuarios correspondientes si no existen
const usuariosExistentes = db.usuarios || [];

// Agregar usuario administrador para el empleado administrador
const usuarioAdmin = {
  "id": "USR_ADMIN_001",
  "username": "mgarciar",
  "nombre": "María Elena García Rodríguez",
  "email": "maria.garcia@supercopias.com",
  "password": "$2a$10$example.hash.for.demo.password123", // Hash de ejemplo
  "roles": ["admin"],
  "empleadoId": "EMP_ADMINISTRADOR",
  "activo": true,
  "fechaRegistro": "2023-06-01T08:00:00.000Z",
  "fechaModificacion": null,
  "ultimoAcceso": null,
  "fullName": "María Elena García Rodríguez",
  "phone": "961-100-0002",
  "bio": "Gerente General - Administrador del sistema",
  "profileImage": ""
};

// Agregar usuario empleado para el empleado personalizado
const usuarioEmpleado = {
  "id": "USR_EMPLEADO_001",
  "username": "chernandez",
  "nombre": "Carlos Roberto Hernández López",
  "email": "carlos.hernandez@supercopias.com",
  "password": "$2a$10$example.hash.for.demo.password456", // Hash de ejemplo
  "roles": ["empleado"],
  "empleadoId": "EMP_PERSONALIZADO",
  "activo": true,
  "fechaRegistro": "2024-03-10T08:00:00.000Z",
  "fechaModificacion": null,
  "ultimoAcceso": null,
  "fullName": "Carlos Roberto Hernández López",
  "phone": "961-100-0003",
  "bio": "Asesor de Ventas - Acceso a Dashboard y Clientes",
  "profileImage": ""
};

// Verificar si los usuarios ya existen antes de agregar
const adminExists = usuariosExistentes.find(u => u.id === "USR_ADMIN_001");
const empleadoExists = usuariosExistentes.find(u => u.id === "USR_EMPLEADO_001");

if (!adminExists) {
  db.usuarios.push(usuarioAdmin);
}

if (!empleadoExists) {
  db.usuarios.push(usuarioEmpleado);
}

// Guardar el archivo actualizado
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log('✅ Base de datos actualizada exitosamente');
console.log('📊 Empleados creados:');
console.log('  1. Juan Carlos Pérez Mendoza (Sin permisos - Sin acceso a módulos)');
console.log('  2. María Elena García Rodríguez (Administrador)');
console.log('  3. Carlos Roberto Hernández López (Personalizado: dashboard + clientes)');
console.log('👥 Usuarios del sistema creados para empleados con permisos');