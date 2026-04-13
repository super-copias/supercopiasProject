/**
 * Servicio de Catálogos - SuperCopias Frontend
 * Gestiona todos los catálogos del sistema (estados, regímenes, etc.)
 * Obtiene datos exclusivamente del backend
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiResponse } from '../shared/interfaces';
import { environment } from '../../environments/environment';

// Interfaces para catálogos
export interface Estado {
  codigo: string;
  nombre: string;
}

export interface RegimenFiscal {
  codigo: string;
  nombre: string;
}

export interface UsoCFDI {
  codigo: string;
  descripcion: string;
}

export interface FormaPago {
  codigo: string;
  nombre: string;
}

export interface MetodoPago {
  codigo: string;
  nombre: string;
}

export interface Modulo {
  id: string;
  nombre: string;
  icono?: string;
  activo: boolean;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  gerente: string;
  activa: boolean;
  fechaCreacion: string;
}

export interface Puesto {
  id: number;
  nombre: string;
  descripcion: string;
  salarioMinimo: number;
  salarioMaximo: number;
  activo: boolean;
  fechaCreacion: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private baseUrl = `${environment.apiUrl}/catalogos`;
  
  // Cache local para evitar llamadas repetidas solo para catálogos estáticos
  private estadosCache$ = new BehaviorSubject<Estado[] | null>(null);
  private regimenesCache$ = new BehaviorSubject<RegimenFiscal[] | null>(null);
  private usosCFDICache$ = new BehaviorSubject<UsoCFDI[] | null>(null);
  private formasPagoCache$ = new BehaviorSubject<FormaPago[] | null>(null);
  private metodosPagoCache$ = new BehaviorSubject<MetodoPago[] | null>(null);
  private modulosCache$ = new BehaviorSubject<Modulo[] | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Obtener catálogo de estados de México
   */
  getEstados(useCache: boolean = true): Observable<Estado[]> {
    if (useCache && this.estadosCache$.value) {
      return new Observable(observer => {
        observer.next(this.estadosCache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<Estado[]>>(`${this.baseUrl}/estados`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(estados => this.estadosCache$.next(estados)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de regímenes fiscales
   */
  getRegimenesFiscales(useCache: boolean = true): Observable<RegimenFiscal[]> {
    if (useCache && this.regimenesCache$.value) {
      return new Observable(observer => {
        observer.next(this.regimenesCache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<RegimenFiscal[]>>(`${this.baseUrl}/regimenes-fiscales`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(regimenes => this.regimenesCache$.next(regimenes)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de usos CFDI
   */
  getUsosCFDI(useCache: boolean = true): Observable<UsoCFDI[]> {
    if (useCache && this.usosCFDICache$.value) {
      return new Observable(observer => {
        observer.next(this.usosCFDICache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<UsoCFDI[]>>(`${this.baseUrl}/usos-cfdi`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(usos => this.usosCFDICache$.next(usos)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de formas de pago
   */
  getFormasPago(useCache: boolean = true): Observable<FormaPago[]> {
    if (useCache && this.formasPagoCache$.value) {
      return new Observable(observer => {
        observer.next(this.formasPagoCache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<FormaPago[]>>(`${this.baseUrl}/formas-pago`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(formas => this.formasPagoCache$.next(formas)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de métodos de pago
   */
  getMetodosPago(useCache: boolean = true): Observable<MetodoPago[]> {
    if (useCache && this.metodosPagoCache$.value) {
      return new Observable(observer => {
        observer.next(this.metodosPagoCache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<MetodoPago[]>>(`${this.baseUrl}/metodos-pago`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(metodos => this.metodosPagoCache$.next(metodos)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de módulos del sistema
   */
  getModulos(useCache: boolean = true): Observable<Modulo[]> {
    if (useCache && this.modulosCache$.value) {
      return new Observable(observer => {
        observer.next(this.modulosCache$.value!);
        observer.complete();
      });
    }

    return this.http.get<ApiResponse<Modulo[]>>(`${this.baseUrl}/modulos`)
      .pipe(
        map(response => response.success ? response.data || [] : []),
        tap(modulos => this.modulosCache$.next(modulos)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Limpiar cache de catálogos
   */
  clearCache(): void {
    this.estadosCache$.next(null);
    this.regimenesCache$.next(null);
    this.usosCFDICache$.next(null);
    this.formasPagoCache$.next(null);
    this.metodosPagoCache$.next(null);
    this.modulosCache$.next(null);
  }

  /**
   * Precargar todos los catálogos
   */
  preloadAll(): void {
    this.getEstados(false).subscribe();
    this.getRegimenesFiscales(false).subscribe();
    this.getUsosCFDI(false).subscribe();
    this.getFormasPago(false).subscribe();
    this.getMetodosPago(false).subscribe();
    this.getModulos(false).subscribe();
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Obtener estado por código
   */
  getEstadoPorCodigo(codigo: string): Observable<Estado | undefined> {
    return this.getEstados().pipe(
      map(estados => estados.find(e => e.codigo === codigo))
    );
  }

  /**
   * Obtener régimen fiscal por código
   */
  getRegimenPorCodigo(codigo: string): Observable<RegimenFiscal | undefined> {
    return this.getRegimenesFiscales().pipe(
      map(regimenes => regimenes.find(r => r.codigo === codigo))
    );
  }

  /**
   * Obtener uso CFDI por código
   */
  getUsoCFDIPorCodigo(codigo: string): Observable<UsoCFDI | undefined> {
    return this.getUsosCFDI().pipe(
      map(usos => usos.find(u => u.codigo === codigo))
    );
  }

  /**
   * Obtener catálogo de sucursales
   */
  getSucursales(): Observable<ApiResponse<Sucursal[]>> {
    return this.http.get<any>(`${this.baseUrl}/sucursales`)
      .pipe(
        map(response => {
          if (response && response.success && Array.isArray(response.data)) {
            const mappedData = response.data.map((sucursal: any) => ({
              id: sucursal.id,
              nombre: sucursal.nombre,
              direccion: sucursal.direccion,
              telefono: sucursal.telefono,
              gerente: sucursal.gerente,
              activa: sucursal.activa,
              fechaCreacion: sucursal.fecha_creacion
            }));
            return { ...response, data: mappedData };
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nueva sucursal
   */
  createSucursal(sucursal: Partial<Sucursal>): Observable<ApiResponse<Sucursal>> {
    return this.http.post<ApiResponse<Sucursal>>(`${this.baseUrl}/sucursales`, sucursal)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtener catálogo de puestos
   */
  getPuestos(): Observable<ApiResponse<Puesto[]>> {
    return this.http.get<any>(`${this.baseUrl}/puestos`)
      .pipe(
        map(response => {
          if (response && response.success && Array.isArray(response.data)) {
            const mappedData = response.data.map((puesto: any) => ({
              id: puesto.id,
              nombre: puesto.nombre,
              descripcion: puesto.descripcion,
              salarioMinimo: parseFloat(puesto.salario_minimo) || 0,
              salarioMaximo: parseFloat(puesto.salario_maximo) || 0,
              activo: puesto.activo,
              fechaCreacion: puesto.fecha_creacion
            }));
            return { ...response, data: mappedData };
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crear nuevo puesto
   */
  createPuesto(puesto: Partial<Puesto>): Observable<ApiResponse<Puesto>> {
    return this.http.post<ApiResponse<Puesto>>(`${this.baseUrl}/puestos`, puesto)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  // ============================================================================
  // HORARIOS DE ACCESO
  // ============================================================================

  getHorarios(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/horarios`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  createHorario(horario: { nombre: string; hora_inicio: string; hora_fin: string; activo?: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/horarios`, horario)
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateHorario(id: number, horario: Partial<{ nombre: string; hora_inicio: string; hora_fin: string; activo: boolean }>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/horarios/${id}`, horario)
      .pipe(catchError(this.handleError.bind(this)));
  }

  deleteHorario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/horarios/${id}`)
      .pipe(catchError(this.handleError.bind(this)));
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
            errorMessage = 'Catálogo no encontrado';
            errorCode = 'NOT_FOUND';
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