/**
 * Interceptor HTTP Estandarizado - SuperCopias
 * Maneja todas las comunicaciones HTTP con el backend de forma consistente
 * - Añade tokens de autenticación automáticamente
 * - Maneja respuestas estándar API
 * - Gestiona errores de forma uniforme
 * - Redirige en caso de sesión expirada
 */

import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

@Injectable()
export class StandardApiInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1. Añadir token de autenticación si existe
    const modifiedReq = this.addAuthToken(req);
    
    // 2. Añadir headers estándar
    const finalReq = this.addStandardHeaders(modifiedReq);
    
    return next.handle(finalReq).pipe(
      // 3. Procesar respuestas exitosas
      tap(event => {
        if (event instanceof HttpResponse) {
          this.handleSuccessResponse(event);
        }
      }),
      
      // 4. Manejar errores de forma estándar
      catchError(error => this.handleErrorResponse(error))
    );
  }

  /**
   * Añadir token de autenticación a la request
   */
  private addAuthToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('token');
    
    if (token && this.shouldAddToken(req)) {
      return req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    
    return req;
  }

  /**
   * Verificar si debe añadirse el token a la request
   */
  private shouldAddToken(req: HttpRequest<any>): boolean {
    // No añadir token a requests de login
    if (req.url.includes('/auth/login')) {
      return false;
    }
    
    // No añadir token a URLs externas
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      return !req.url.includes(window.location.hostname);
    }
    
    return true;
  }

  /**
   * Añadir headers estándar a todas las requests
   */
  private addStandardHeaders(req: HttpRequest<any>): HttpRequest<any> {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // No sobrescribir Content-Type para uploads de archivos
    if (req.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    return req.clone({ setHeaders: headers });
  }

  /**
   * Procesar respuestas exitosas
   */
  private handleSuccessResponse(response: HttpResponse<any>): void {
    // Validar estructura de respuesta estándar
    if (response.body && typeof response.body === 'object') {
      if (!this.isStandardResponse(response.body)) {
      }
    }

    // Log para desarrollo (eliminar en producción)
    if (!environment.production) {
    }
  }

  /**
   * Manejar errores de forma estándar
   */
  private handleErrorResponse(error: HttpErrorResponse): Observable<never> {

    // Manejar diferentes tipos de errores
    switch (error.status) {
      case 401:
        return this.handleUnauthorizedError(error);
      
      case 403:
        return this.handleForbiddenError(error);
      
      case 404:
        return this.handleNotFoundError(error);
      
      case 422:
        return this.handleValidationError(error);
      
      case 500:
        return this.handleServerError(error);
      
      case 0:
        return this.handleNetworkError(error);
      
      default:
        return this.handleGenericError(error);
    }
  }

  /**
   * Manejar error 401 - No autorizado
   * Diferencia entre sesión expirada por inactividad, desplazada o token inválido.
   */
  private handleUnauthorizedError(error: HttpErrorResponse): Observable<never> {
    const errorCode: string = error.error?.error?.code || 'UNAUTHORIZED';

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (!this.router.url.includes('/login')) {
      const paramMap: { [code: string]: string } = {
        SESSION_EXPIRED:     'inactivity',
        SESSION_INVALIDATED: 'displaced',
        TOKEN_EXPIRED:       'true',
      };
      const sessionExpired = paramMap[errorCode] || 'true';

      this.router.navigate(['/login'], {
        replaceUrl: true,
        queryParams: { sessionExpired }
      });
    }

    const messages: { [code: string]: string } = {
      SESSION_EXPIRED:     'Tu sesión fue cerrada por inactividad. Inicia sesión nuevamente.',
      SESSION_INVALIDATED: 'Tu sesión fue cerrada porque se inició sesión desde otro dispositivo.',
      TOKEN_EXPIRED:       'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
    };
    const message = messages[errorCode] || 'Sesión expirada. Por favor, inicia sesión nuevamente.';

    return throwError(() => this.createStandardError('UNAUTHORIZED', message, error));
  }

  /**
   * Manejar error 403 - Prohibido
   */
  private handleForbiddenError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => this.createStandardError(
      'FORBIDDEN',
      'No tiene permisos para realizar esta acción.',
      error
    ));
  }

  /**
   * Manejar error 404 - No encontrado
   */
  private handleNotFoundError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => this.createStandardError(
      'NOT_FOUND',
      'El recurso solicitado no fue encontrado.',
      error
    ));
  }

  /**
   * Manejar error 422 - Validación
   */
  private handleValidationError(error: HttpErrorResponse): Observable<never> {
    let message = 'Datos de entrada inválidos.';
    
    if (error.error && error.error.error && error.error.error.message) {
      message = error.error.error.message;
    }

    return throwError(() => this.createStandardError(
      'VALIDATION_ERROR',
      message,
      error
    ));
  }

  /**
   * Manejar error 500 - Error del servidor
   */
  private handleServerError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => this.createStandardError(
      'INTERNAL_ERROR',
      'Error interno del servidor. Intente nuevamente más tarde.',
      error
    ));
  }

  /**
   * Manejar error de red
   */
  private handleNetworkError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => this.createStandardError(
      'NETWORK_ERROR',
      'Error de conexión. Verifique su conexión a internet.',
      error
    ));
  }

  /**
   * Manejar errores genéricos
   */
  private handleGenericError(error: HttpErrorResponse): Observable<never> {
    let message = 'Error desconocido';
    
    if (error.error && error.error.error && error.error.error.message) {
      message = error.error.error.message;
    } else if (error.message) {
      message = error.message;
    }

    return throwError(() => this.createStandardError(
      'UNKNOWN_ERROR',
      message,
      error
    ));
  }

  /**
   * Crear respuesta de error estándar
   */
  private createStandardError(code: string, message: string, originalError: HttpErrorResponse): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details: originalError.error
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verificar si la respuesta sigue el estándar API
   */
  private isStandardResponse(body: any): boolean {
    return body && 
           typeof body.success === 'boolean' && 
           typeof body.timestamp === 'string';
  }
}

// Variable de entorno mock para development
const environment = {
  production: false // Cambiar a true en producción
};