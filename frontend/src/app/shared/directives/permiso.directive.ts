/**
 * Directiva de Permisos - SuperCopias
 * Muestra u oculta elementos del DOM basándose en los permisos del usuario
 */

import { 
  Directive, 
  Input, 
  TemplateRef, 
  ViewContainerRef, 
  OnInit, 
  OnDestroy 
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { RolesService } from '../../services/roles.service';
import { PermisosUtils } from '../utils/permisos.utils';
import { ModuloPermisos } from '../interfaces';

@Directive({
  selector: '[appPermiso]'
})
export class PermisoDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() appPermiso: string = '';
  @Input() appPermisoModulo: string = '';
  @Input() appPermisoAccion: keyof ModuloPermisos = 'leer';
  @Input() appPermisoRoles: string | string[] = '';
  @Input() appPermisoRequireAll: boolean = true;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private rolesService: RolesService
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    
    // Reaccionar a cambios en la autenticación
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkPermissions();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.hideElement();
      return;
    }

    const userRoles = currentUser.roles || [currentUser.role];
    let shouldShow = false;

    // Verificar por roles específicos
    if (this.appPermisoRoles) {
      shouldShow = this.checkRoles(userRoles);
    }
    // Verificar por módulo y acción
    else if (this.appPermisoModulo && this.appPermisoAccion) {
      shouldShow = this.checkModulePermission(userRoles);
    }
    // Verificar por permiso completo (formato: "modulo.accion")
    else if (this.appPermiso) {
      shouldShow = this.checkFullPermission(userRoles);
    }
    // Si no se especifica nada, mostrar por defecto
    else {
      shouldShow = true;
    }

    if (shouldShow) {
      this.showElement();
    } else {
      this.hideElement();
    }
  }

  /**
   * Verificar por roles específicos
   */
  private checkRoles(userRoles: string[]): boolean {
    const requiredRoles = Array.isArray(this.appPermisoRoles) 
      ? this.appPermisoRoles 
      : [this.appPermisoRoles];

    if (this.appPermisoRequireAll) {
      // Requiere TODOS los roles
      return requiredRoles.every(role => userRoles.includes(role));
    } else {
      // Requiere AL MENOS UNO de los roles
      return requiredRoles.some(role => userRoles.includes(role));
    }
  }

  /**
   * Verificar por módulo y acción específicos
   */
  private checkModulePermission(userRoles: string[]): boolean {
    // Para simplificar, usamos solo verificación básica
    // En una implementación completa, esto debería usar los roles almacenados
    if (PermisosUtils.isAdmin(userRoles)) {
      return true;
    }
    
    // Verificación básica por roles conocidos
    const moduleRoleMap: { [key: string]: string[] } = {
      'empleados': ['admin', 'supervisor'],
      'clientes': ['admin', 'supervisor', 'gestor_clientes', 'cajero'],
      'ventas': ['admin', 'supervisor', 'gestor_ventas', 'cajero'],
      'inventarios': ['admin', 'supervisor', 'gestor_inventarios', 'operador'],
      'proveedores': ['admin', 'supervisor', 'gestor_inventarios'],
      'reportes': ['admin', 'supervisor', 'contabilidad']
    };

    const allowedRoles = moduleRoleMap[this.appPermisoModulo] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  }

  /**
   * Verificar por permiso completo (formato: "modulo.accion")
   */
  private checkFullPermission(userRoles: string[]): boolean {
    const [modulo, accion] = this.appPermiso.split('.');
    
    if (!modulo || !accion) {
      return false;
    }

    // Usar el mismo mapeo que checkModulePermission
    this.appPermisoModulo = modulo;
    this.appPermisoAccion = accion as keyof ModuloPermisos;
    
    return this.checkModulePermission(userRoles);
  }

  /**
   * Mostrar elemento
   */
  private showElement(): void {
    if (!this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    }
  }

  /**
   * Ocultar elemento
   */
  private hideElement(): void {
    if (this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/**
 * Directiva alternativa más simple para verificar solo roles
 */
@Directive({
  selector: '[appRole]'
})
export class RoleDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() appRole: string | string[] = '';
  @Input() appRoleRequireAll: boolean = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkRoles();
    
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkRoles();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkRoles(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.hideElement();
      return;
    }

    const userRoles = currentUser.roles || [currentUser.role];
    const requiredRoles = Array.isArray(this.appRole) ? this.appRole : [this.appRole];

    let hasAccess = false;

    if (this.appRoleRequireAll) {
      // Requiere TODOS los roles
      hasAccess = requiredRoles.every(role => userRoles.includes(role));
    } else {
      // Requiere AL MENOS UNO de los roles
      hasAccess = requiredRoles.some(role => userRoles.includes(role));
    }

    if (hasAccess) {
      this.showElement();
    } else {
      this.hideElement();
    }
  }

  private showElement(): void {
    if (!this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    }
  }

  private hideElement(): void {
    if (this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/**
 * Directiva para verificar si el usuario es administrador
 */
@Directive({
  selector: '[appAdminOnly]'
})
export class AdminOnlyDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAdminAccess();
    
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkAdminAccess();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAdminAccess(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.hideElement();
      return;
    }

    const userRoles = currentUser.roles || [currentUser.role];
    const isAdmin = PermisosUtils.isAdmin(userRoles);

    if (isAdmin) {
      this.showElement();
    } else {
      this.hideElement();
    }
  }

  private showElement(): void {
    if (!this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    }
  }

  private hideElement(): void {
    if (this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}