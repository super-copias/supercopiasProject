import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../services/profile.service';

/**
 * Componente para mostrar el perfil del usuario
 * Muestra datos personales, rol, permisos y información de la cuenta
 */
@Component({
  selector: 'app-profile-view',
  template: `
    <div class="container-fluid p-4">
      <div class="row">
        <div class="col-12">
          <!-- Header con título y botones -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="mb-0">
              <i class="fas fa-user-circle me-2 text-primary"></i>
              Mi Perfil
            </h2>
            <div>
              <button class="btn btn-secondary" (click)="backToDashboard()">
                <i class="fas fa-arrow-left me-1"></i>
                Regresar al Dashboard
              </button>
            </div>
          </div>

          <div class="row">
            <!-- Información Personal -->
            <div class="col-lg-8">
              <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0">
                    <i class="fas fa-user me-2"></i>
                    Información Personal
                  </h5>
                </div>
                <div class="card-body">
                  <div *ngIf="loading" class="text-center p-4">
                    <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                    <p class="mt-2 text-muted">Cargando perfil...</p>
                  </div>
                  
                  <div *ngIf="!loading && profile" class="row">
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">ID de Usuario</label>
                        <p class="form-control-plaintext">{{profile.id}}</p>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">Nombre de Usuario</label>
                        <p class="form-control-plaintext">{{profile.username}}</p>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">Correo Electrónico</label>
                        <p class="form-control-plaintext">{{profile.email || 'No especificado'}}</p>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">Nombre Completo</label>
                        <p class="form-control-plaintext">{{profile.fullName || profile.full_name || profile.nombre || 'No especificado'}}</p>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">Teléfono</label>
                        <p class="form-control-plaintext">{{profile.phone || 'No especificado'}}</p>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-bold text-muted">Fecha de Registro</label>
                        <p class="form-control-plaintext">{{(profile.fecha_registro || profile.createdAt) | date:'dd/MM/yyyy HH:mm'}}</p>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="!loading && !profile" class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No se pudo cargar la información del perfil.
                  </div>
                </div>
              </div>
            </div>

            <!-- Información de Seguridad y Rol -->
            <div class="col-lg-4">
              <div class="card shadow-sm">
                <div class="card-header bg-info text-white">
                  <h6 class="mb-0">
                    <i class="fas fa-shield-alt me-2"></i>
                    Seguridad y Permisos
                  </h6>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label fw-bold text-muted">Rol del Usuario</label>
                    <div>
                      <span class="badge bg-success fs-6">
                        <i class="fas fa-crown me-1"></i>
                        {{getRoleDisplay(profile?.role)}}
                      </span>
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label fw-bold text-muted">Estado de la Cuenta</label>
                    <div>
                      <span class="badge bg-success">
                        <i class="fas fa-check-circle me-1"></i>
                        Activa
                      </span>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label fw-bold text-muted">Permisos</label>
                    <ul class="list-unstyled small">
                      <li *ngFor="let permission of getPermissions(profile?.role)" class="mb-1">
                        <i class="fas fa-check text-success me-2"></i>
                        {{permission}}
                      </li>
                    </ul>
                  </div>

                  <div class="mb-3">
                    <label class="form-label fw-bold text-muted">Último Acceso</label>
                    <p class="form-control-plaintext small">{{(profile.lastLogin || profile.ultimo_acceso) | date:'dd/MM/yyyy HH:mm'}}</p>
                  </div>
                </div>
              </div>

              <!-- Acciones de Seguridad -->
              <div class="card shadow-sm mt-3">
                <div class="card-header bg-warning text-dark">
                  <h6 class="mb-0">
                    <i class="fas fa-tools me-2"></i>
                    Acciones de Cuenta
                  </h6>
                </div>
                <div class="card-body">
                  <div class="d-grid gap-2">
                    <button class="btn btn-outline-warning btn-sm" (click)="changePassword()">
                      <i class="fas fa-key me-2"></i>
                      Cambiar Contraseña
                    </button>
                    <button class="btn btn-outline-primary btn-sm" (click)="editProfile()">
                      <i class="fas fa-user-edit me-2"></i>
                      Editar Información
                    </button>
                    <button class="btn btn-outline-danger btn-sm" (click)="logout()">
                      <i class="fas fa-sign-out-alt me-2"></i>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 12px;
    }
    
    .card-header {
      border-radius: 12px 12px 0 0 !important;
      border: none;
    }
    
    .form-control-plaintext {
      padding-left: 0;
      margin-bottom: 0;
      font-weight: 500;
    }
    
    .badge {
      font-size: 0.875rem;
    }
    
    .list-unstyled li {
      padding: 2px 0;
    }
    
    @media (max-width: 768px) {
      .btn-group {
        flex-direction: column;
        width: 100%;
      }
      
      .btn-group .btn {
        margin-bottom: 5px;
      }
    }
  `]
})
export class ProfileViewComponent implements OnInit {
  profile: any = null;
  loading = true;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  /**
   * Cargar el perfil del usuario actual
   */
  loadProfile() {
    this.loading = true;
    
    // Primero intentar obtener del usuario actual en el AuthService
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.profile = currentUser;
      this.loading = false;
    }

    // Luego intentar cargar datos completos del backend
    this.profileService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profile = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        // Si falla, usar los datos del usuario actual
        if (currentUser) {
          this.profile = currentUser;
        }
        this.loading = false;
      }
    });
  }

  /**
   * Navegar de regreso al dashboard
   */
  backToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  /**
   * Navegar a la página de edición de perfil
   */
  editProfile() {
    this.router.navigate(['/admin/profile/edit']);
  }

  /**
   * Navegar a la página de cambio de contraseña
   */
  changePassword() {
    this.router.navigate(['/admin/profile/change-password']);
  }

  /**
   * Cerrar sesión del usuario
   */
  logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout();
    }
  }

  /**
   * Obtener el nombre del rol para mostrar
   */
  getRoleDisplay(role: string): string {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'user': return 'Usuario';
      case 'employee': return 'Empleado';
      default: return 'Usuario';
    }
  }

  /**
   * Obtener la lista de permisos según el rol
   */
  getPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return [
          'Acceso total al sistema',
          'Gestión de usuarios',
          'Gestión de empleados',
          'Gestión de clientes',
          'Configuración del sistema',
          'Acceso a reportes',
          'Gestión de inventarios'
        ];
      case 'employee':
        return [
          'Gestión de clientes',
          'Acceso a punto de venta',
          'Consulta de inventarios',
          'Reportes básicos'
        ];
      default:
        return [
          'Acceso básico al sistema',
          'Consulta de información'
        ];
    }
  }
}