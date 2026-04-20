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
  USUARIOS: 'usuarios',
  FACTURACION: 'facturacion'
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
      [MODULOS.USUARIOS]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR],
      [MODULOS.FACTURACION]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR, PERMISOS.ELIMINAR, PERMISOS.ADMINISTRAR]
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
      [MODULOS.REPORTES]: [PERMISOS.LEER],
      [MODULOS.FACTURACION]: [PERMISOS.LEER, PERMISOS.CREAR, PERMISOS.EDITAR]
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
      [MODULOS.PUNTO_VENTA]: [PERMISOS.LEER, PERMISOS.CREAR],
      [MODULOS.FACTURACION]: [PERMISOS.LEER]
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
      [MODULOS.REPORTES]: [PERMISOS.LEER],
      [MODULOS.FACTURACION]: [PERMISOS.LEER]
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
      [MODULOS.REPORTES]: [PERMISOS.LEER],
      [MODULOS.FACTURACION]: [PERMISOS.LEER, PERMISOS.CREAR]
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
async function generateUserCredentials(empleado) {
  // Validar que el empleado tenga nombre
  if (!empleado || !empleado.nombre) {
    throw new Error('El empleado debe tener un nombre para generar credenciales');
  }

  const { query } = require('../config/database');

  // Obtener todos los usuarios para encontrar el siguiente consecutivo
  const result = await query('SELECT username FROM usuarios WHERE username IS NOT NULL');
  const usuarios = result.rows;
  
  // Filtrar usuarios que siguen el patrón de consecutivo (ej: 001.Nombre, 0001.Ana, A0001.Pedro, etc.)
  const usuariosConsecutivos = usuarios.filter(u => 
    u.username && /^([A-Z]?\d{3,4})\.[A-Za-z]+/.test(u.username)
  );
  
  // Encontrar el número más alto
  let maxConsecutivo = 0;
  usuariosConsecutivos.forEach(u => {
    const match = u.username.match(/^([A-Z]?\d{3,4})\./);
    if (match) {
      const consecutivoParte = match[1];
      let num;
      
      if (/^[A-Z]/.test(consecutivoParte)) {
        // Formato con letra (ej: A0001)
        const letra = consecutivoParte.charAt(0);
        const numero = parseInt(consecutivoParte.substring(1));
        // Convertir a número global: A0001 = 10001, B0001 = 20000, etc.
        num = 10000 + (letra.charCodeAt(0) - 65) * 9999 + numero - 1;
      } else {
        // Formato numérico simple (ej: 001, 0001)
        num = parseInt(consecutivoParte);
      }
      
      if (num > maxConsecutivo) {
        maxConsecutivo = num;
      }
    }
  });
  
  // El siguiente consecutivo
  const siguienteConsecutivo = maxConsecutivo + 1;
  
  // Determinar si usar 3 o 4 dígitos
  let consecutivoStr;
  if (siguienteConsecutivo <= 999) {
    // Usar 3 dígitos para números del 1 al 999
    consecutivoStr = siguienteConsecutivo.toString().padStart(3, '0');
  } else if (siguienteConsecutivo <= 9999) {
    // Expandir a 4 dígitos para números del 1000 al 9999
    consecutivoStr = siguienteConsecutivo.toString().padStart(4, '0');
  } else {
    // Si se agotan los 4 dígitos, usar formato con prefijo
    // Ejemplo: A0001.Nombre, B0001.Nombre, etc.
    const letra = String.fromCharCode(65 + Math.floor((siguienteConsecutivo - 10000) / 9999)); // A, B, C...
    const numero = ((siguienteConsecutivo - 10000) % 9999) + 1;
    consecutivoStr = `${letra}${numero.toString().padStart(4, '0')}`;
  }
  
  // Detectar primer nombre
  const nombreCompleto = empleado.nombre.trim();
  const partesNombre = nombreCompleto.split(/\s+/);
  let primerNombre = partesNombre[0];
  
  // Capitalizar solo la primera letra del nombre
  primerNombre = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
  
  // Limpiar caracteres especiales del nombre
  primerNombre = primerNombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^A-Za-z]/g, ''); // Solo letras
  
  // Generar username con formato adaptable
  const username = `${consecutivoStr}.${primerNombre}`;
  
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