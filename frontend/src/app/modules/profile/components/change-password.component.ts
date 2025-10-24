import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { NotificationService } from '../../../services/notification.service';
import { CambiarPassword } from '../../../shared/interfaces';

/**
 * Componente para cambiar la contraseña del usuario
 * Incluye validaciones de seguridad y confirmación
 */
@Component({
  selector: 'app-change-password',
  template: `
    <div class="container-fluid p-4">
      <div class="row justify-content-center">
        <div class="col-xl-6 col-lg-8">
          <!-- Header -->
          <div class="mb-4">
            <h2 class="mb-0">
              <i class="fas fa-key me-2 text-warning"></i>
              Cambiar Contraseña
            </h2>
          </div>

          <div class="card shadow-sm">
            <div class="card-header bg-warning text-dark">
              <h5 class="mb-0">
                <i class="fas fa-shield-alt me-2"></i>
                Seguridad de la Cuenta
              </h5>
            </div>
            <div class="card-body">
              <!-- Información de seguridad -->
              <div class="alert alert-info">
                <h6 class="alert-heading">
                  <i class="fas fa-info-circle me-2"></i>
                  Requisitos de Contraseña
                </h6>
                <ul class="mb-0 small">
                  <li>Mínimo 8 caracteres</li>
                  <li>Al menos una letra mayúscula</li>
                  <li>Al menos una letra minúscula</li>
                  <li>Al menos un número</li>
                  <li>Al menos un carácter especial (!@#$%^&*)</li>
                </ul>
              </div>

              <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
                <!-- Mensajes -->
                <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible fade show">
                  <i class="fas fa-exclamation-circle me-2"></i>
                  {{errorMessage}}
                  <button type="button" class="btn-close" (click)="errorMessage = ''"></button>
                </div>

                <!-- Contraseña actual -->
                <div class="mb-4">
                  <label class="form-label fw-bold">Contraseña Actual *</label>
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-lock"></i>
                    </span>
                    <input 
                      [type]="showCurrentPassword ? 'text' : 'password'" 
                      class="form-control" 
                      formControlName="currentPassword"
                      placeholder="Tu contraseña actual"
                      [class.is-invalid]="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched">
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      (click)="showCurrentPassword = !showCurrentPassword">
                      <i [class]="showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                    </button>
                  </div>
                  <div *ngIf="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched" class="invalid-feedback d-block">
                    La contraseña actual es requerida
                  </div>
                </div>

                <!-- Nueva contraseña -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Nueva Contraseña *</label>
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-key"></i>
                    </span>
                    <input 
                      [type]="showNewPassword ? 'text' : 'password'" 
                      class="form-control" 
                      formControlName="newPassword"
                      placeholder="Tu nueva contraseña"
                      [class.is-invalid]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched">
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      (click)="showNewPassword = !showNewPassword">
                      <i [class]="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                    </button>
                  </div>
                  
                  <!-- Indicador de fortaleza -->
                  <div *ngIf="passwordForm.get('newPassword')?.value" class="mt-2">
                    <div class="progress" style="height: 8px;">
                      <div 
                        class="progress-bar" 
                        [class]="getPasswordStrengthClass()"
                        [style.width.%]="getPasswordStrength()"
                        role="progressbar">
                      </div>
                    </div>
                    <small [class]="getPasswordStrengthTextClass()">
                      {{getPasswordStrengthText()}}
                    </small>
                  </div>
                  
                  <div *ngIf="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched" class="invalid-feedback d-block">
                    <div *ngFor="let error of getPasswordErrors()">
                      <i class="fas fa-times text-danger me-1"></i>{{error}}
                    </div>
                  </div>
                </div>

                <!-- Confirmar contraseña -->
                <div class="mb-4">
                  <label class="form-label fw-bold">Confirmar Nueva Contraseña *</label>
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-check-double"></i>
                    </span>
                    <input 
                      [type]="showConfirmPassword ? 'text' : 'password'" 
                      class="form-control" 
                      formControlName="confirmPassword"
                      placeholder="Confirma tu nueva contraseña"
                      [class.is-invalid]="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched">
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      (click)="showConfirmPassword = !showConfirmPassword">
                      <i [class]="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                    </button>
                  </div>
                  <div *ngIf="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched" class="invalid-feedback d-block">
                    Las contraseñas no coinciden
                  </div>
                </div>

                <!-- Botones -->
                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                    <i class="fas fa-arrow-left me-1"></i>
                    Regresar al Dashboard
                  </button>
                  <button type="submit" class="btn btn-warning" [disabled]="!passwordForm.valid || changing">
                    <span *ngIf="changing">
                      <i class="fas fa-spinner fa-spin me-1"></i>
                      Cambiando...
                    </span>
                    <span *ngIf="!changing">
                      <i class="fas fa-key me-1"></i>
                      Cambiar Contraseña
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Consejos de seguridad -->
          <div class="card shadow-sm mt-4">
            <div class="card-header bg-light">
              <h6 class="mb-0">
                <i class="fas fa-lightbulb me-2 text-warning"></i>
                Consejos de Seguridad
              </h6>
            </div>
            <div class="card-body">
              <ul class="list-unstyled mb-0 small">
                <li class="mb-2">
                  <i class="fas fa-check text-success me-2"></i>
                  Usa una contraseña única que no utilices en otros sitios
                </li>
                <li class="mb-2">
                  <i class="fas fa-check text-success me-2"></i>
                  Cambia tu contraseña regularmente (cada 3-6 meses)
                </li>
                <li class="mb-2">
                  <i class="fas fa-check text-success me-2"></i>
                  No compartas tu contraseña con nadie
                </li>
                <li class="mb-0">
                  <i class="fas fa-check text-success me-2"></i>
                  Cierra sesión cuando uses computadoras compartidas
                </li>
              </ul>
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
    
    .input-group-text {
      background-color: #f8f9fa;
      border-right: none;
    }
    
    .form-control {
      border-left: none;
    }
    
    .form-control:focus {
      border-left: none;
      box-shadow: none;
    }
    
    .progress {
      border-radius: 4px;
    }
    
    .progress-bar {
      transition: all 0.3s ease;
    }
    
    .text-weak { color: #dc3545; }
    .text-fair { color: #fd7e14; }
    .text-good { color: #ffc107; }
    .text-strong { color: #28a745; }
    
    .bg-weak { background-color: #dc3545; }
    .bg-fair { background-color: #fd7e14; }
    .bg-good { background-color: #ffc107; }
    .bg-strong { background-color: #28a745; }
  `]
})
export class ChangePasswordComponent implements OnInit {
  passwordForm: FormGroup;
  changing = false;
  errorMessage = '';
  
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {}

  /**
   * Validador personalizado para contraseñas seguras
   */
  passwordValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValidLength = password.length >= 8;

    const isValid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isValidLength;
    
    return isValid ? null : { 'weakPassword': true };
  }

  /**
   * Validador para confirmar que las contraseñas coinciden
   */
  passwordMatchValidator(group: AbstractControl): {[key: string]: any} | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    return newPassword === confirmPassword ? null : { 'passwordMismatch': true };
  }

  /**
   * Obtener errores específicos de la contraseña
   */
  getPasswordErrors(): string[] {
    const password = this.passwordForm.get('newPassword')?.value || '';
    const errors: string[] = [];

    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/\d/.test(password)) errors.push('Al menos un número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Al menos un carácter especial');

    return errors;
  }

  /**
   * Calcular fortaleza de la contraseña (0-100)
   */
  getPasswordStrength(): number {
    const password = this.passwordForm.get('newPassword')?.value || '';
    let strength = 0;

    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20;

    return strength;
  }

  /**
   * Obtener clase CSS para la barra de fortaleza
   */
  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 40) return 'bg-weak';
    if (strength <= 60) return 'bg-fair';
    if (strength <= 80) return 'bg-good';
    return 'bg-strong';
  }

  /**
   * Obtener texto de fortaleza
   */
  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 40) return 'Contraseña débil';
    if (strength <= 60) return 'Contraseña regular';
    if (strength <= 80) return 'Contraseña buena';
    return 'Contraseña fuerte';
  }

  /**
   * Obtener clase CSS para el texto de fortaleza
   */
  getPasswordStrengthTextClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 40) return 'text-weak';
    if (strength <= 60) return 'text-fair';
    if (strength <= 80) return 'text-good';
    return 'text-strong';
  }

  /**
   * Enviar formulario de cambio de contraseña
   */
  onSubmit() {
    if (!this.passwordForm.valid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changing = true;
    this.errorMessage = '';

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    
    this.profileService.changePassword({ currentPassword, newPassword, confirmPassword }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(response.message || 'Contraseña cambiada correctamente. Serás redirigido al dashboard.');
          this.changing = false;
          this.passwordForm.reset();
          
          // Redirigir al dashboard después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 3000);
        }
      },
      error: (httpError) => {
        console.error('Error HTTP completo:', httpError);
        this.changing = false;
        
        // El backend devuelve: { success: false, error: { code, message } }
        // Angular HttpClient lo envuelve en httpError.error
        
        let errorMessage = 'Error al cambiar la contraseña.';
        
        try {
          if (httpError.error && typeof httpError.error === 'object') {
            const backendResponse = httpError.error;
            
            // Si es una respuesta estándar de la API
            if (backendResponse.success === false && backendResponse.error?.message) {
              errorMessage = backendResponse.error.message;
            } 
            // Si es una respuesta directa con mensaje
            else if (backendResponse.message) {
              errorMessage = backendResponse.message;
            }
          }
          // Si no hay estructura específica, usar mensaje HTTP genérico
          else if (httpError.message) {
            errorMessage = httpError.message;
          }
        } catch (e) {
          console.error('Error parseando respuesta:', e);
        }
        
        this.errorMessage = errorMessage;
      }
    });
  }

  /**
   * Volver al dashboard
   */
  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }
}