/**
 * Servicio de Autenticación
 * Gestiona el login, logout y estado de autenticación del usuario
 * Incluye manejo de tokens JWT y navegación automática
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/auth';
  private userSubject = new BehaviorSubject<any>(null);
  
  // Observable público para que los componentes puedan suscribirse al estado del usuario
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.init();
  }

  /**
   * Inicializar el servicio
   * Recupera el usuario del localStorage si existe
   */
  private init() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  /**
   * Autenticar usuario
   * Endpoint: POST /api/auth/login
   * 
   * @param identifier - Username o email del usuario
   * @param password - Contraseña del usuario
   * @returns Observable con token y datos del usuario
   */
  login(identifier: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/login`, { identifier, password });
  }

  /**
   * Cerrar sesión del usuario
   * Limpia localStorage, actualiza estado y redirige al login
   */
  logout() {
    // Limpiar datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    
    // Navegar al login reemplazando la entrada del historial
    // para que el botón atrás no regrese a rutas protegidas
    try {
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (e) {
      // Fallback si el router falla
      try { 
        window.history.replaceState({}, document.title, '/login'); 
      } catch(e) {}
      window.location.href = '/login';
    }
  }

  /**
   * Verificar si el usuario está autenticado
   * 
   * @returns true si existe un token válido en localStorage
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Obtener el usuario actual del BehaviorSubject
   * 
   * @returns Datos del usuario actual o null
   */
  getCurrentUser(): any {
    return this.userSubject.value;
  }

  /**
   * Actualizar los datos del usuario en el estado
   * 
   * @param user - Nuevos datos del usuario
   */
  updateUser(user: any): void {
    this.userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }
}
