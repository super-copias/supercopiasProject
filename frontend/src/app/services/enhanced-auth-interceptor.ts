import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, takeUntil, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
import { RequestCancellationService } from './request-cancellation.service';

@Injectable()
export class EnhancedAuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private cancellationService: RequestCancellationService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    const cloned = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    
    return next.handle(cloned).pipe(
      // Timeout de 10 segundos para evitar requests colgados
      timeout(10000),
      // Cancelar si se dispara la cancelación global
      takeUntil(this.cancellationService.globalCancel$),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Si no autorizado, limpiar storage y redirigir a login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login'], { replaceUrl: true });
        } else if (err.message && err.message.includes('Timeout')) {
          console.warn('Request timeout para:', req.url);
        }
        return throwError(() => err);
      })
    );
  }
}