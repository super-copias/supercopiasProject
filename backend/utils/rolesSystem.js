/**
 * Sistema de Roles y Permisos - SuperCopias
 * Define los roles disponibles y sus permisos por módulo
 */

// Definición de módulos del sistema
const MODULOS = {
  DASHBOARD: 'dashboard',
  CLIENTES: 'clientes',
  EMPLEADOS: 'empleados',
  PROVEEDORES: 'proveedores',
  INVENTARIOS: 'inventarios',
  PUNTO_VENTA: 'punto_venta',
  EQUIPOS: 'equipos',
  REPORTES: 'reportes',
  CONFIGURACION: 'configuracion',
  USUARIOS: 'usuarios'
};

// Definición de permisos por acción
const PERMISOS = {
  LEER: 'read',
  CREAR: 'create',
  EDITAR: 'edit',
  ELIMINAR: 'delete',
  ADMINISTRAR: 'admin'
};

// Roles predefinidos del sistema
const ROLES_SISTEMA = {
  // Rol de administrador con acceso completo
  ADMINISTRADOR: {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso completo a todos los módulos del sistema',
    color: '#dc3545',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.CLIENTES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.EMPLEADOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.PROVEEDORES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.INVENTARIOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.PUNTO_VENTA]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.EQUIPOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.REPORTES]: [PERMISOS.LEER, PERMISOS.CREAR],
      [MODULOS.CONFIGURACION]: [PERMISOS.LEER, PERMISOS.EDITAR],
      [MODULOS.USUARIOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR]
    }
  },

  // Supervisor - Acceso a la mayoría de módulos con permisos limitados
  SUPERVISOR: {
    id: 'supervisor',
    nombre: 'Supervisor',
    descripcion: 'Acceso a módulos operativos con permisos de supervisión',
    color: '#fd7e14',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.CLIENTES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR],
      [MODULOS.EMPLEADOS]: [PERMISOS.LEER],
      [MODULOS.PROVEEDORES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR],
      [MODULOS.INVENTARIOS]: [PERMISOS.LEER, PERMISOS.EDITAR],
      [MODULOS.PUNTO_VENTA]: [PERMISOS.LEER, PERMISOS.CREAR],
      [MODULOS.EQUIPOS]: [PERMISOS.LEER, PERMISOS.EDITAR],
      [MODULOS.REPORTES]: [PERMISOS.LEER]
    }
  },

  // Sin permisos - Usuario sin acceso a módulos (solo dashboard básico)
  SIN_PERMISOS: {
    id: 'sin_permisos',
    nombre: 'Sin Permisos',
    descripcion: 'Usuario sin acceso a módulos del sistema',
    color: '#6c757d',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER]
    }
  },

  // Cajero - Solo punto de venta y clientes básico
  CAJERO: {
    id: 'cajero',
    nombre: 'Cajero',
    descripcion: 'Acceso limitado al punto de venta y consulta de clientes',
    color: '#0d6efd',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.CLIENTES]: [PERMISOS.LEER],
      [MODULOS.PUNTO_VENTA]: [PERMISOS.LEER, PERMISOS.CREAR]
    }
  },

  // Roles por módulo específico
  GESTOR_CLIENTES: {
    id: 'gestor_clientes',
    nombre: 'Gestor de Clientes',
    descripcion: 'Especialista en gestión de clientes y relaciones comerciales',
    color: '#6f42c1',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.CLIENTES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.REPORTES]: [PERMISOS.LEER]
    }
  },

  GESTOR_INVENTARIOS: {
    id: 'gestor_inventarios',
    nombre: 'Gestor de Inventarios',
    descripcion: 'Especialista en control de inventarios y equipos',
    color: '#20c997',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.INVENTARIOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.EQUIPOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.PROVEEDORES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR],
      [MODULOS.REPORTES]: [PERMISOS.LEER]
    }
  },

  GESTOR_VENTAS: {
    id: 'gestor_ventas',
    nombre: 'Gestor de Ventas',
    descripcion: 'Especialista en ventas y punto de venta',
    color: '#ffc107',
    permisos: {
      [MODULOS.DASHBOARD]: [PERMISOS.LEER],
      [MODULOS.CLIENTES]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR],
      [MODULOS.PUNTO_VENTA]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.REPORTES]: [PERMISOS.LEER]
    }
  }
};

/**
 * Obtener todos los roles disponibles
 */
function getAllRoles() {
  return Object.values(ROLES_SISTEMA);
}

/**
 * Obtener rol por ID
 */
function getRoleById(roleId) {
  return Object.values(ROLES_SISTEMA).find(role => role.id === roleId);
}

/**
 * Verificar si un conjunto de roles tiene permiso para un módulo y acción
 */
function hasPermission(userRoles, modulo, accion) {
  if (!userRoles || userRoles.length === 0) return false;
  
  return userRoles.some(roleId => {
    const role = getRoleById(roleId);
    if (!role) return false;
    
    const moduloPermisos = role.permisos[modulo];
    if (!moduloPermisos) return false;
    
    return moduloPermisos.includes(accion) || moduloPermisos.includes(PERMISOS.ADMINISTRAR);
  });
}

/**
 * Obtener todos los permisos de un conjunto de roles
 */
function getPermissionsForRoles(userRoles) {
  const allPermisos = {};
  
  userRoles.forEach(roleId => {
    const role = getRoleById(roleId);
    if (role) {
      Object.keys(role.permisos).forEach(modulo => {
        if (!allPermisos[modulo]) {
          allPermisos[modulo] = new Set();
        }
        role.permisos[modulo].forEach(permiso => {
          allPermisos[modulo].add(permiso);
        });
      });
    }
  });
  
  // Convertir Sets a arrays
  Object.keys(allPermisos).forEach(modulo => {
    allPermisos[modulo] = Array.from(allPermisos[modulo]);
  });
  
  return allPermisos;
}

/**
 * Validar que los roles proporcionados existen
 */
function validateRoles(roles) {
  if (!Array.isArray(roles)) return false;
  
  return roles.every(roleId => {
    return Object.values(ROLES_SISTEMA).some(role => role.id === roleId);
  });
}

/**
 * Generar usuario y contraseña para empleado
 */
function generateUserCredentials(empleado) {
  // Validar que el empleado tenga nombre
  if (!empleado || !empleado.nombre) {
    throw new Error('El empleado debe tener un nombre para generar credenciales');
  }

  // Generar username basado en nombre completo
  const nombreCompleto = empleado.nombre.toLowerCase().split(' ');
  
  let username = '';
  if (nombreCompleto.length >= 2) {
    // Si tiene al menos 2 palabras, usar primera letra del primer nombre + primer apellido
    username = nombreCompleto[0].charAt(0) + nombreCompleto[nombreCompleto.length - 1];
  } else {
    // Si solo tiene una palabra, usar las primeras 6 letras
    username = nombreCompleto[0].substring(0, 6);
  }
  
  // Limpiar caracteres especiales
  username = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]/g, '') // Solo letras y números
    .substring(0, 15); // Máximo 15 caracteres
  
  // Generar contraseña temporal
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generar hash de la contraseña
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  return { 
    username, 
    password,
    hashedPassword 
  };
}

module.exports = {
  MODULOS,
  PERMISOS,
  ROLES_SISTEMA,
  getAllRoles,
  getRoleById,
  hasPermission,
  getPermissionsForRoles,
  validateRoles,
  generateUserCredentials
};