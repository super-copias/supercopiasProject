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
    const cloned = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // If unauthorized, clear storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Use replaceState to avoid back navigation to protected pages
          this.router.navigate(['/login'], { replaceUrl: true });
        }
        return throwError(() => err);
      })
    );
  }
}
