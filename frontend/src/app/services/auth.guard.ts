import { Injectable } from '@angular/core';
import { CanActivate, CanLoad, CanActivateChild, Route, UrlSegment, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanLoad, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth(state.url);
  }

  canLoad(route: Route, segments: UrlSegment[]): Observable<boolean> | boolean {
    const authCheck = this.checkAuth('/' + (route.path || ''));
    if (typeof authCheck === 'boolean') {
      return authCheck;
    }
    if (authCheck instanceof UrlTree) {
      this.router.navigateByUrl(authCheck);
      return false;
    }
    return authCheck.pipe(
      map(result => {
        if (result instanceof UrlTree) {
          this.router.navigateByUrl(result);
          return false;
        }
        return result;
      })
    );
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth(state.url);
  }

  private checkAuth(currentUrl = ''): Observable<boolean | UrlTree> | boolean | UrlTree {
    // Primera verificación rápida del localStorage
    if (!this.auth.isLoggedIn()) {
      return this.router.parseUrl('/login');
    }

    // Si hay token, verificar con el servidor
    return this.auth.verifyToken().pipe(
      map(response => {
        if (response.success && response.data?.valid) {
          // Si el usuario debe cambiar contraseña y no está ya en esa ruta, redirigir
          if (response.data.usuario?.mustResetPassword && currentUrl !== '/cambiar-password') {
            return this.router.parseUrl('/cambiar-password');
          }
          return true;
        } else {
          return this.router.parseUrl('/login');
        }
      }),
      catchError(error => {
        return of(this.router.parseUrl('/login'));
      })
    );
  }
}
