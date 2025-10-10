/**
 * Utilidades de Permisos - SuperCopias
 * Funciones de ayuda para validación de permisos en componentes
 */

import { RolSistema, ModuloPermisos } from '../interfaces';

/**
 * Clase utilitaria para manejo de permisos
 */
export class PermisosUtils {
  
  /**
   * Verificar si un usuario tiene permiso para una acción específica
   */
  static hasPermission(
    userRoles: string[],
    rolesDefinition: RolSistema[],
    modulo: string,
    accion: keyof ModuloPermisos
  ): boolean {
    // Si tiene rol admin, tiene todos los permisos
    if (userRoles.includes('admin')) {
      return true;
    }

    // Verificar si alguno de los roles del usuario tiene el permiso requerido
    return userRoles.some(rolId => {
      const rol = rolesDefinition.find(r => r.id === rolId);
      if (!rol || !rol.permisos[modulo]) {
        return false;
      }
      return rol.permisos[modulo][accion] === true;
    });
  }

  /**
   * Obtener todos los permisos combinados de un usuario
   */
  static getCombinedPermissions(
    userRoles: string[],
    rolesDefinition: RolSistema[]
  ): Record<string, ModuloPermisos> {
    const combinedPermisos: Record<string, ModuloPermisos> = {};

    userRoles.forEach(rolId => {
      const rol = rolesDefinition.find(r => r.id === rolId);
      if (rol && rol.permisos) {
        Object.keys(rol.permisos).forEach(modulo => {
          if (!combinedPermisos[modulo]) {
            combinedPermisos[modulo] = {
              crear: false,
              leer: false,
              actualizar: false,
              eliminar: false,
              administrar: false
            };
          }

          // Combinar permisos (OR lógico)
          const permisoModulo = rol.permisos[modulo];
          Object.keys(permisoModulo).forEach(accion => {
            if (permisoModulo[accion as keyof ModuloPermisos]) {
              combinedPermisos[modulo][accion as keyof ModuloPermisos] = true;
            }
          });
        });
      }
    });

    return combinedPermisos;
  }

  /**
   * Verificar si un usuario puede acceder a un módulo
   */
  static canAccessModule(
    userRoles: string[],
    rolesDefinition: RolSistema[],
    modulo: string
  ): boolean {
    const permissions = this.getCombinedPermissions(userRoles, rolesDefinition);
    return permissions[modulo] && 
           Object.values(permissions[modulo]).some(permiso => permiso === true);
  }

  /**
   * Obtener módulos accesibles para un usuario
   */
  static getAccessibleModules(
    userRoles: string[],
    rolesDefinition: RolSistema[]
  ): string[] {
    const permissions = this.getCombinedPermissions(userRoles, rolesDefinition);
    return Object.keys(permissions).filter(modulo => 
      Object.values(permissions[modulo]).some(permiso => permiso === true)
    );
  }

  /**
   * Verificar múltiples permisos a la vez
   */
  static hasMultiplePermissions(
    userRoles: string[],
    rolesDefinition: RolSistema[],
    checks: Array<{ modulo: string; accion: keyof ModuloPermisos; required?: boolean }>
  ): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};
    
    checks.forEach(check => {
      const key = `${check.modulo}_${String(check.accion)}`;
      results[key] = this.hasPermission(userRoles, rolesDefinition, check.modulo, check.accion);
    });
    
    return results;
  }

  /**
   * Verificar si un usuario puede realizar todas las acciones requeridas
   */
  static canPerformAllActions(
    userRoles: string[],
    rolesDefinition: RolSistema[],
    requiredPermissions: Array<{ modulo: string; accion: keyof ModuloPermisos }>
  ): boolean {
    return requiredPermissions.every(permission =>
      this.hasPermission(userRoles, rolesDefinition, permission.modulo, permission.accion)
    );
  }

  /**
   * Verificar si un usuario puede realizar al menos una de las acciones
   */
  static canPerformAnyAction(
    userRoles: string[],
    rolesDefinition: RolSistema[],
    permissions: Array<{ modulo: string; accion: keyof ModuloPermisos }>
  ): boolean {
    return permissions.some(permission =>
      this.hasPermission(userRoles, rolesDefinition, permission.modulo, permission.accion)
    );
  }

  /**
   * Obtener nivel de acceso para ordenamiento
   */
  static getAccessLevel(userRoles: string[]): number {
    if (userRoles.includes('admin')) return 100;
    if (userRoles.includes('supervisor')) return 80;
    if (userRoles.some(rol => rol.startsWith('gestor_'))) return 60;
    if (userRoles.includes('operador')) return 40;
    if (userRoles.includes('cajero')) return 20;
    return 10;
  }

  /**
   * Filtrar datos según permisos de lectura
   */
  static filterDataByReadPermission<T extends { id: string }>(
    data: T[],
    userRoles: string[],
    rolesDefinition: RolSistema[],
    dataModule: string
  ): T[] {
    if (!this.hasPermission(userRoles, rolesDefinition, dataModule, 'leer')) {
      return [];
    }
    return data;
  }

  /**
   * Verificar si un usuario es administrador
   */
  static isAdmin(userRoles: string[]): boolean {
    return userRoles.includes('admin');
  }

  /**
   * Verificar si un usuario tiene roles de supervisión
   */
  static isSupervisor(userRoles: string[]): boolean {
    return userRoles.includes('admin') || userRoles.includes('supervisor');
  }

  /**
   * Generar mensaje de error por falta de permisos
   */
  static getPermissionErrorMessage(modulo: string, accion: string): string {
    const moduloNames: { [key: string]: string } = {
      empleados: 'Empleados',
      clientes: 'Clientes',
      proveedores: 'Proveedores',
      inventarios: 'Inventarios',
      ventas: 'Ventas',
      reportes: 'Reportes',
      configuracion: 'Configuración'
    };

    const accionNames: { [key: string]: string } = {
      crear: 'crear',
      leer: 'ver',
      actualizar: 'editar',
      eliminar: 'eliminar',
      administrar: 'administrar'
    };

    const moduloName = moduloNames[modulo] || modulo;
    const accionName = accionNames[accion] || accion;

    return `No tienes permisos para ${accionName} ${moduloName.toLowerCase()}`;
  }
}

/**
 * Decorator para verificar permisos en métodos de componentes
 */
export function RequirePermission(modulo: string, accion: keyof ModuloPermisos) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Esta implementación sería completada según el contexto del componente
      // Por ahora, solo registramos la verificación
      console.log(`Verificando permiso: ${modulo}.${String(accion)} para método ${String(propertyKey)}`);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Constantes de módulos del sistema
 */
export const MODULOS = {
  EMPLEADOS: 'empleados',
  CLIENTES: 'clientes',
  PROVEEDORES: 'proveedores',
  INVENTARIOS: 'inventarios',
  VENTAS: 'ventas',
  REPORTES: 'reportes',
  CONFIGURACION: 'configuracion'
} as const;

/**
 * Constantes de acciones del sistema
 */
export const ACCIONES = {
  CREAR: 'crear',
  LEER: 'leer',
  ACTUALIZAR: 'actualizar',
  ELIMINAR: 'eliminar',
  ADMINISTRAR: 'administrar'
} as const;

/**
 * Permisos comunes predefinidos
 */
export const PERMISOS_COMUNES = {
  LECTURA_BASICA: [
    { modulo: MODULOS.EMPLEADOS, accion: ACCIONES.LEER as keyof ModuloPermisos },
    { modulo: MODULOS.CLIENTES, accion: ACCIONES.LEER as keyof ModuloPermisos }
  ],
  GESTION_COMPLETA: [
    { modulo: MODULOS.EMPLEADOS, accion: ACCIONES.ADMINISTRAR as keyof ModuloPermisos },
    { modulo: MODULOS.CLIENTES, accion: ACCIONES.ADMINISTRAR as keyof ModuloPermisos },
    { modulo: MODULOS.PROVEEDORES, accion: ACCIONES.ADMINISTRAR as keyof ModuloPermisos }
  ],
  SOLO_VENTAS: [
    { modulo: MODULOS.VENTAS, accion: ACCIONES.CREAR as keyof ModuloPermisos },
    { modulo: MODULOS.CLIENTES, accion: ACCIONES.LEER as keyof ModuloPermisos },
    { modulo: MODULOS.INVENTARIOS, accion: ACCIONES.LEER as keyof ModuloPermisos }
  ]
} as const;