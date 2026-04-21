/**
 * Guard de Módulos - SuperCopias
 * Controla el acceso a módulos específicos basado en los permisos del usuario
 */

import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanLoad, 
  CanActivateChild, 
  Route, 
  UrlSegment, 
  Router, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  UrlTree 
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ModuleGuard implements CanActivate, CanLoad, CanActivateChild {
  
  constructor(private auth: AuthService, private router: Router) {}

  /**
   * Verificar si el usuario puede activar una ruta específica
   */
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Primero verificar si está logueado
    if (!this.auth.isLoggedIn()) {
      return this.router.parseUrl('/login');
    }

    // Obtener el módulo requerido desde la configuración de la ruta
    const requiredModule = route.data?.['module'];
    
    if (!requiredModule) {
      // Si no se especifica módulo, permitir acceso (rutas públicas para usuarios logueados)
      return true;
    }

    // Obtener usuario actual
    const user = this.auth.getCurrentUser();
    
    // Si no hay usuario cargado pero está logueado, dar un momento para que se cargue
    if (!user) {
      return true;
    }

    // Verificar permisos del módulo
    if (this.hasModulePermission(requiredModule)) {
      return true;
    }

    // Si no tiene ningún módulo permitido, redirigir a sin-acceso
    const allowedModules = this.getAllowedModules();
    if (allowedModules.length === 0) {
      return this.router.parseUrl('/admin/sin-acceso');
    }

    // Si tiene otros módulos pero no este específico, redirigir al primer módulo permitido
    const firstAllowedModule = allowedModules[0];
    return this.router.parseUrl(`/admin/${firstAllowedModule}`);
  }

  /**
   * Verificar si el usuario puede cargar un módulo
   */
  canLoad(route: Route, segments: UrlSegment[]): boolean | Observable<boolean> | Promise<boolean> {
    // Verificar si está logueado
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }

    // Obtener el módulo requerido
    const requiredModule = route.data?.['module'];
    
    if (!requiredModule) {
      return true;
    }

    // Verificar permisos del módulo
    if (this.hasModulePermission(requiredModule)) {
      return true;
    }

    // Si no tiene ningún módulo permitido, redirigir a sin-acceso
    const allowedModules = this.getAllowedModules();
    if (allowedModules.length === 0) {
      this.router.navigate(['/admin/sin-acceso'], { replaceUrl: true });
      return false;
    }

    // Si tiene otros módulos pero no este específico, redirigir al primer módulo permitido
    const firstAllowedModule = allowedModules[0];
    this.router.navigate([`/admin/${firstAllowedModule}`], { replaceUrl: true });
    return false;
  }

  /**
   * Verificar permisos para rutas hijas
   */
  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.canActivate(childRoute, state);
  }

  /**
   * Verificar si el usuario tiene permisos para un módulo específico
   */
  private hasModulePermission(module: string): boolean {
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      return false;
    }

    // Los administradores tienen acceso a todo
    if (user.role === 'admin') {
      return true;
    }

    // Verificar si el usuario tiene el módulo en sus permisos
    // Necesitamos obtener los datos del empleado asociado
    return this.checkEmployeeModulePermission(user, module);
  }

  /**
   * Verificar permisos del empleado para un módulo específico
   */
  private checkEmployeeModulePermission(user: any, module: string): boolean {
    // Si el usuario tiene información de empleado y módulos permitidos
    if (user.empleadoId && user.modulosPermitidos) {
      return user.modulosPermitidos.includes(module);
    }

    // Si no tiene información de empleado, no tiene acceso a ningún módulo
    return false;
  }

  /**
   * Obtener los módulos permitidos para el usuario actual
   */
  getAllowedModules(): string[] {
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      return [];
    }

    // Los administradores tienen acceso a todo
    if (user.role === 'admin') {
      return [
        'dashboard',
        'empleados', 
        'clientes', 
        'proveedores', 
        'inventarios', 
        'equipos', 
        'reportes', 
        'facturacion',
        'punto_venta'
      ];
    }

    // Devolver módulos específicos del empleado (sin dashboard por defecto)
    return user.modulosPermitidos || [];
  }

  /**
   * Verificar si un módulo específico está permitido
   */
  isModuleAllowed(module: string): boolean {
    return this.getAllowedModules().includes(module);
  }
}