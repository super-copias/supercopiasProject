/**
 * Módulo de Roles - SuperCopias
 * Módulo compartido que incluye servicios, directivas y utilidades para manejo de roles
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Servicios
import { RolesService } from '../services/roles.service';
import { RolesGuard } from '../services/roles.guard';

// Directivas
import { 
  PermisoDirective, 
  RoleDirective, 
  AdminOnlyDirective 
} from './directives/permiso.directive';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    PermisoDirective,
    RoleDirective,
    AdminOnlyDirective
  ],
  providers: [
    RolesService,
    RolesGuard
  ],
  exports: [
    PermisoDirective,
    RoleDirective,
    AdminOnlyDirective
  ]
})
export class RolesModule {
  
  /**
   * Método estático para importar el módulo con configuración
   */
  static forRoot() {
    return {
      ngModule: RolesModule,
      providers: [
        RolesService,
        RolesGuard
      ]
    };
  }
}