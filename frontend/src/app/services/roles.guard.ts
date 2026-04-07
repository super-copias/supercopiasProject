/**
 * Guard de Roles - SuperCopias
 * Protege rutas basándose en los roles y permisos del usuario
 */

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { RolesService } from './roles.service';
import { PermisosUtils, MODULOS, ACCIONES } from '../shared/utils/permisos.utils';
import { ModuloPermisos } from '../shared/interfaces';

@Injectable({ providedIn: 'root' })
export class RolesGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private rolesService: RolesService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkPermissions(route, state);
  }

  private checkPermissions(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Obtener datos del usuario autenticado
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.redirectToLogin();
      return of(false);
    }

    // Obtener permisos requeridos de la ruta
    const requiredPermissions = this.getRequiredPermissions(route);
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      // Si no se especifican permisos, permitir acceso
      return of(true);
    }

    // Obtener roles del usuario
    const userRoles = currentUser.roles || [];

    // Obtener definiciones de roles y verificar permisos
    return this.rolesService.getAllRoles().pipe(
      map(roles => {
        const hasPermission = this.validatePermissions(
          userRoles,
          roles,
          requiredPermissions,
          route
        );

        if (!hasPermission) {
          this.handleAccessDenied(route, state);
        }

        return hasPermission;
      }),
      catchError(() => {
        this.handleError();
        return of(false);
      })
    );
  }

  /**
   * Obtener permisos requeridos de la configuración de la ruta
   */
  private getRequiredPermissions(route: ActivatedRouteSnapshot): Array<{
    modulo: string;
    accion: keyof ModuloPermisos;
    required?: boolean;
  }> {
    const data = route.data;
    
    // Formato 1: Permiso simple
    if (data['requiredPermission']) {
      const permission = data['requiredPermission'];
      return [{
        modulo: permission.modulo,
        accion: permission.accion,
        required: true
      }];
    }

    // Formato 2: Múltiples permisos
    if (data['requiredPermissions']) {
      return data['requiredPermissions'];
    }

    // Formato 3: Rol específico requerido
    if (data['requiredRole']) {
      return [{
        modulo: 'sistema',
        accion: 'acceder' as keyof ModuloPermisos,
        required: true
      }];
    }

    // Formato 4: Detectar automáticamente por ruta
    return this.detectPermissionsByRoute(route);
  }

  /**
   * Detectar permisos automáticamente basándose en la ruta
   */
  private detectPermissionsByRoute(route: ActivatedRouteSnapshot): Array<{
    modulo: string;
    accion: keyof ModuloPermisos;
    required?: boolean;
  }> {
    const url = route.url.map(segment => segment.path).join('/');
    const permissions: Array<{ modulo: string; accion: keyof ModuloPermisos; required?: boolean }> = [];

    // Mapeo de rutas a permisos
    const routePermissions: { [key: string]: { modulo: string; accion: keyof ModuloPermisos } } = {
      'empleados': { modulo: MODULOS.EMPLEADOS, accion: 'leer' },
      'empleados/create': { modulo: MODULOS.EMPLEADOS, accion: 'crear' },
      'empleados/edit': { modulo: MODULOS.EMPLEADOS, accion: 'actualizar' },
      'clientes': { modulo: MODULOS.CLIENTES, accion: 'leer' },
      'clientes/create': { modulo: MODULOS.CLIENTES, accion: 'crear' },
      'clientes/edit': { modulo: MODULOS.CLIENTES, accion: 'actualizar' },
      'proveedores': { modulo: MODULOS.PROVEEDORES, accion: 'leer' },
      'proveedores/create': { modulo: MODULOS.PROVEEDORES, accion: 'crear' },
      'proveedores/edit': { modulo: MODULOS.PROVEEDORES, accion: 'actualizar' },
      'inventarios': { modulo: MODULOS.INVENTARIOS, accion: 'leer' },
      'ventas': { modulo: MODULOS.VENTAS, accion: 'leer' },
      'reportes': { modulo: MODULOS.REPORTES, accion: 'leer' }
    };

    // Buscar coincidencias exactas
    if (routePermissions[url]) {
      permissions.push({ 
        ...routePermissions[url], 
        required: true 
      });
    } else {
      // Buscar coincidencias parciales
      for (const [routePath, permission] of Object.entries(routePermissions)) {
        if (url.startsWith(routePath)) {
          permissions.push({ 
            ...permission, 
            required: true 
          });
          break;
        }
      }
    }

    return permissions;
  }

  /**
   * Validar permisos del usuario
   */
  private validatePermissions(
    userRoles: string[],
    rolesDefinition: any[],
    requiredPermissions: Array<{
      modulo: string;
      accion: keyof ModuloPermisos;
      required?: boolean;
    }>,
    route: ActivatedRouteSnapshot
  ): boolean {
    // Si el usuario es admin, tiene acceso a todo
    if (PermisosUtils.isAdmin(userRoles)) {
      return true;
    }

    // Verificar rol específico si se requiere
    const requiredRole = route.data['requiredRole'];
    if (requiredRole) {
      if (Array.isArray(requiredRole)) {
        return requiredRole.some(role => userRoles.includes(role));
      } else {
        return userRoles.includes(requiredRole);
      }
    }

    // Verificar permisos específicos
    const requireAllPermissions = route.data['requireAllPermissions'] !== false;

    if (requireAllPermissions) {
      // Requiere TODOS los permisos
      return requiredPermissions.every(permission => 
        PermisosUtils.hasPermission(
          userRoles,
          rolesDefinition,
          permission.modulo,
          permission.accion
        )
      );
    } else {
      // Requiere AL MENOS UNO de los permisos
      return requiredPermissions.some(permission => 
        PermisosUtils.hasPermission(
          userRoles,
          rolesDefinition,
          permission.modulo,
          permission.accion
        )
      );
    }
  }

  /**
   * Manejar acceso denegado
   */
  private handleAccessDenied(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): void {
    
    // Redirigir a página de acceso denegado o dashboard
    const redirectUrl = route.data['accessDeniedRedirect'] || '/dashboard';
    this.router.navigate([redirectUrl], {
      queryParams: { 
        returnUrl: state.url,
        reason: 'insufficient_permissions'
      }
    });
  }

  /**
   * Manejar errores de autenticación
   */
  private handleError(): void {
    this.redirectToLogin();
  }

  /**
   * Redirigir al login
   */
  private redirectToLogin(): void {
    this.router.navigate(['/login']);
  }
}

/**
 * Interface para configuración de permisos en rutas
 */
export interface RoutePermissionConfig {
  requiredPermission?: {
    modulo: string;
    accion: keyof ModuloPermisos;
  };
  requiredPermissions?: Array<{
    modulo: string;
    accion: keyof ModuloPermisos;
    required?: boolean;
  }>;
  requiredRole?: string | string[];
  requireAllPermissions?: boolean;
  accessDeniedRedirect?: string;
}

/**
 * Constantes para configuración común de rutas
 */
export const ROUTE_PERMISSIONS = {
  EMPLEADOS_READ: {
    requiredPermission: {
      modulo: MODULOS.EMPLEADOS,
      accion: 'leer' as keyof ModuloPermisos
    }
  },
  EMPLEADOS_WRITE: {
    requiredPermissions: [
      { modulo: MODULOS.EMPLEADOS, accion: 'crear' as keyof ModuloPermisos },
      { modulo: MODULOS.EMPLEADOS, accion: 'actualizar' as keyof ModuloPermisos }
    ],
    requireAllPermissions: false
  },
  ADMIN_ONLY: {
    requiredRole: 'admin'
  },
  SUPERVISOR_OR_ADMIN: {
    requiredRole: ['admin', 'supervisor']
  },
  VENTAS_MODULE: {
    requiredPermissions: [
      { modulo: MODULOS.VENTAS, accion: 'leer' as keyof ModuloPermisos },
      { modulo: MODULOS.CLIENTES, accion: 'leer' as keyof ModuloPermisos }
    ]
  }
} as const;