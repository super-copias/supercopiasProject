import { Injectable } from '@angular/core';
import { CanActivate, CanLoad, CanActivateChild, Route, UrlSegment, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanLoad, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.auth.isLoggedIn()) return true;
    return this.router.parseUrl('/login');
  }

  canLoad(route: Route, segments: UrlSegment[]): boolean | Observable<boolean> | Promise<boolean> {
    if (this.auth.isLoggedIn()) return true;
    // Redirect to login
    this.router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.auth.isLoggedIn()) return true;
    return this.router.parseUrl('/login');
  }
}
