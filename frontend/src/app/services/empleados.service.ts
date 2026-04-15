/**
 * Servicio de Empleados - SuperCopias
 * Gestiona todas las operaciones CRUD para empleados con sistema de roles
 * Version simplificada que depende completamente del backend
 */

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { 
  ApiResponse, 
  Empleado, 
  CrearEmpleado, 
  AsignarRoles, 
  EmpleadoConUsuario,
  RolSistema,
  PaginationParams 
} from '../shared/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private baseUrl = `${environment.apiUrl}/empleados`;
  
  // Caché para catálogos estáticos
  private puestosCache$: Observable<ApiResponse<string[]>> | null = null;
  private modulosCache$: Observable<ApiResponse<any[]>> | null = null;
  
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

    return this.http.get<any>(`${this.baseUrl}?${queryParams}`)
      .pipe(
        map(response => {
          if (response && response.success && Array.isArray(response.data)) {
            const mappedData = response.data.map((empleado: any) => ({
              id: empleado.id,
              nombre: empleado.nombre,
              telefono: empleado.telefono,
              email: empleado.email,
              puesto: empleado.puesto_nombre || '-',
              sucursal: empleado.sucursal_nombre || '-',
              turno: empleado.turno,
              activo: empleado.activo,
              fechaIngreso: empleado.fecha_ingreso,
              fechaRegistro: empleado.fecha_registro
            }));
            return { ...response, data: mappedData };
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener empleado por ID
   */
  getById(id: number): Observable<ApiResponse<Empleado>> {
    return this.http.get<ApiResponse<Empleado>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nuevo empleado
   */
  create(empleado: Partial<Empleado>): Observable<ApiResponse<EmpleadoConUsuario>> {
    return this.http.post<ApiResponse<EmpleadoConUsuario>>(this.baseUrl, empleado)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener empleado por ID
   */
  getEmpleado(id: number): Observable<ApiResponse<Empleado>> {
    return this.http.get<any>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            const mappedData = this.mapEmpleadoFromAPI(response.data);
            return { ...response, data: mappedData };
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Actualizar empleado existente
   */
  update(id: number, empleado: Partial<Empleado>): Observable<ApiResponse<Empleado>> {
    return this.http.put<ApiResponse<Empleado>>(`${this.baseUrl}/${id}`, empleado)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Eliminar empleado (eliminación completa)
   */
  delete(id: number): Observable<ApiResponse<{ id: number; eliminado: boolean }>> {
    return this.http.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Activar / desactivar empleado (toggle de estado)
   */
  toggleEstado(id: number): Observable<ApiResponse<{ id: number; activo: boolean }>> {
    return this.http.patch<ApiResponse<{ id: number; activo: boolean }>>(`${this.baseUrl}/${id}/toggle-estado`, {})
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de puestos con caché
   */
  getPuestos(forceRefresh = false): Observable<ApiResponse<string[]>> {
    if (!forceRefresh && this.puestosCache$) {
      return this.puestosCache$;
    }
    
    this.puestosCache$ = this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/puestos`)
      .pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(err => {
          this.puestosCache$ = null;
          return this.handleError(err);
        })
      );
    
    return this.puestosCache$;
  }

  /**
   * Obtener catálogo de módulos del sistema con caché
   */
  getModulos(forceRefresh = false): Observable<ApiResponse<any[]>> {
    if (!forceRefresh && this.modulosCache$) {
      return this.modulosCache$;
    }
    
    this.modulosCache$ = this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/modulos`)
      .pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(err => {
          this.modulosCache$ = null;
          return this.handleError(err);
        })
      );
    
    return this.modulosCache$;
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
   * Método de compatibilidad para initMockData()
   */
  initMockData(): void {
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

  /**
   * Mapea datos del empleado desde la API (snake_case) al formato del frontend (camelCase)
   */
  private mapEmpleadoFromAPI(empleado: any): any {
    return {
      id: empleado.id,
      nombre: empleado.nombre,
      apellidos: '', 
      email: empleado.email,
      telefono: empleado.telefono,
      puesto: empleado.puesto || empleado.puesto_id, // ID para el formulario
      puestoNombre: empleado.puestoNombre || empleado.puesto_nombre, // Nombre para mostrar
      sucursal: empleado.sucursal || empleado.sucursal_id, // ID para el formulario
      sucursalNombre: empleado.sucursalNombre || empleado.sucursal_nombre, // Nombre para mostrar
      turno: empleado.turno,
      departamento: empleado.sucursalNombre || empleado.sucursal_nombre || `Sucursal ${empleado.sucursal || empleado.sucursal_id}`,
      salario: parseFloat(empleado.salario) || 0,
      fechaIngreso: this.formatDateForInput(empleado.fechaIngreso || empleado.fecha_ingreso),
      fechaBaja: this.formatDateForInput(empleado.fechaBaja || empleado.fecha_baja),
      tipoPermiso: empleado.tipoPermiso || empleado.tipo_acceso,
      tipoAcceso: empleado.tipoAcceso || empleado.tipo_acceso,
      activo: empleado.activo,
      fechaRegistro: empleado.fechaRegistro || empleado.fecha_registro,
      fechaModificacion: empleado.fechaModificacion || empleado.fecha_modificacion,
      roles: empleado.modulosPermitidos || [],
      modulosPermitidos: empleado.modulosPermitidos || [],
      tieneUsuario: !!(empleado.usuario?.id || empleado.usuario_id),
      usuarioId: empleado.usuario?.id || empleado.usuario_id,
      usuario: empleado.usuario
    };
  }

  /**
   * Asignar contrase\u00f1a temporal a un empleado (solo administradores)
   */
  resetPassword(empleadoId: number, nuevaPassword: string): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${this.baseUrl}/${empleadoId}/reset-password`, { nuevaPassword })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Convierte fecha del backend al formato requerido por input type="date" (YYYY-MM-DD)
   */
  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  }
}