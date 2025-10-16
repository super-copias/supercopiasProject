import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    
    // Solo agregar el token si existe
    let cloned = req;
    if (token) {
      cloned = req.clone({ 
        setHeaders: { 
          Authorization: `Bearer ${token}` 
        } 
      });
    }
    
    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Si no autorizado, limpiar storage y redirigir a login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login'], { replaceUrl: true });
        }
        
        return throwError(() => err);
      })
    );
  }
}
