/**
 * Servicio de Roles - SuperCopias
 * Utilidades para gestión y validación de roles del sistema
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RolSistema } from '../shared/interfaces';

@Injectable({ providedIn: 'root' })
export class RolesService {
  
  /**
   * Definición completa de roles del sistema
   * Sincronizada con backend/utils/rolesSystem.js
   */
  private readonly rolesDefinition: RolSistema[] = [
    {
      id: 'admin',
      nombre: 'Administrador',
      descripcion: 'Acceso completo a todos los módulos del sistema',
      color: '#dc3545',
      permisos: {
        empleados: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        clientes: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        proveedores: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        inventarios: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        ventas: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        reportes: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true },
        configuracion: { crear: true, leer: true, actualizar: true, eliminar: true, administrar: true }
      }
    },
    {
      id: 'supervisor',
      nombre: 'Supervisor',
      descripcion: 'Acceso a módulos operativos con permisos de supervisión',
      color: '#fd7e14',
      permisos: {
        empleados: { crear: false, leer: true, actualizar: true, eliminar: false, administrar: false },
        clientes: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: true, actualizar: true, eliminar: false, administrar: false },
        inventarios: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        ventas: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        reportes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'operador',
      nombre: 'Operador',
      descripcion: 'Acceso básico a módulos operativos diarios',
      color: '#198754',
      permisos: {
        empleados: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        inventarios: { crear: false, leer: true, actualizar: true, eliminar: false, administrar: false },
        ventas: { crear: true, leer: true, actualizar: false, eliminar: false, administrar: false },
        reportes: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'cajero',
      nombre: 'Cajero',
      descripcion: 'Acceso limitado al punto de venta y consulta de clientes',
      color: '#0d6efd',
      permisos: {
        empleados: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        inventarios: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        ventas: { crear: true, leer: true, actualizar: false, eliminar: false, administrar: false },
        reportes: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'gestor_clientes',
      nombre: 'Gestor de Clientes',
      descripcion: 'Especialista en gestión de clientes y relaciones comerciales',
      color: '#6f42c1',
      permisos: {
        empleados: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        inventarios: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        ventas: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        reportes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'gestor_inventarios',
      nombre: 'Gestor de Inventarios',
      descripcion: 'Especialista en control de inventarios y equipos',
      color: '#20c997',
      permisos: {
        empleados: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        proveedores: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        inventarios: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        ventas: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        reportes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'gestor_ventas',
      nombre: 'Gestor de Ventas',
      descripcion: 'Especialista en ventas y punto de venta',
      color: '#ffc107',
      permisos: {
        empleados: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        inventarios: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        ventas: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        reportes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    },
    {
      id: 'contabilidad',
      nombre: 'Contabilidad',
      descripcion: 'Especialista en gestión contable y financiera',
      color: '#6c757d',
      permisos: {
        empleados: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        clientes: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        proveedores: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        inventarios: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        ventas: { crear: false, leer: true, actualizar: false, eliminar: false, administrar: false },
        reportes: { crear: true, leer: true, actualizar: true, eliminar: false, administrar: false },
        configuracion: { crear: false, leer: false, actualizar: false, eliminar: false, administrar: false }
      }
    }
  ];

  constructor() {}

  /**
   * Obtener todos los roles disponibles
   */
  getAllRoles(): Observable<RolSistema[]> {
    return of([...this.rolesDefinition]);
  }

  /**
   * Obtener rol por ID
   */
  getRolById(rolId: string): RolSistema | null {
    return this.rolesDefinition.find(rol => rol.id === rolId) || null;
  }

  /**
   * Obtener múltiples roles por IDs
   */
  getRolesByIds(rolIds: string[]): RolSistema[] {
    return this.rolesDefinition.filter(rol => rolIds.includes(rol.id));
  }

  /**
   * Verificar si un conjunto de roles tiene permiso para una acción específica
   */
  hasPermission(
    userRoles: string[],
    modulo: string,
    accion: 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'administrar'
  ): boolean {
    // Si tiene rol admin, tiene todos los permisos
    if (userRoles.includes('admin')) {
      return true;
    }

    // Verificar si alguno de los roles del usuario tiene el permiso requerido
    return userRoles.some(rolId => {
      const rol = this.getRolById(rolId);
      if (!rol || !rol.permisos[modulo]) {
        return false;
      }
      return rol.permisos[modulo][accion] === true;
    });
  }

  /**
   * Obtener todos los permisos combinados de un usuario
   */
  getCombinedPermissions(userRoles: string[]): Record<string, Record<string, boolean>> {
    const combinedPermisos: Record<string, Record<string, boolean>> = {};

    userRoles.forEach(rolId => {
      const rol = this.getRolById(rolId);
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
          Object.keys(rol.permisos[modulo]).forEach(accion => {
            if (rol.permisos[modulo][accion]) {
              combinedPermisos[modulo][accion] = true;
            }
          });
        });
      }
    });

    return combinedPermisos;
  }

  /**
   * Obtener módulos accesibles para un usuario
   */
  getAccessibleModules(userRoles: string[]): string[] {
    const permissions = this.getCombinedPermissions(userRoles);
    return Object.keys(permissions).filter(modulo => 
      Object.values(permissions[modulo]).some(permiso => permiso === true)
    );
  }

  /**
   * Validar si un conjunto de roles es válido
   */
  validateRoles(rolIds: string[]): { valid: boolean; invalidRoles: string[] } {
    const validRoleIds = this.rolesDefinition.map(rol => rol.id);
    const invalidRoles = rolIds.filter(rolId => !validRoleIds.includes(rolId));
    
    return {
      valid: invalidRoles.length === 0,
      invalidRoles
    };
  }

  /**
   * Obtener roles sugeridos para un puesto específico
   */
  getSuggestedRolesForPosition(puesto: string): string[] {
    const puestoLower = puesto.toLowerCase();
    
    const suggestions: Record<string, string[]> = {
      // Gerencia y supervisión
      'gerente': ['admin', 'supervisor'],
      'jefe': ['supervisor'],
      'supervisor': ['supervisor'],
      'coordinador': ['supervisor'],
      
      // Ventas
      'vendedor': ['gestor_ventas'],
      'cajero': ['cajero'],
      'asesor': ['gestor_ventas', 'gestor_clientes'],
      
      // Operaciones
      'operador': ['operador'],
      'técnico': ['operador'],
      'asistente': ['operador'],
      
      // Especialistas
      'contador': ['contabilidad'],
      'contable': ['contabilidad'],
      'administrador': ['admin'],
      'sistemas': ['admin'],
      
      // Gestión específica
      'inventarios': ['gestor_inventarios'],
      'almacén': ['gestor_inventarios'],
      'clientes': ['gestor_clientes'],
      'atención': ['gestor_clientes', 'cajero']
    };

    // Buscar coincidencias en el puesto
    for (const [key, roles] of Object.entries(suggestions)) {
      if (puestoLower.includes(key)) {
        return roles;
      }
    }

    // Por defecto, sugerir operador para puestos no específicos
    return ['operador'];
  }

  /**
   * Formatear roles para visualización
   */
  formatRolesForDisplay(rolIds: string[]): string {
    const roles = this.getRolesByIds(rolIds);
    if (roles.length === 0) return 'Sin roles asignados';
    if (roles.length === 1) return roles[0].nombre;
    
    const nombres = roles.map(rol => rol.nombre);
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  }

  /**
   * Obtener color representativo para un conjunto de roles
   */
  getRolesColor(rolIds: string[]): string {
    if (rolIds.includes('admin')) return '#dc3545';
    if (rolIds.includes('supervisor')) return '#fd7e14';
    
    const roles = this.getRolesByIds(rolIds);
    return roles[0]?.color || '#6c757d';
  }

  /**
   * Verificar si un usuario es administrador
   */
  isAdmin(userRoles: string[]): boolean {
    return userRoles.includes('admin');
  }

  /**
   * Verificar si un usuario tiene roles de supervisión
   */
  isSupervisor(userRoles: string[]): boolean {
    return userRoles.includes('admin') || userRoles.includes('supervisor');
  }

  /**
   * Obtener nivel de acceso numérico (para ordenamiento)
   */
  getAccessLevel(userRoles: string[]): number {
    if (userRoles.includes('admin')) return 100;
    if (userRoles.includes('supervisor')) return 80;
    if (userRoles.some(rol => rol.startsWith('gestor_'))) return 60;
    if (userRoles.includes('operador')) return 40;
    if (userRoles.includes('cajero')) return 20;
    return 10;
  }
}