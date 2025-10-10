/**
 * Servicio de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles
 * Version simplificada que depende completamente del backend
 */

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { 
  ApiResponse, 
  Empleado, 
  CrearEmpleado, 
  AsignarRoles, 
  EmpleadoConUsuario,
  RolSistema,
  PaginationParams 
} from '../shared/interfaces';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private baseUrl = '/api/empleados';
  
  constructor(private http: HttpClient) {}

  /**
   * Obtener lista de empleados con búsqueda y paginación
   */
  getList(params: PaginationParams = {}): Observable<ApiResponse<Empleado[]>> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ApiResponse<Empleado[]>>(`${this.baseUrl}?${queryParams}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener empleado por ID
   */
  getById(id: string): Observable<ApiResponse<Empleado>> {
    return this.http.get<ApiResponse<Empleado>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nuevo empleado
   */
  create(empleado: CrearEmpleado): Observable<ApiResponse<EmpleadoConUsuario>> {
    return this.http.post<ApiResponse<EmpleadoConUsuario>>(`${this.baseUrl}`, empleado)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Actualizar empleado existente
   */
  update(id: string, empleado: Partial<Empleado>): Observable<ApiResponse<Empleado>> {
    return this.http.put<ApiResponse<Empleado>>(`${this.baseUrl}/${id}`, empleado)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Eliminar empleado (desactivar)
   */
  delete(id: string): Observable<ApiResponse<{ id: string; activo: boolean }>> {
    return this.http.delete<ApiResponse<{ id: string; activo: boolean }>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de roles disponibles
   */
  getRoles(): Observable<ApiResponse<RolSistema[]>> {
    return this.http.get<ApiResponse<RolSistema[]>>(`${this.baseUrl}/roles`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Asignar roles a un empleado
   */
  assignRoles(id: string, data: AsignarRoles): Observable<ApiResponse<EmpleadoConUsuario>> {
    return this.http.post<ApiResponse<EmpleadoConUsuario>>(`${this.baseUrl}/${id}/assign-roles`, data)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de puestos
   */
  getPuestos(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/puestos`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  // ============================================================================
  // MÉTODOS DE COMPATIBILIDAD PARA COMPONENTES EXISTENTES
  // ============================================================================

  /**
   * Método de compatibilidad para list() - redirige a getList()
   */
  list(q?: string, page?: number, limit?: number): Observable<ApiResponse<Empleado[]>> {
    return this.getList({ q, page, limit });
  }

  /**
   * Método de compatibilidad para assignRole() - redirige a assignRoles()
   */
  assignRole(id: string, role: string): Observable<ApiResponse<EmpleadoConUsuario>> {
    return this.assignRoles(id, { roles: [role], crearUsuario: false });
  }

  /**
   * Método de compatibilidad para initMockData()
   */
  initMockData(): void {
    console.log('EmpleadosService: Usando datos del backend, no hay datos mock locales');
  }

  // ============================================================================
  // MANEJO DE ERRORES
  // ============================================================================

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
      errorCode = 'CLIENT_ERROR';
    } else {
      // Error del lado del servidor
      if (error.error && error.error.error) {
        // Error con formato estándar API
        errorMessage = error.error.error.message || errorMessage;
        errorCode = error.error.error.code || errorCode;
      } else {
        // Error HTTP estándar
        switch (error.status) {
          case 400:
            errorMessage = 'Solicitud inválida';
            errorCode = 'BAD_REQUEST';
            break;
          case 401:
            errorMessage = 'No autorizado';
            errorCode = 'UNAUTHORIZED';
            break;
          case 403:
            errorMessage = 'Acceso denegado';
            errorCode = 'FORBIDDEN';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado';
            errorCode = 'NOT_FOUND';
            break;
          case 422:
            errorMessage = 'Datos de entrada inválidos';
            errorCode = 'VALIDATION_ERROR';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            errorCode = 'INTERNAL_ERROR';
            break;
          case 0:
            errorMessage = 'Error de conexión - Backend no disponible';
            errorCode = 'NETWORK_ERROR';
            break;
          default:
            errorMessage = `Error HTTP ${error.status}: ${error.message}`;
            errorCode = 'HTTP_ERROR';
        }
      }
    }

    console.error('EmpleadosService Error:', {
      code: errorCode,
      message: errorMessage,
      status: error.status,
      url: error.url
    });

    return throwError(() => ({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error.error
      },
      timestamp: new Date().toISOString()
    }));
  }
}