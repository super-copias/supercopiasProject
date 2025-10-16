import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-credenciales-modal',
  template: `
    <!-- Modal -->
    <div class="modal" [class.show]="visible" [style.display]="visible ? 'block' : 'none'" 
         style="z-index: 1060;" *ngIf="visible">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-user-check me-2"></i>
              Empleado y Usuario Creados Exitosamente
            </h5>
          </div>
          <div class="modal-body">
            <div class="alert alert-info" role="alert">
              <i class="fas fa-info-circle me-2"></i>
              <strong>¡Importante!</strong> Guarda estas credenciales ya que la contraseña no se volverá a mostrar.
            </div>

            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="fas fa-user me-2"></i>
                  Datos del Empleado
                </h6>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-sm-4"><strong>Nombre:</strong></div>
                  <div class="col-sm-8">{{empleadoNombre}}</div>
                </div>
                <div class="row">
                  <div class="col-sm-4"><strong>Email:</strong></div>
                  <div class="col-sm-8">{{empleadoEmail}}</div>
                </div>
                <div class="row">
                  <div class="col-sm-4"><strong>Tipo de Acceso:</strong></div>
                  <div class="col-sm-8">
                    <span class="badge" [class]="getTipoPermisoBadgeClass(tipoPermiso)">
                      {{getTipoPermisoLabel(tipoPermiso)}}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                  <i class="fas fa-key me-2"></i>
                  Credenciales de Acceso al Sistema
                </h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label"><strong>Usuario:</strong></label>
                  <div class="input-group">
                    <input type="text" class="form-control" [value]="username" readonly>
                    <button class="btn btn-outline-secondary" type="button" 
                            (click)="copiarTexto(username)" title="Copiar usuario">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
                
                <div class="mb-3">
                  <label class="form-label"><strong>Contraseña Temporal:</strong></label>
                  <div class="input-group">
                    <input [type]="mostrarPassword ? 'text' : 'password'" 
                           class="form-control" [value]="password" readonly>
                    <button class="btn btn-outline-secondary" type="button" 
                            (click)="togglePassword()" title="Mostrar/Ocultar contraseña">
                      <i class="fas" [class.fa-eye]="!mostrarPassword" [class.fa-eye-slash]="mostrarPassword"></i>
                    </button>
                    <button class="btn btn-outline-secondary" type="button" 
                            (click)="copiarTexto(password)" title="Copiar contraseña">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>

                <div class="alert alert-warning" role="alert">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <strong>Nota:</strong> El empleado deberá cambiar esta contraseña en su primer acceso al sistema.
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success" (click)="cerrar()">
              <i class="fas fa-check me-1"></i>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div class="modal-backdrop fade" [class.show]="visible" *ngIf="visible" 
         style="z-index: 1055;" (click)="cerrar()"></div>
  `,
  styles: [`
    .modal {
      overflow-y: auto;
    }
    
    .card-header {
      border-bottom: 1px solid rgba(0,0,0,.125);
    }
    
    .input-group .form-control {
      font-family: 'Courier New', monospace;
      background-color: #f8f9fa;
    }
    
    .alert {
      margin-bottom: 1rem;
    }
    
    .row {
      margin-bottom: 0.5rem;
    }
    
    .badge {
      font-size: 0.9em;
    }
  `]
})
export class CredencialesModalComponent {
  @Input() visible = false;
  @Input() empleadoNombre = '';
  @Input() empleadoEmail = '';
  @Input() username = '';
  @Input() password = '';
  @Input() tipoPermiso = '';
  
  @Output() cerrarModal = new EventEmitter<void>();
  
  mostrarPassword = false;

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  copiarTexto(texto: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => {
        // Podrías mostrar un toast o mensaje de confirmación aquí
      }).catch(err => {
        this.copiarTextoFallback(texto);
      });
    } else {
      this.copiarTextoFallback(texto);
    }
  }

  private copiarTextoFallback(texto: string) {
    // Método fallback para navegadores que no soportan clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
    }
    document.body.removeChild(textArea);
  }

  getTipoPermisoLabel(tipo: string): string {
    switch (tipo) {
      case 'administrador':
        return 'Administrador';
      case 'personalizado':
        return 'Personalizado';
      case 'sin_permisos':
        return 'Sin Permisos';
      default:
        return 'No definido';
    }
  }

  getTipoPermisoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'administrador':
        return 'bg-danger';
      case 'personalizado':
        return 'bg-primary';
      case 'sin_permisos':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  cerrar() {
    this.visible = false;
    this.cerrarModal.emit();
  }
}