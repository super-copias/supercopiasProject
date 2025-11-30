/**
 * Servicio de Proveedores - SuperCopias
 * Gestiona todas las operaciones CRUD para proveedores
 * Version que depende completamente del backend
 */

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, PaginationParams, Proveedor } from '../shared/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private baseUrl = `${environment.apiUrl}/proveedores`;
  
  constructor(private http: HttpClient) {}

  /**
   * Obtener lista de proveedores con búsqueda y paginación
   */
  getList(params: PaginationParams = {}): Observable<ApiResponse<Proveedor[]>> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ApiResponse<Proveedor[]>>(`${this.baseUrl}?${queryParams}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener proveedor por ID
   */
  getById(id: number): Observable<ApiResponse<Proveedor>> {
    return this.http.get<ApiResponse<Proveedor>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nuevo proveedor
   */
  create(proveedor: Partial<Proveedor>): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(`${this.baseUrl}`, proveedor)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Actualizar proveedor existente
   */
  update(id: number, proveedor: Partial<Proveedor>): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(`${this.baseUrl}/${id}`, proveedor)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Eliminar proveedor (desactivar)
   */
  delete(id: number): Observable<ApiResponse<{ id: number; activo: boolean }>> {
    return this.http.delete<ApiResponse<{ id: number; activo: boolean }>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de tipos de proveedor
   */
  getTipos(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/catalogo/tipos`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de métodos de pago
   */
  getMetodosPago(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/catalogo/metodos-pago`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  // ============================================================================
  // MÉTODOS DE COMPATIBILIDAD PARA COMPONENTES EXISTENTES
  // ============================================================================

  /**
   * Método de compatibilidad para list() - redirige a getList()
   */
  list(q?: string, page?: number, limit?: number): Observable<ApiResponse<Proveedor[]>> {
    return this.getList({ q, page, limit });
  }

  /**
   * Método de compatibilidad para findById() - redirige a getById()
   */
  findById(id: number): Observable<ApiResponse<Proveedor>> {
    return this.getById(id);
  }

  /**
   * Método de compatibilidad para save() - decide entre create/update
   */
  save(proveedor: Proveedor): Observable<ApiResponse<Proveedor>> {
    if (proveedor.id) {
      return this.update(proveedor.id, proveedor);
    } else {
      return this.create(proveedor);
    }
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
            errorMessage = 'Proveedor no encontrado';
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
}