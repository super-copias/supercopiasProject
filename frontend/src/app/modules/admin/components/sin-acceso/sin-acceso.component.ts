import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-sin-acceso',
  template: `
    <div class="sin-acceso-container">
      <div class="sin-acceso-content">
        <div class="icon-container">
          <i class="fas fa-lock fa-3x text-warning"></i>
        </div>
        
        <h2 class="mb-3">Acceso Restringido</h2>
        
        <div class="alert alert-warning" role="alert">
          <h5 class="alert-heading">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Sin Permisos de Acceso
          </h5>
          <p class="mb-0">
            Tu cuenta de empleado no tiene permisos asignados para acceder a los módulos del sistema.
          </p>
        </div>
        
        <div class="info-card">
          <h6><i class="fas fa-info-circle me-2"></i>Información de tu cuenta:</h6>
          <ul class="list-unstyled">
            <li><strong>Usuario:</strong> {{ currentUser?.nombre }}</li>
            <li><strong>Email:</strong> {{ currentUser?.email }}</li>
            <li><strong>Tipo de Acceso:</strong> 
              <span class="badge bg-secondary">Sin Permisos</span>
            </li>
          </ul>
        </div>
        
        <div class="mt-4">
          <p class="text-muted">
            <i class="fas fa-lightbulb me-2"></i>
            Para obtener acceso a los módulos del sistema, contacta a tu administrador o supervisor.
          </p>
        </div>
        
        <div class="actions mt-4">
          <button type="button" class="btn btn-primary me-2" (click)="irAPerfil()">
            <i class="fas fa-user me-2"></i>Ver Mi Perfil
          </button>
          <button type="button" class="btn btn-outline-secondary" (click)="cerrarSesion()">
            <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sin-acceso-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
    }
    
    .sin-acceso-content {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    
    .icon-container {
      margin-bottom: 2rem;
    }
    
    .info-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
      text-align: left;
    }
    
    .info-card h6 {
      color: #495057;
      margin-bottom: 1rem;
    }
    
    .info-card ul li {
      margin-bottom: 0.5rem;
      color: #6c757d;
    }
    
    .actions .btn {
      min-width: 140px;
    }
    
    @media (max-width: 576px) {
      .sin-acceso-content {
        padding: 2rem 1.5rem;
      }
      
      .actions .btn {
        width: 100%;
        margin-bottom: 0.5rem;
      }
    }
  `]
})
export class SinAccesoComponent implements OnInit {
  currentUser: any = null;

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
  }

  irAPerfil() {
    // Redirigir al perfil si está disponible
    window.location.href = '/admin/profile';
  }

  cerrarSesion() {
    this.auth.logout();
  }
}