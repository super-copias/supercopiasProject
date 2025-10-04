import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  base = '/api/auth';
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.init();
  }

  init() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  login(identifier: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/login`, { identifier, password });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    // navigate to login and replace history entry so back button won't return to protected routes
    try {
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (e) {
      try { window.history.replaceState({}, document.title, '/login'); } catch(e) {}
      window.location.href = '/login';
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
