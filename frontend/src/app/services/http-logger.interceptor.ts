import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';

/**
 * Interceptor para logging estandarizado de todas las peticiones HTTP
 * Formato:
 * ========================
 * URL: [endpoint]
 * REQUEST: [JSON request body]
 * RESPONSE: [JSON response body]
 * STATUS: [HTTP status code]
 */
@Injectable()
export class HttpLoggerInterceptor implements HttpInterceptor {
  
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    let requestBody = null;
    
    // Capturar el body del request si existe
    if (request.body) {
      try {
        requestBody = typeof request.body === 'string' 
          ? JSON.parse(request.body) 
          : request.body;
      } catch (e) {
        requestBody = request.body;
      }
    }

    return next.handle(request).pipe(
      tap(
        (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            this.logRequest(request, requestBody, event, startTime);
          }
        },
        (error: any) => {
          if (error instanceof HttpErrorResponse) {
            this.logError(request, requestBody, error, startTime);
          }
        }
      )
    );
  }

  private logRequest(
    request: HttpRequest<any>, 
    requestBody: any, 
    response: HttpResponse<any>,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;
    
  }

  private logError(
    request: HttpRequest<any>, 
    requestBody: any, 
    error: HttpErrorResponse,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;
    
  }

  private formatJSON(obj: any): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    try {
      // Si es un objeto, formatearlo como JSON sin saltos de línea
      if (typeof obj === 'object') {
        return JSON.stringify(obj);
      }
      return String(obj);
    } catch (e) {
      return String(obj);
    }
  }
}
