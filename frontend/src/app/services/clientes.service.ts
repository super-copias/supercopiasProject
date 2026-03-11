/**
 * Servicio de Clientes - SuperCopias
 * Gestiona todas las operaciones CRUD para clientes
 * Version simplificada que depende completamente del backend
 */

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, Cliente, PaginationParams } from '../shared/interfaces';
import { CatalogosService } from './catalogos.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private baseUrl = `${environment.apiUrl}/clientes`;
  
  constructor(
    private http: HttpClient,
    private catalogosService: CatalogosService
  ) {}

  /**
   * Obtener lista de clientes con búsqueda y paginación
   */
  getList(params: PaginationParams = {}): Observable<ApiResponse<Cliente[]>> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ApiResponse<Cliente[]>>(`${this.baseUrl}?${queryParams}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener cliente por ID
   */
  getById(id: number): Observable<ApiResponse<Cliente>> {
    return this.http.get<ApiResponse<Cliente>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nuevo cliente
   */
  create(cliente: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(`${this.baseUrl}`, cliente)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Actualizar cliente existente
   */
  update(id: number, cliente: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
    return this.http.put<ApiResponse<Cliente>>(`${this.baseUrl}/${id}`, cliente)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Eliminar cliente (eliminar permanentemente)
   */
  delete(id: number): Observable<ApiResponse<{ id: number; eliminado: boolean }>> {
    return this.http.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Buscar clientes por término
   */
  search(term: string, limit?: number): Observable<ApiResponse<Cliente[]>> {
    return this.getList({ q: term, limit });
  }

  /**
   * Obtener clientes activos
   */
  getActivos(): Observable<ApiResponse<Cliente[]>> {
    return this.getList({ includeInactive: false });
  }

  /**
   * Obtener catálogo de Usos CFDI desde backend
   */
  getUsosCFDI(): Observable<any[]> {
    return this.catalogosService.getUsosCFDI();
  }

  /**
   * Obtener catálogo de estados desde backend
   */
  getEstados(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/catalogos/estados`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de regímenes fiscales desde backend
   */
  getRegimenesFiscales(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/catalogos/regimenes-fiscales`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de formas de pago desde backend
   */
  getFormasPago(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/catalogos/formas-pago`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de métodos de pago desde backend
   */
  getMetodosPago(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/catalogos/metodos-pago`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Descargar plantilla Excel para carga masiva
   * Usa HttpClient para que el interceptor incluya el token JWT
   */
  descargarPlantillaExcel(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/plantilla-excel`, { responseType: 'blob' })
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Subir archivo Excel con clientes
   */
  uploadExcel(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('excel', file);

    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/upload-excel`, formData)
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
  list(q?: string, page?: number, limit?: number): Observable<ApiResponse<Cliente[]>> {
    return this.getList({ q, page, limit });
  }

  /**
   * Método de compatibilidad para findById() - redirige a getById()
   */
  findById(id: number): Observable<ApiResponse<Cliente>> {
    return this.getById(id);
  }

  /**
   * Método de compatibilidad para save() - decide entre create/update
   */
  save(cliente: Cliente): Observable<ApiResponse<Cliente>> {
    if (cliente.id) {
      return this.update(cliente.id, cliente);
    } else {
      return this.create(cliente);
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
}