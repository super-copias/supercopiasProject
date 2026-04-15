/**
 * Servicio de Autenticación - SuperCopias
 * Gestiona el login, logout y estado de autenticación con respuestas estándar API
 * Incluye manejo de tokens JWT y navegación automática
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { 
  ApiResponse, 
  Usuario, 
  LoginRequest, 
  LoginResponse 
} from '../shared/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<Usuario | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  
  // Cache para la verificación del token
  private verifyTokenCache$: Observable<ApiResponse<{ valid: boolean; usuario: Usuario }>> | null = null;
  private lastVerifyTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 segundos de caché
  
  // Observables públicos para que los componentes puedan suscribirse
  user$ = this.userSubject.asObservable();
  token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.init();
  }

  /**
   * Inicializar el servicio
   * Recupera el usuario y token del localStorage si existen y los valida
   */
  private init() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (user && token) {
      try {
        const parsedUser = JSON.parse(user);
        this.userSubject.next(parsedUser);
        this.tokenSubject.next(token);
        
        // Verificar token automáticamente en segundo plano
        this.verifyToken().subscribe({
          next: (response) => {
            // Token verificado exitosamente
          },
          error: (error) => {
            // Token inválido o expirado, limpiando sesión
            this.clearSession();
          }
        });
      } catch (error) {
        this.clearSession();
      }
    }
  }

  /**
   * Autenticar usuario con respuesta estándar
   * Endpoint: POST /api/auth/login
   * 
   * @param identifier - Username o email del usuario
   * @param password - Contraseña del usuario
   * @returns Observable con respuesta estándar API
   */
  login(identifier: string, password: string): Observable<ApiResponse<LoginResponse>> {
    const loginData = { identifier, password };
    
    return this.http.post<ApiResponse<LoginResponse>>(`${this.base}/login`, loginData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.handleLoginSuccess(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Verificar token actual con caché
   * Endpoint: GET /api/auth/verify
   * 
   * Implementa un sistema de caché para evitar múltiples llamadas HTTP
   * cuando varios guards verifican el token en la misma navegación
   * 
   * @param forceRefresh - Forzar nueva petición HTTP ignorando el caché
   * @returns Observable con respuesta de verificación
   */
  verifyToken(forceRefresh = false): Observable<ApiResponse<{ valid: boolean; usuario: Usuario }>> {
    const now = Date.now();
    
    // Si hay caché válido y no se fuerza el refresh, retornar el caché
    if (!forceRefresh && this.verifyTokenCache$ && (now - this.lastVerifyTime < this.CACHE_DURATION)) {
      return this.verifyTokenCache$;
    }
    
    // Crear nueva petición y cachearla
    this.lastVerifyTime = now;
    this.verifyTokenCache$ = this.http.get<ApiResponse<{ valid: boolean; usuario: Usuario }>>(`${this.base}/verify`)
      .pipe(
        tap(response => {
          if (response.success && response.data?.valid) {
            this.userSubject.next(response.data.usuario);
            localStorage.setItem('user', JSON.stringify(response.data.usuario));
          } else {
            this.clearSession();
          }
        }),
        shareReplay({ bufferSize: 1, refCount: true }), // Compartir resultado entre suscriptores
        catchError(error => {
          this.clearSession();
          this.verifyTokenCache$ = null; // Limpiar caché en caso de error
          return this.handleError(error);
        })
      );
    
    return this.verifyTokenCache$;
  }

  /**
   * Manejar respuesta exitosa de login
   * 
   * @param data - Datos de respuesta del login
   */
  private handleLoginSuccess(data: LoginResponse): void {
    // Guardar token y usuario
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    
    // Actualizar subjects
    this.tokenSubject.next(data.token);
    this.userSubject.next(data.usuario);
  }

  /**
   * Cerrar sesión del usuario (logout manual)
   * Notifica al backend y limpia el estado local.
   */
  logout(): void {
    this.notifyBackendLogout();
    this.clearSession();
    this.navigateToLogin();
  }

  /**
   * Cerrar sesión por inactividad (15 minutos sin actividad)
   */
  logoutByInactivity(): void {
    this.notifyBackendLogout();
    this.clearSession();
    try {
      this.router.navigate(['/login'], { replaceUrl: true, queryParams: { sessionExpired: 'inactivity' } });
    } catch (e) {
      window.location.href = '/login?sessionExpired=inactivity';
    }
  }

  /**
   * Cerrar sesión porque fue desplazada por un nuevo login del mismo usuario
   */
  logoutByDisplaced(): void {
    this.notifyBackendLogout();
    this.clearSession();
    try {
      this.router.navigate(['/login'], { replaceUrl: true, queryParams: { sessionExpired: 'displaced' } });
    } catch (e) {
      window.location.href = '/login?sessionExpired=displaced';
    }
  }

  /**
   * Enviar heartbeat de actividad al backend.
   * Llamado por InactivityService con throttle de 2 minutos.
   */
  activityHeartbeat(): Observable<any> {
    return this.http.post(`${this.base}/activity`, {}).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Notificar al backend el cierre de sesión (fire & forget).
   */
  private notifyBackendLogout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post(`${this.base}/logout`, {}).subscribe({ error: () => {} });
    }
  }

  /**
   * Limpiar sesión local
   */
  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.tokenSubject.next(null);
    this.verifyTokenCache$ = null; // Limpiar caché al cerrar sesión
  }

  /**
   * Navegar al login de forma segura
   */
  private navigateToLogin(): void {
    try {
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (e) {
      // Fallback si el router falla
      try { 
        window.history.replaceState({}, document.title, '/login'); 
      } catch(e) {
      }
      window.location.href = '/login';
    }
  }

  /**
   * Verificar si el usuario está autenticado
   * Verifica tanto la existencia del token como su validez
   * 
   * @returns true si existe un token válido en localStorage
   */
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return false;
    }
    
    try {
      // Verificar que el usuario es válido JSON
      JSON.parse(user);
      return true;
    } catch (error) {
      this.clearSession();
      return false;
    }
  }

  /**
   * Obtener el usuario actual del BehaviorSubject
   * 
   * @returns Datos del usuario actual o null
   */
  getCurrentUser(): Usuario | null {
    return this.userSubject.value;
  }

  /**
   * Obtener el token actual
   * 
   * @returns Token JWT actual o null
   */
  getCurrentToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('token');
  }

  /**
   * Actualizar los datos del usuario en el estado
   * 
   * @param user - Nuevos datos del usuario
   */
  updateUser(user: Usuario): void {
    this.userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Verificar si el usuario tiene un rol específico
   * 
   * @param roles - Rol o array de roles requeridos
   * @returns true si el usuario tiene alguno de los roles
   */
  hasRole(roles: string | string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.role);
  }

  /**
   * Verificar si el usuario es admin
   * 
   * @returns true si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Cambiar contraseña en sesión activa (reseteo forzado por admin)
   * Endpoint: PUT /api/auth/change-password
   */
  changePassword(nuevaPassword: string): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/change-password`, { nuevaPassword })
      .pipe(catchError(this.handleError));
  }

  /**
   * Manejo estándar de errores HTTP
   * 
   * @param error - Error HTTP recibido
   * @returns Observable con error formateado
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    
    // Si el servidor devuelve una respuesta de error estándar
    if (error.error && typeof error.error === 'object' && error.error.success === false) {
      return throwError(() => error.error);
    }
    
    // Error de red o servidor no alcanzable
    if (error.status === 0) {
      return throwError(() => ({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Error de conexión. Verifique su conexión a internet.'
        },
        timestamp: new Date().toISOString()
      }));
    }
    
    // Error genérico
    return throwError(() => ({
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Error desconocido'
      },
      timestamp: new Date().toISOString()
    }));
  }
}